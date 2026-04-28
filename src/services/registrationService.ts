import { supabase } from '../lib/supabase'

export type RegistrationEventKey = 'criterium' | 'itt'

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
    merchantReference: string
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

  // agreements handled inside public-create-payment
}

