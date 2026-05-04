// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { assignBibIfMissing, finalizeBundleSiblingsPaid } from '../_shared/registration-finale.ts'

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
    .select('id, user_id, race_category_id, bib_number, checkout_bundle_id')
    .eq('id', registrationId)
    .maybeSingle()

  if (regLookupError) return jsonResponse({ error: regLookupError.message }, 500)
  if (!registration?.id) return jsonResponse({ error: 'Registration not found' }, 404)
  // Own row directly, OR any bundle line when the PayMongo primary row for that bundle belongs to this user
  // (sibling rows sometimes have null / stale user_id and must still finalize).
  if (String(registration.user_id ?? '') !== userId) {
    const bid = String(registration.checkout_bundle_id ?? '').trim()
    if (!bid) {
      return jsonResponse({ code: 'FORBIDDEN', message: 'Not your registration' }, 403)
    }
    const { data: bundlePay, error: bpErr } = await supabase
      .from('payment_orders')
      .select('registration_id')
      .eq('checkout_bundle_id', bid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (bpErr) return jsonResponse({ error: bpErr.message }, 500)
    if (!bundlePay?.registration_id) {
      return jsonResponse({ code: 'FORBIDDEN', message: 'Not your registration' }, 403)
    }
    const { data: primaryRow, error: prErr } = await supabase
      .from('registration_forms')
      .select('user_id')
      .eq('id', bundlePay.registration_id)
      .maybeSingle()
    if (prErr) return jsonResponse({ error: prErr.message }, 500)
    if (String(primaryRow?.user_id ?? '') !== userId) {
      return jsonResponse({ code: 'FORBIDDEN', message: 'Not your registration' }, 403)
    }
  }

  const now = new Date().toISOString()

  let { data: order, error: orderLookupError } = await supabase
    .from('payment_orders')
    .select('id, status, amount, currency, provider_reference, registration_id, checkout_bundle_id')
    .eq('registration_id', registrationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (orderLookupError) return jsonResponse({ error: orderLookupError.message }, 500)

  // Bundle checkouts attach the PayMongo order to the primary row only; siblings share checkout_bundle_id.
  if (!order?.id && registration.checkout_bundle_id) {
    const bundle = String(registration.checkout_bundle_id).trim()
    const { data: bundleOrder, error: bundleOrderErr } = await supabase
      .from('payment_orders')
      .select('id, status, amount, currency, provider_reference, registration_id, checkout_bundle_id')
      .eq('checkout_bundle_id', bundle)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (bundleOrderErr) return jsonResponse({ error: bundleOrderErr.message }, 500)
    if (bundleOrder?.id) {
      const { data: orderOwner, error: ownerErr } = await supabase
        .from('registration_forms')
        .select('id, checkout_bundle_id')
        .eq('id', bundleOrder.registration_id)
        .maybeSingle()
      if (ownerErr) return jsonResponse({ error: ownerErr.message }, 500)
      const { data: reqInBundle } = await supabase
        .from('registration_forms')
        .select('id')
        .eq('id', registrationId)
        .eq('checkout_bundle_id', bundle)
        .maybeSingle()
      if (orderOwner?.id && reqInBundle?.id && String(orderOwner.checkout_bundle_id ?? '').trim() === bundle) {
        order = bundleOrder
      }
    }
  }

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

  let bibWarning: string | null = null
  try {
    await assignBibIfMissing(supabase, registrationId)
    await finalizeBundleSiblingsPaid(supabase, registrationId)
  } catch (e) {
    // Bib assignment is best-effort — payment is already confirmed, so we log
    // the error but do NOT return 500. The client can retry via "Refresh / assign bib".
    bibWarning = (e as Error).message
    console.error('[finalize-paymongo-success] bib assignment warning:', bibWarning)
  }

  const { data: bibRow } = await supabase.from('registration_forms').select('bib_number').eq('id', registrationId).maybeSingle()

  const bibNumber = String(bibRow?.bib_number ?? '').trim()
  return jsonResponse({ ok: true, bib_number: bibNumber, ...(bibWarning ? { bib_warning: bibWarning } : {}) }, 200)
})
