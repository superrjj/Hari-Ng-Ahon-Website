// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function textResponse(message: string, status: number) {
  return new Response(message, { status, headers: corsHeaders })
}

type Body = {
  raceType: 'criterium' | 'itt'
  registrantEmail: string
  rider: {
    firstName: string
    lastName: string
    gender: string
    birthDate: string
    birthYear?: number | null
    address: string
    contactNumber: string
    emergencyContactName: string
    emergencyContactNumber: string
    teamName?: string
    discipline?: string
    ageCategory?: string
    jerseySize?: string
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return textResponse('Method not allowed', 405)

  let body: Body
  try {
    body = await req.json()
  } catch {
    return textResponse('Invalid JSON', 400)
  }

  const normalizedEmail = String(body.registrantEmail ?? '').trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return textResponse('Invalid registrantEmail', 400)
  }

  if (!body.rider?.firstName || !body.rider?.lastName || !body.rider?.birthDate) {
    return textResponse('Missing required fields', 400)
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, registration_fee')
    .eq('race_type', body.raceType)
    .eq('status', 'published')
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (eventError) return textResponse(eventError.message, 500)

  if (!event?.id) return textResponse(`No published event found for ${body.raceType}`, 400)

  // Prevent duplicate-key failures on ux_registration_forms_email_event by reusing
  // an existing public registration for the same email + event.
  const { data: existingRegistration, error: existingRegistrationError } = await supabase
    .from('registration_forms')
    .select('id')
    .eq('event_id', event.id)
    .eq('registrant_email', normalizedEmail)
    .is('user_id', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingRegistrationError) return textResponse(existingRegistrationError.message, 500)
  if (existingRegistration?.id) {
    return Response.json({ registrationId: existingRegistration.id, reused: true }, { headers: corsHeaders })
  }

  const { data: form, error: formError } = await supabase
    .from('registration_forms')
    .insert({
      user_id: null,
      event_id: event.id,
      race_category_id: null,
      status: 'pending_payment',
      registration_fee: Number(event.registration_fee ?? 0),
      registrant_email: normalizedEmail,
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (formError) return textResponse(formError.message, 500)

  const { error: detailsError } = await supabase.from('registration_rider_details').insert({
    registration_id: form.id,
    first_name: body.rider.firstName,
    last_name: body.rider.lastName,
    gender: body.rider.gender,
    birth_date: body.rider.birthDate,
    birth_year: body.rider.birthYear ?? null,
    address: body.rider.address,
    contact_number: body.rider.contactNumber,
    emergency_contact_name: body.rider.emergencyContactName,
    emergency_contact_number: body.rider.emergencyContactNumber,
    team_name: body.rider.teamName ?? null,
    discipline: body.rider.discipline ?? null,
    age_category: body.rider.ageCategory ?? null,
    jersey_size: body.rider.jerseySize ?? null,
  })

  if (detailsError) return textResponse(detailsError.message, 500)

  const { error: agreementError } = await supabase.from('registration_agreements').insert({
    registration_id: form.id,
    liability_waiver_accepted: false,
    race_rules_accepted: false,
  })
  if (agreementError) return textResponse(agreementError.message, 500)

  return Response.json({ registrationId: form.id }, { headers: corsHeaders })
})

