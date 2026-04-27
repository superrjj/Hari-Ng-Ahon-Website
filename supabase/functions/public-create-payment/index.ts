// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

type Body = {
  registrationId: string
  acceptLiability: boolean
  acceptRules: boolean
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let body: Body
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (!body.registrationId) {
    return new Response('Missing registrationId', { status: 400 })
  }

  if (!body.acceptLiability || !body.acceptRules) {
    return new Response('Agreements not accepted', { status: 400 })
  }

  const { data: registration, error: registrationError } = await supabase
    .from('registration_forms')
    .select('id, registration_fee, status')
    .eq('id', body.registrationId)
    .maybeSingle()

  if (registrationError) return new Response(registrationError.message, { status: 500 })
  if (!registration) return new Response('Registration not found', { status: 404 })
  if (!['draft', 'pending_payment', 'payment_processing'].includes(registration.status)) {
    return new Response('Registration is not payable in current status', { status: 400 })
  }

  const { error: agreementError } = await supabase
    .from('registration_agreements')
    .update({
      liability_waiver_accepted: true,
      race_rules_accepted: true,
      accepted_at: new Date().toISOString(),
    })
    .eq('registration_id', body.registrationId)

  if (agreementError) return new Response(agreementError.message, { status: 500 })

  // Reuse an in-flight order if one already exists for this registration.
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('payment_orders')
    .select('id, merchant_reference, status')
    .eq('registration_id', body.registrationId)
    .in('status', ['created', 'pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingOrderError) return new Response(existingOrderError.message, { status: 500 })
  if (existingOrder?.id) {
    return Response.json({
      paymentOrderId: existingOrder.id,
      merchantReference: existingOrder.merchant_reference,
      reused: true,
    })
  }

  const merchantReference = `HNA-${Date.now()}-${crypto.randomUUID()}`

  const { data: order, error: orderError } = await supabase
    .from('payment_orders')
    .insert({
      registration_id: body.registrationId,
      provider: 'paymongo',
      amount: Number(registration.registration_fee ?? 0),
      currency: 'PHP',
      status: 'created',
      merchant_reference: merchantReference,
      created_by: null,
    })
    .select('id, merchant_reference')
    .single()

  if (orderError) return new Response(orderError.message, { status: 500 })

  const { error: statusUpdateError } = await supabase
    .from('registration_forms')
    .update({ status: 'payment_processing', updated_at: new Date().toISOString() })
    .eq('id', body.registrationId)
    .in('status', ['draft', 'pending_payment', 'payment_processing'])

  if (statusUpdateError) return new Response(statusUpdateError.message, { status: 500 })

  return Response.json({ paymentOrderId: order.id, merchantReference: order.merchant_reference, reused: false })
})

