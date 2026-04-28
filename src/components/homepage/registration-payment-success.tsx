import { Link, useSearchParams } from 'react-router-dom'

export function RegistrationPaymentSuccess() {
  const [params] = useSearchParams()
  const registrationId = params.get('registrationId')

  return (
    <section className="bg-white px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-[760px] space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Payment successful</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-emerald-900 sm:text-3xl">
            Registration payment received
          </h1>
          <p className="mt-2 text-sm text-emerald-800">
            Thank you! Your payment was submitted to PayMongo successfully. We are now verifying the transaction via
            webhook and finalizing your registration.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">What happens next?</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            <li>Payment status is updated automatically from PayMongo webhook.</li>
            <li>Your registration is marked as paid once confirmation is completed.</li>
            <li>You can revisit your dashboard/registration details to track updates.</li>
          </ol>
          <p className="mt-4 text-xs text-slate-500">
            Registration ID: <span className="font-mono text-slate-700">{registrationId ?? 'N/A'}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex items-center rounded-md bg-[#cfae3f] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852]"
          >
            Back to home
          </Link>
          <Link
            to={registrationId ? `/register/payment?registrationId=${encodeURIComponent(registrationId)}` : '/register/payment'}
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View payment page
          </Link>
        </div>
      </div>
    </section>
  )
}

