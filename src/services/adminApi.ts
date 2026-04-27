import { supabase } from '../lib/supabase'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'unknown'

export interface AdminRegistrationRow {
  id: string
  created_at?: string
  race_type?: string | null
  event_title?: string | null
  registrant_email?: string | null
  status?: string | null
  payment_status?: PaymentStatus | string | null
  payment_order_status?: string | null
  payment_order_id?: string | null
  merchant_reference?: string | null
  paid_at?: string | null
  user_id?: string | null
}

export interface AdminRiderDetailRow {
  registration_id: string
  first_name?: string | null
  last_name?: string | null
  gender?: string | null
  birth_date?: string | null
  address?: string | null
  contact_number?: string | null
  emergency_contact_name?: string | null
  emergency_contact_number?: string | null
  team_name?: string | null
  discipline?: string | null
  age_category?: string | null
  jersey_size?: string | null
}

function normalizePaymentStatus(args: { orderStatus?: string | null; txStatus?: string | null }): PaymentStatus {
  const order = String(args.orderStatus ?? '').toLowerCase()
  const tx = String(args.txStatus ?? '').toLowerCase()
  const s = tx || order
  if (['paid', 'succeeded', 'success'].includes(s)) return 'paid'
  if (['pending', 'processing', 'created'].includes(s)) return 'pending'
  if (['failed', 'cancelled', 'canceled', 'expired'].includes(s)) return 'failed'
  if (['refunded'].includes(s)) return 'refunded'
  return 'unknown'
}

export const adminApi = {
  async registrationsList() {
    // 1) Base registrations: registration_forms + event race_type/title
    const { data: forms, error: formsError } = await supabase
      .from('registration_forms')
      .select('id, created_at, status, registrant_email, user_id, event:events(race_type, title)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (formsError) throw formsError
    const base = (forms ?? []) as Array<{
      id: string
      created_at?: string
      status?: string | null
      registrant_email?: string | null
      user_id?: string | null
      event?: { race_type?: string | null; title?: string | null } | null
    }>

    const registrationIds = base.map((f) => f.id)
    if (registrationIds.length === 0) {
      return [] as AdminRegistrationRow[]
    }

    // 2) Latest payment order per registration (paymongo)
    const { data: orders, error: ordersError } = await supabase
      .from('payment_orders')
      .select('id, registration_id, status, merchant_reference, updated_at, created_at')
      .in('registration_id', registrationIds)
      .order('created_at', { ascending: false })

    if (ordersError) throw ordersError
    const latestOrderByReg = new Map<string, (typeof orders)[number]>()
    for (const o of orders ?? []) {
      if (!latestOrderByReg.has(o.registration_id)) latestOrderByReg.set(o.registration_id, o)
    }

    // 3) Latest transaction per latest payment order
    const orderIds = Array.from(latestOrderByReg.values()).map((o) => o.id)
    let latestTxByOrder = new Map<string, { status?: string | null; paid_at?: string | null }>()
    if (orderIds.length > 0) {
      const { data: txs, error: txsError } = await supabase
        .from('payment_transactions')
        .select('payment_order_id, status, paid_at, created_at')
        .in('payment_order_id', orderIds)
        .order('created_at', { ascending: false })

      if (txsError) throw txsError
      for (const t of txs ?? []) {
        if (!latestTxByOrder.has(t.payment_order_id)) {
          latestTxByOrder.set(t.payment_order_id, { status: t.status, paid_at: t.paid_at })
        }
      }
    }

    return base.map((f) => {
      const order = latestOrderByReg.get(f.id)
      const tx = order ? latestTxByOrder.get(order.id) : undefined
      const payment_status = normalizePaymentStatus({ orderStatus: order?.status, txStatus: tx?.status })
      return {
        id: f.id,
        created_at: f.created_at,
        race_type: f.event?.race_type ?? null,
        event_title: f.event?.title ?? null,
        registrant_email: f.registrant_email ?? null,
        status: f.status ?? null,
        payment_status,
        payment_order_status: order?.status ?? null,
        payment_order_id: order?.id ?? null,
        merchant_reference: order?.merchant_reference ?? null,
        paid_at: tx?.paid_at ?? null,
        user_id: f.user_id ?? null,
      } satisfies AdminRegistrationRow
    })
  },

  async registrationDetails(registrationId: string) {
    const { data: reg, error: regError } = await supabase
      .from('registration_forms')
      .select('id, created_at, status, registrant_email, user_id, event:events(race_type, title)')
      .eq('id', registrationId)
      .maybeSingle()

    if (regError) throw regError

    const { data: rider, error: riderError } = await supabase
      .from('registration_rider_details')
      .select(
        'registration_id, first_name, last_name, gender, birth_date, address, contact_number, emergency_contact_name, emergency_contact_number, team_name, discipline, age_category, jersey_size',
      )
      .eq('registration_id', registrationId)
      .maybeSingle()

    if (riderError) throw riderError

    const { data: order, error: orderError } = await supabase
      .from('payment_orders')
      .select('id, status, merchant_reference, amount, currency, created_at, updated_at')
      .eq('registration_id', registrationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (orderError) throw orderError

    const { data: tx, error: txError } = order
      ? await supabase
          .from('payment_transactions')
          .select('status, paid_at, paymongo_payment_id, paymongo_intent_id, paymongo_source_id, created_at')
          .eq('payment_order_id', order.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null, error: null }

    if (txError) throw txError

    const payment_status = normalizePaymentStatus({ orderStatus: order?.status ?? null, txStatus: tx?.status ?? null })
    const event = Array.isArray((reg as any)?.event) ? (reg as any).event?.[0] : (reg as any)?.event

    return {
      registration: (reg
        ? ({
            id: reg.id,
            created_at: reg.created_at,
            race_type: event?.race_type ?? null,
            event_title: event?.title ?? null,
            registrant_email: reg.registrant_email ?? null,
            status: reg.status ?? null,
            payment_status,
            payment_order_status: order?.status ?? null,
            payment_order_id: order?.id ?? null,
            merchant_reference: order?.merchant_reference ?? null,
            paid_at: tx?.paid_at ?? null,
            user_id: reg.user_id ?? null,
          } satisfies AdminRegistrationRow)
        : null),
      rider: rider as AdminRiderDetailRow | null,
      paymentOrder: order,
      paymentTransaction: tx,
    }
  },
}

