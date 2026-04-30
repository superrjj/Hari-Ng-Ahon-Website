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
  eventType: string
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

function extractBibSequence(bibNumber: string, prefix: string) {
  const value = String(bibNumber ?? '').trim()
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = value.match(new RegExp(`^${escapedPrefix}(\\d{2})$`))
  if (!match) return 0
  const n = Number.parseInt(match[1], 10)
  return Number.isFinite(n) ? n : 0
}

function normalizeEventType(raw: string | null | undefined) {
  const first = String(raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)[0]
  if (!first) return 'Criterium'
  return first
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export const registrationService = {
  async createRegistration(args: {
    raceType: RegistrationEventKey
    eventId?: string
    raceCategoryId?: string
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
        raceCategoryId: args.raceCategoryId,
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

  async markRegistrationAsPaidAfterPaymongoRedirect(registrationId: string) {
    const now = new Date().toISOString()
    const { data: regForBib, error: regForBibError } = await supabase
      .from('registration_forms')
      .select('id, race_category_id, bib_number')
      .eq('id', registrationId)
      .maybeSingle()
    if (regForBibError) throw regForBibError
    if (!regForBib) throw new Error('Registration record not found.')

    if (!String(regForBib.bib_number ?? '').trim()) {
      if (!regForBib.race_category_id) {
        throw new Error('Missing race category for this registration.')
      }
      const { data: raceCategory, error: raceCategoryError } = await supabase
        .from('race_categories')
        .select('code, category_name, rider_limit')
        .eq('id', regForBib.race_category_id)
        .maybeSingle()
      if (raceCategoryError) throw raceCategoryError
      const categoryCode = String(raceCategory?.code ?? '').trim()
      const bibPrefix = categoryCode || '00'

      const { data: existingBibs, error: existingBibsError } = await supabase
        .from('registration_forms')
        .select('bib_number')
        .eq('race_category_id', regForBib.race_category_id)
        .not('bib_number', 'is', null)
        .order('created_at', { ascending: true })
        .limit(5000)
      if (existingBibsError) throw existingBibsError

      const maxSequence = (existingBibs ?? []).reduce((max, row) => {
        const seq = extractBibSequence(String(row.bib_number ?? ''), bibPrefix)
        return seq > max ? seq : max
      }, 0)
      const nextSequence = maxSequence + 1
      const riderLimit = Number(raceCategory?.rider_limit ?? 0)
      if (Number.isFinite(riderLimit) && riderLimit > 0 && nextSequence > riderLimit) {
        throw new Error(
          `Category limit reached for ${String(raceCategory?.category_name ?? 'selected category')}. Max riders: ${riderLimit}.`,
        )
      }
      const generatedBib = `${bibPrefix}${String(nextSequence).padStart(2, '0')}`

      const { error: bibUpdateError } = await supabase
        .from('registration_forms')
        .update({
          bib_number: generatedBib,
          updated_at: now,
        })
        .eq('id', regForBib.id)
      if (bibUpdateError) throw bibUpdateError
    }

    const { data: order, error: orderLookupError } = await supabase
      .from('payment_orders')
      .select('id, status, amount, currency, provider_reference')
      .eq('registration_id', registrationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (orderLookupError) throw orderLookupError
    if (!order?.id) throw new Error('Payment order not found for registration.')

    if (String(order.status).toLowerCase() !== 'paid') {
      const { error: orderUpdateError } = await supabase
        .from('payment_orders')
        .update({
          status: 'paid',
          paid_at: now,
          updated_at: now,
        })
        .eq('id', order.id)
      if (orderUpdateError) throw orderUpdateError

      const { error: txInsertError } = await supabase.from('payment_transactions').insert({
        payment_order_id: order.id,
        status: 'paid',
        amount: Number(order.amount ?? 0),
        currency: String(order.currency ?? 'PHP'),
        paid_at: now,
        provider_event_type: 'checkout_success_redirect',
        provider_reference: order.provider_reference ?? null,
        raw_payload: {
          source: 'client_success_redirect',
          registration_id: registrationId,
        },
      })
      if (txInsertError) throw txInsertError
    }

    const { error: registrationUpdateError } = await supabase
      .from('registration_forms')
      .update({
        status: 'paid',
        confirmed_at: now,
        updated_at: now,
      })
      .eq('id', registrationId)
    if (registrationUpdateError) throw registrationUpdateError
  },

  async getRegistrationCertificateData(registrationId: string): Promise<RegistrationCertificateData | null> {
    const { data: registration, error: registrationError } = await supabase
      .from('registration_forms')
      .select('id, event_id, race_category_id, bib_number, registrant_email, status')
      .eq('id', registrationId)
      .maybeSingle()
    if (registrationError) throw registrationError
    if (!registration) return null

    const [{ data: rider, error: riderError }, { data: event, error: eventError }, { data: order, error: orderError }, { data: raceCategory, error: raceCategoryError }] =
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
        registration.race_category_id
          ? supabase.from('race_categories').select('category_name, code').eq('id', registration.race_category_id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ])

    if (riderError) throw riderError
    if (eventError) throw eventError
    if (orderError) throw orderError
    if (raceCategoryError) throw raceCategoryError

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
    const category = String(rider?.age_category ?? raceCategory?.category_name ?? 'Open Category')
    const discipline = String(rider?.discipline ?? event?.race_type ?? 'Cycling')
    const eventType = normalizeEventType(event?.race_type)
    const bibNumber = String(registration.bib_number ?? '').trim() || `${String(raceCategory?.code ?? '00').trim()}00`
    const paymentStatus = String(txStatus ?? order?.status ?? registration.status ?? 'pending')
    const normalizedStatus = paymentStatus.toLowerCase()
    const isPaid = normalizedStatus === 'paid'

    return {
      registrationId: registration.id,
      riderName,
      category,
      discipline,
      eventType,
      bibNumber,
      eventTitle: String(event?.title ?? 'Hari ng Ahon'),
      registrantEmail: String(registration.registrant_email ?? ''),
      qrValue: bibNumber,
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
    const { data: existingDelivery, error: existingDeliveryError } = await supabase
      .from('notification_deliveries')
      .select('id, status')
      .eq('registration_id', args.registrationId)
      .eq('channel', 'email')
      .eq('recipient', recipient)
      .eq('payload->>type', 'registration_certificate')
      .in('status', ['queued', 'processing', 'sent'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existingDeliveryError) throw existingDeliveryError
    if (existingDelivery?.id) {
      return { queued: false, reason: 'already_queued' as const }
    }
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
    return { queued: true as const }
  },

  // agreements handled inside public-create-payment
}

