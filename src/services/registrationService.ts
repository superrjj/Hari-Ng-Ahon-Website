import { supabase } from '../lib/supabase'

export type RegistrationEventKey = 'criterium' | 'itt'

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
    const { data, error } = await supabase.functions.invoke('public-register', {
      body: {
        raceType: args.raceType,
        registrantEmail: args.registrantEmail,
        registrationFee: args.registrationFee,
        rider: args.rider,
      },
    })
    if (error) throw error
    return { registrationId: data.registrationId as string }
  },

  async createPaymentOrder(args: {
    registrationId: string
    amount: number
    merchantReference: string
    acceptLiability: boolean
    acceptRules: boolean
  }) {
    const { data, error } = await supabase.functions.invoke('public-create-payment', {
      body: {
        registrationId: args.registrationId,
        amount: args.amount,
        merchantReference: args.merchantReference,
        acceptLiability: args.acceptLiability,
        acceptRules: args.acceptRules,
      },
    })
    if (error) throw error
    return { paymentOrderId: data.paymentOrderId as string }
  },

  // agreements handled inside public-create-payment
}

