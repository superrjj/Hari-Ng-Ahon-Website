// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function textResponse(message: string, status: number) {
  return new Response(message, { status, headers: corsHeaders })
}

type Body = {
  registrationId: string
  acceptLiability: boolean
  acceptRules: boolean
}

async function createPayMongoCheckoutSession(args: {
  amount: number
  registrationId: string
  merchantReference: string
  email?: string | null
  origin?: string | null
}) {
  const appOrigin = args.origin?.startsWith('http') ? args.origin : 'http://localhost:5173'
  const auth = btoa(`${PAYMONGO_SECRET_KEY}:`)
  const payload = {
    data: {
      attributes: {
        billing: args.email ? { email: args.email } : undefined,
        send_email_receipt: Boolean(args.email),
        show_line_items: true,
        line_items: [
          {
            currency: 'PHP',
            amount: Math.round(Number(args.amount ?? 0) * 100),
            name: 'Hari ng Ahon Registration',
            description: `Registration payment for ${args.registrationId}`,
            quantity: 1,
          },
        ],
        payment_method_types: ['gcash', 'paymaya', 'card'],
        success_url: `${appOrigin}/register/payment?registrationId=${encodeURIComponent(args.registrationId)}&payment=success`,
        cancel_url: `${appOrigin}/register/payment?registrationId=${encodeURIComponent(args.registrationId)}&payment=cancelled`,
        metadata: {
          registration_id: args.registrationId,
          merchant_reference: args.merchantReference,
        },
      },
    },
  }

  const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Basic ${auth}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const json = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = json?.errors?.[0]?.detail ?? 'PayMongo checkout session creation failed'
    throw new Error(String(detail))
  }

  return {
    checkoutUrl: json?.data?.attributes?.checkout_url as string,
    checkoutSessionId: json?.data?.id as string,
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

  if (!body.registrationId) {
    return textResponse('Missing registrationId', 400)
  }

  if (!body.acceptLiability || !body.acceptRules) {
    return textResponse('Agreements not accepted', 400)
  }

  const { data: registration, error: registrationError } = await supabase
    .from('registration_forms')
    .select('id, registration_fee, status')
    .eq('id', body.registrationId)
    .maybeSingle()

  if (registrationError) return textResponse(registrationError.message, 500)
  if (!registration) return textResponse('Registration not found', 404)
  if (!['draft', 'pending_payment', 'payment_processing'].includes(registration.status)) {
    return textResponse('Registration is not payable in current status', 400)
  }

  const { error: agreementError } = await supabase
    .from('registration_agreements')
    .update({
      liability_waiver_accepted: true,
      race_rules_accepted: true,
      accepted_at: new Date().toISOString(),
    })
    .eq('registration_id', body.registrationId)

  if (agreementError) return textResponse(agreementError.message, 500)

  const { data: form, error: formError } = await supabase
    .from('registration_forms')
    .select('registrant_email')
    .eq('id', body.registrationId)
    .maybeSingle()
  if (formError) return textResponse(formError.message, 500)

  // Reuse an in-flight order if one already exists for this registration.
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('payment_orders')
    .select('id, merchant_reference, status')
    .eq('registration_id', body.registrationId)
    .in('status', ['created', 'pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existingOrderError) return textResponse(existingOrderError.message, 500)
  if (existingOrder?.id) {
    try {
      const checkout = await createPayMongoCheckoutSession({
        amount: Number(registration.registration_fee ?? 0),
        registrationId: body.registrationId,
        merchantReference: existingOrder.merchant_reference,
        email: form?.registrant_email ?? null,
        origin: req.headers.get('origin'),
      })
      return Response.json(
        {
          paymentOrderId: existingOrder.id,
          merchantReference: existingOrder.merchant_reference,
          checkoutUrl: checkout.checkoutUrl,
          checkoutSessionId: checkout.checkoutSessionId,
          reused: true,
        },
        { headers: corsHeaders }
      )
    } catch (e) {
      return textResponse((e as Error).message, 500)
    }
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

  if (orderError) return textResponse(orderError.message, 500)

  let checkout
  try {
    checkout = await createPayMongoCheckoutSession({
      amount: Number(registration.registration_fee ?? 0),
      registrationId: body.registrationId,
      merchantReference,
      email: form?.registrant_email ?? null,
      origin: req.headers.get('origin'),
    })
  } catch (e) {
    return textResponse((e as Error).message, 500)
  }

  const { error: statusUpdateError } = await supabase
    .from('registration_forms')
    .update({ status: 'payment_processing', updated_at: new Date().toISOString() })
    .eq('id', body.registrationId)
    .in('status', ['draft', 'pending_payment', 'payment_processing'])

  if (statusUpdateError) return textResponse(statusUpdateError.message, 500)

  return Response.json(
    {
      paymentOrderId: order.id,
      merchantReference: order.merchant_reference,
      checkoutUrl: checkout.checkoutUrl,
      checkoutSessionId: checkout.checkoutSessionId,
      reused: false,
    },
    { headers: corsHeaders }
  )
})

