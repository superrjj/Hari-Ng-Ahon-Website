import { supabase } from '../lib/supabase'

export type RegistrationEventKey = string
export type PendingPaymentDraft = {
  paymentOrderId: string
  registrationId: string
  amount: number
  currency: string
  status: string
  merchantReference: string
  createdAt: string | null
  eventTitle: string
  raceType: string
}
export type CheckoutItem = {
  registrationId: string
  eventTitle: string
  raceType: string
  amount: number
  currency: string
}

export type RegistrationCertificateData = {
  registrationId: string
  riderName: string
  category: string
  discipline: string
  bibNumber: string
  eventTitle: string
  registrantEmail: string
  qrValue: string
  paymentStatus: string
  isPaid: boolean
  paidAt: string | null
}

async function getEdgeFunctionErrorMessage(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: unknown } | null)?.context
  if (context && typeof context === 'object' && 'text' in context) {
    try {
      const text = await (context as { text: () => Promise<string> }).text()
      if (text?.trim()) return text
    } catch {
      // Ignore and fall back to other parsing
    }
  }

  const message = (error as { message?: string } | null)?.message
  return message?.trim() ? message : fallback
}

async function getAuthHeaders(): Promise<Record<string, string>>{
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const registrationService = {
  async createRegistration(args: {
    raceType: RegistrationEventKey
    eventId?: string
    registrantEmail: string
    registrationFee: number
    rider: {
      firstName: string
      lastName: string
      gender: string
      birthDate: string
      address: string
      contactNumber: string
      emergencyContactName: string
      emergencyContactNumber: string
      teamName?: string
      discipline?: string
      ageCategory?: string
      jerseySize?: string
      birthYear?: number | null
    }
  }) {
    const headers = await getAuthHeaders()
    const { data, error } = await supabase.functions.invoke('public-register', {
      headers,
      body: {
        raceType: args.raceType,
        eventId: args.eventId,
        registrantEmail: args.registrantEmail,
        registrationFee: args.registrationFee,
        rider: args.rider,
      },
    })
    if (error) throw new Error(await getEdgeFunctionErrorMessage(error, 'Unable to create registration.'))
    return { registrationId: data.registrationId as string }
  },

  async createPaymentOrder(args: {
    registrationId: string
    amount: number
    merchantReference?: string
    acceptLiability: boolean
    acceptRules: boolean
  }) {
    const headers = await getAuthHeaders()
    const { data, error } = await supabase.functions.invoke('public-create-payment', {
      headers,
      body: {
        registrationId: args.registrationId,
        amount: args.amount,
        merchantReference: args.merchantReference,
        acceptLiability: args.acceptLiability,
        acceptRules: args.acceptRules,
      },
    })
    if (error) throw new Error(await getEdgeFunctionErrorMessage(error, 'Unable to create payment order.'))
    return {
      paymentOrderId: data.paymentOrderId as string,
      checkoutUrl: data.checkoutUrl as string | undefined,
    }
  },

  async getPendingPaymentDraft(registrationId?: string): Promise<PendingPaymentDraft | null> {
    const { data: authData } = await supabase.auth.getSession()
    const userId = authData.session?.user?.id ?? null
    const userEmail = authData.session?.user?.email ?? null

    if (!registrationId && !userId && !userEmail) return null

    // First find candidate registrations owned by current user/email.
    let registrationQuery = supabase
      .from('registration_forms')
    .select('id, event_id, registration_fee, user_id, registrant_email, status')
    // Only show "resume-able" payment drafts. If user cancelled, we set registration status back to 'draft',
    // so we should not surface it again on the home page.
    .in('status', ['payment_processing', 'pending_payment'])

    if (registrationId) {
      registrationQuery = registrationQuery.eq('id', registrationId)
    } else if (userId) {
      registrationQuery = registrationQuery.eq('user_id', userId)
    } else if (userEmail) {
      registrationQuery = registrationQuery.eq('registrant_email', userEmail)
    }

    const { data: registrations, error: registrationError } = await registrationQuery.order('created_at', { ascending: false }).limit(20)
    if (registrationError) throw registrationError
    if (!registrations || registrations.length === 0) return null

    const registrationIds = registrations.map((item) => item.id)
    const { data: orders, error: orderError } = await supabase
      .from('payment_orders')
      .select('id, registration_id, amount, currency, status, merchant_reference, created_at')
      .in('registration_id', registrationIds)
      .in('status', ['created', 'pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(20)

    if (orderError) throw orderError
    const order = orders?.[0]
    if (!order) return null

    const registration = registrations.find((item) => item.id === order.registration_id)
    if (!registration) return null

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, race_type')
      .eq('id', registration.event_id)
      .maybeSingle()
    if (eventError) throw eventError

    return {
      paymentOrderId: order.id,
      registrationId: order.registration_id,
      amount: Number(order.amount ?? registration.registration_fee ?? 0),
      currency: String(order.currency ?? 'PHP'),
      status: String(order.status ?? 'pending'),
      merchantReference: String(order.merchant_reference ?? ''),
      createdAt: order.created_at ?? null,
      eventTitle: String(event?.title ?? 'Event Registration'),
      raceType: String(event?.race_type ?? '-'),
    }
  },

  async cancelPendingPaymentDraft(registrationId: string) {
    const { error: orderError } = await supabase
      .from('payment_orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('registration_id', registrationId)
      .in('status', ['created', 'pending', 'processing'])
    if (orderError) throw orderError

    const { error: registrationError } = await supabase
      .from('registration_forms')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', registrationId)
      .in('status', ['payment_processing', 'pending_payment', 'draft'])
    if (registrationError) throw registrationError
  },

  async getCheckoutItem(registrationId: string): Promise<CheckoutItem | null> {
    const { data: registration, error: registrationError } = await supabase
      .from('registration_forms')
      .select('id, event_id, registration_fee')
      .eq('id', registrationId)
      .maybeSingle()
    if (registrationError) throw registrationError
    if (!registration) return null

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('title, race_type')
      .eq('id', registration.event_id)
      .maybeSingle()
    if (eventError) throw eventError

    return {
      registrationId: registration.id,
      eventTitle: String(event?.title ?? 'Event Registration'),
      raceType: String(event?.race_type ?? '-'),
      amount: Number(registration.registration_fee ?? 0),
      currency: 'PHP',
    }
  },

  async getRegistrationCertificateData(registrationId: string): Promise<RegistrationCertificateData | null> {
    const { data: registration, error: registrationError } = await supabase
      .from('registration_forms')
      .select('id, event_id, bib_number, registrant_email, status')
      .eq('id', registrationId)
      .maybeSingle()
    if (registrationError) throw registrationError
    if (!registration) return null

    const [{ data: rider, error: riderError }, { data: event, error: eventError }, { data: order, error: orderError }] =
      await Promise.all([
        supabase
          .from('registration_rider_details')
          .select('first_name, last_name, age_category, discipline')
          .eq('registration_id', registrationId)
          .maybeSingle(),
        supabase.from('events').select('title, race_type').eq('id', registration.event_id).maybeSingle(),
        supabase
          .from('payment_orders')
          .select('id, status, paid_at, created_at')
          .eq('registration_id', registrationId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

    if (riderError) throw riderError
    if (eventError) throw eventError
    if (orderError) throw orderError

    let txStatus: string | null = null
    let txPaidAt: string | null = null
    if (order?.id) {
      const { data: tx, error: txError } = await supabase
        .from('payment_transactions')
        .select('status, paid_at, created_at')
        .eq('payment_order_id', order.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (txError) throw txError
      txStatus = tx?.status ?? null
      txPaidAt = tx?.paid_at ?? null
    }

    const riderName = [rider?.first_name, rider?.last_name].filter(Boolean).join(' ').trim() || 'Registered Rider'
    const category = String(rider?.age_category ?? 'Open Category')
    const discipline = String(rider?.discipline ?? event?.race_type ?? 'Cycling')
    const bibNumber = String(registration.bib_number ?? '').trim() || registration.id.slice(0, 8).toUpperCase()
    const paymentStatus = String(txStatus ?? order?.status ?? registration.status ?? 'pending')
    const normalizedStatus = paymentStatus.toLowerCase()
    const isPaid = normalizedStatus === 'paid'

    return {
      registrationId: registration.id,
      riderName,
      category,
      discipline,
      bibNumber,
      eventTitle: String(event?.title ?? 'Hari ng Ahon'),
      registrantEmail: String(registration.registrant_email ?? ''),
      qrValue: `HNA|${registration.id}|${bibNumber}`,
      paymentStatus,
      isPaid,
      paidAt: txPaidAt ?? order?.paid_at ?? null,
    }
  },

  async queueCertificateEmail(args: {
    registrationId: string
    recipient: string
    subject: string
  }) {
    const recipient = args.recipient.trim()
    if (!recipient) throw new Error('Missing recipient email.')
    const { data: authData } = await supabase.auth.getSession()
    const userId = authData.session?.user?.id ?? null
    const { error } = await supabase.from('notification_deliveries').insert({
      user_id: userId,
      registration_id: args.registrationId,
      channel: 'email',
      recipient,
      subject: args.subject,
      payload: {
        type: 'registration_certificate',
        registration_id: args.registrationId,
      },
      status: 'queued',
      created_at: new Date().toISOString(),
    })
    if (error) throw error
  },

  // agreements handled inside public-create-payment
}

