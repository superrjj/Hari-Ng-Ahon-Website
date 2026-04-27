import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { registrationService } from '../../services/registrationService'

export function RegistrationPayment() {
  const [params] = useSearchParams()
  const registrationId = params.get('registrationId')
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const merchantReference = useMemo(() => `HNA-${registrationId ?? 'NA'}-${Date.now()}`, [registrationId])

  const onSubmit = async () => {
    setError(null)
    if (!registrationId) {
      setError('Missing registrationId.')
      return
    }
    if (!agree) {
      setError('Please accept the waiver and rules.')
      return
    }

    setSubmitting(true)
    try {
      const payment = await registrationService.createPaymentOrder({
        registrationId,
        amount: 1000,
        merchantReference,
        acceptLiability: true,
        acceptRules: true,
      })
      if (!payment.checkoutUrl) {
        throw new Error('Missing checkout URL from payment provider.')
      }
      window.location.assign(payment.checkoutUrl)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-[760px] space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Payment</h1>
          <p className="text-sm text-slate-600">Complete payment to confirm your registration.</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-slate-600">Registration fee</p>
            <p className="font-medium">₱1000.00 (Early registration)</p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-slate-600">Total</p>
            <p className="text-lg font-semibold text-slate-900">₱1000.00</p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Secure checkout</h2>
          <p className="text-sm text-slate-600">
            You will be redirected to PayMongo to complete payment. Your registration stays pending until webhook
            confirmation marks the payment as paid.
          </p>
          <p className="text-sm">
            Please read <a className="text-slate-900 underline" href="#">Agreement and Liability Waiver</a>, as well as
            the <a className="text-slate-900 underline" href="#">Race Rules</a>.
          </p>
        </div>

        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800">
          <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I have read and agree to the Agreement and Liability Waiver and Race Rules.</span>
        </label>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-[#cfae3f] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Redirecting…' : 'Proceed to PayMongo'}
        </button>
      </div>
    </section>
  )
}
