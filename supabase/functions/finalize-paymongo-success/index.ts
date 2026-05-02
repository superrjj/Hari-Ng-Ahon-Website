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

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}

function extractBibSequenceByPrefix(bibNumber: string, prefix: string) {
  const value = String(bibNumber ?? '').trim()
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = value.match(new RegExp(`^${escapedPrefix}(\\d+)$`))
  if (!match) return 0
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) ? n : 0
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  if (!authHeader) return jsonResponse({ code: 'UNAUTHORIZED_NO_AUTH_HEADER', message: 'Missing authorization header' }, 401)

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  const { data: authData, error: authError } = await supabase.auth.getUser(jwt)
  if (authError || !authData?.user?.id) {
    return jsonResponse({ code: 'UNAUTHORIZED_INVALID_TOKEN', message: 'Invalid or expired token' }, 401)
  }
  const userId = authData.user.id

  let body: { registrationId?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const registrationId = String(body.registrationId ?? '').trim()
  if (!registrationId) return jsonResponse({ error: 'Missing registrationId' }, 400)

  const { data: registration, error: regLookupError } = await supabase
    .from('registration_forms')
    .select('id, user_id, race_category_id, bib_number')
    .eq('id', registrationId)
    .maybeSingle()

  if (regLookupError) return jsonResponse({ error: regLookupError.message }, 500)
  if (!registration?.id) return jsonResponse({ error: 'Registration not found' }, 404)
  if (String(registration.user_id) !== userId) {
    return jsonResponse({ code: 'FORBIDDEN', message: 'Not your registration' }, 403)
  }

  const now = new Date().toISOString()

  const { data: order, error: orderLookupError } = await supabase
    .from('payment_orders')
    .select('id, status, amount, currency, provider_reference')
    .eq('registration_id', registrationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (orderLookupError) return jsonResponse({ error: orderLookupError.message }, 500)
  if (!order?.id) return jsonResponse({ error: 'Payment order not found for registration.' }, 404)

  if (String(order.status).toLowerCase() !== 'paid') {
    const { error: orderUpdateError } = await supabase
      .from('payment_orders')
      .update({
        status: 'paid',
        paid_at: now,
        updated_at: now,
      })
      .eq('id', order.id)
    if (orderUpdateError) return jsonResponse({ error: orderUpdateError.message }, 500)

    const { error: txInsertError } = await supabase.from('payment_transactions').insert({
      payment_order_id: order.id,
      status: 'paid',
      amount: Number(order.amount ?? 0),
      currency: String(order.currency ?? 'PHP'),
      paid_at: now,
      provider_event_type: 'checkout_success_redirect',
      provider_reference: order.provider_reference ?? null,
      raw_payload: {
        source: 'edge_finalize_paymongo_success',
        registration_id: registrationId,
      },
    })
    if (txInsertError) return jsonResponse({ error: txInsertError.message }, 500)
  }

  const { error: registrationUpdateError } = await supabase
    .from('registration_forms')
    .update({
      status: 'confirmed',
      confirmed_at: now,
      updated_at: now,
    })
    .eq('id', registrationId)
  if (registrationUpdateError) return jsonResponse({ error: registrationUpdateError.message }, 500)

  const { data: regAfterPay, error: regAfterError } = await supabase
    .from('registration_forms')
    .select('bib_number, race_category_id')
    .eq('id', registrationId)
    .maybeSingle()
  if (regAfterError) return jsonResponse({ error: regAfterError.message }, 500)

  let bibNumber = String(regAfterPay?.bib_number ?? '').trim()
  const raceCategoryId = regAfterPay?.race_category_id ?? registration.race_category_id

  if (!bibNumber) {
    if (!raceCategoryId) {
      return jsonResponse({ error: 'Missing race category for this registration.' }, 400)
    }

    const { data: raceCategory, error: raceCategoryError } = await supabase
      .from('race_categories')
      .select('code, category_name, rider_limit')
      .eq('id', raceCategoryId)
      .maybeSingle()
    if (raceCategoryError) return jsonResponse({ error: raceCategoryError.message }, 500)

    const categoryCode = String(raceCategory?.code ?? '').trim()
    if (!categoryCode) return jsonResponse({ error: 'Missing category code for this registration category.' }, 400)

    const { data: existingBibs, error: existingBibsError } = await supabase
      .from('registration_forms')
      .select('bib_number')
      .eq('race_category_id', raceCategoryId)
      .eq('status', 'confirmed')
      .not('bib_number', 'is', null)
      .order('created_at', { ascending: true })
      .limit(5000)
    if (existingBibsError) return jsonResponse({ error: existingBibsError.message }, 500)

    const maxSequence = (existingBibs ?? []).reduce((max, row) => {
      const seq = extractBibSequenceByPrefix(String(row.bib_number ?? ''), categoryCode)
      return seq > max ? seq : max
    }, 0)
    const nextSequence = maxSequence + 1
    const riderLimit = Number(raceCategory?.rider_limit ?? 0)
    if (Number.isFinite(riderLimit) && riderLimit > 0 && nextSequence > riderLimit) {
      return jsonResponse(
        {
          error: `Category limit reached for ${String(raceCategory?.category_name ?? categoryCode)}. Max riders: ${riderLimit}.`,
        },
        400,
      )
    }
    if (nextSequence > 99) {
      return jsonResponse({ error: `Category bib sequence exceeded 2 digits for category code ${categoryCode}.` }, 400)
    }

    bibNumber = `${categoryCode}${String(nextSequence).padStart(2, '0')}`

    const { error: bibUpdateError } = await supabase
      .from('registration_forms')
      .update({
        bib_number: bibNumber,
        updated_at: now,
      })
      .eq('id', registrationId)
    if (bibUpdateError) return jsonResponse({ error: bibUpdateError.message }, 500)
  }

  return jsonResponse({ ok: true, bib_number: bibNumber }, 200)
})
