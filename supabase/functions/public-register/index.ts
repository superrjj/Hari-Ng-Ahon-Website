// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

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
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const normalizedEmail = String(body.registrantEmail ?? '').trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return new Response('Invalid registrantEmail', { status: 400 })
  }

  if (!body.rider?.firstName || !body.rider?.lastName || !body.rider?.birthDate) {
    return new Response('Missing required fields', { status: 400 })
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, registration_fee')
    .eq('race_type', body.raceType)
    .eq('status', 'published')
    .order('event_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (eventError) return new Response(eventError.message, { status: 500 })
  if (!event?.id) return new Response(`No published event found for ${body.raceType}`, { status: 400 })

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

  if (formError) return new Response(formError.message, { status: 500 })

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

  if (detailsError) return new Response(detailsError.message, { status: 500 })

  const { error: agreementError } = await supabase.from('registration_agreements').insert({
    registration_id: form.id,
    liability_waiver_accepted: false,
    race_rules_accepted: false,
  })
  if (agreementError) return new Response(agreementError.message, { status: 500 })

  return Response.json({ registrationId: form.id })
})

