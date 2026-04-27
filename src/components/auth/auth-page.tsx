import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'

type AuthMode = 'login' | 'signup'
const AUTH_TIMEOUT_MS = 15000

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    }),
  ])
}

export function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, register, resendConfirmation, session, loading } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [fullNameError, setFullNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')

  const redirectTo = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('redirect') || '/register/info'
  }, [location.search])

  useEffect(() => {
    if (!loading && session) {
      void navigate(redirectTo, { replace: true })
    }
  }, [loading, navigate, redirectTo, session])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setPendingVerificationEmail('')
    setFullNameError('')
    setEmailError('')
    setPasswordError('')
    setFormError('')

    const trimmedEmail = email.trim().toLowerCase()
    const trimmedFullName = fullName.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (mode === 'signup') {
      if (!trimmedFullName || trimmedFullName.length < 2) {
        setFullNameError('Please enter your full name.')
        setSubmitting(false)
        return
      }
      if (!emailRegex.test(trimmedEmail)) {
        setEmailError('Please enter a valid email address.')
        setSubmitting(false)
        return
      }
      if (password.length < 8) {
        setPasswordError('Password must be at least 8 characters.')
        setSubmitting(false)
        return
      }
    }

    try {
      if (mode === 'login') {
        await withTimeout(login(trimmedEmail, password), AUTH_TIMEOUT_MS, 'Login timed out. Please try again.')
        toast.success('Welcome back!')
        navigate(redirectTo, { replace: true })
      } else {
        await withTimeout(
          register(trimmedEmail, password, trimmedFullName),
          AUTH_TIMEOUT_MS,
          'Create account request timed out. Please try again.',
        )
        toast.success('Account created. Please confirm your email before logging in.')
        setPendingVerificationEmail(trimmedEmail)
        setMode('login')
      }
    } catch (error) {
      const message = (error as Error).message || 'Authentication failed.'
      if (message.toLowerCase().includes('email not confirmed')) {
        setPendingVerificationEmail(trimmedEmail)
        toast.error('Email not confirmed. Please verify your inbox, then log in.')
      } else if (mode === 'signup' && (message.toLowerCase().includes('already registered') || message.toLowerCase().includes('already been registered'))) {
        setEmailError('This email is already registered. Please login instead.')
      } else if (mode === 'login' && message.toLowerCase().includes('invalid login credentials')) {
        setFormError('Incorrect email or password. Please try again.')
      } else if (mode === 'signup' && message.toLowerCase().includes('password should be at least')) {
        setPasswordError('Password must be at least 8 characters.')
      } else if (message.toLowerCase().includes('timed out')) {
        setFormError('The request is taking too long. Please try again in a moment.')
      } else {
        setFormError(mode === 'login' ? 'Unable to login right now. Please try again.' : 'Unable to create account right now. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const onResendConfirmation = async () => {
    if (!pendingVerificationEmail) return
    setResending(true)
    try {
      await withTimeout(
        resendConfirmation(pendingVerificationEmail),
        AUTH_TIMEOUT_MS,
        'Resend verification request timed out. Please try again.',
      )
      toast.success('Verification email resent. Please check your inbox.')
    } catch (error) {
      const message = (error as Error).message || ''
      if (message.toLowerCase().includes('timed out')) {
        toast.error('Request timed out. Please try resending again.')
      } else {
        toast.error('Failed to resend verification email.')
      }
    } finally {
      setResending(false)
    }
  }

  return (
    <section className="flex h-[calc(100svh-4.5rem)] items-center overflow-hidden bg-slate-50 px-3 py-4 text-slate-900 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto w-full max-w-md space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:space-y-6 sm:p-6">
        <div className="space-y-1 text-center">
          <p className="text-sm text-slate-500">Hari ng Ahon 2026</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-3xl">
            {mode === 'login' ? 'Login' : 'Create account'}
          </h1>
          <p className="text-xs text-slate-600 sm:text-sm">
            {mode === 'login'
              ? 'Login to continue your registration.'
              : 'Create your account to register for the event.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5 rounded-md bg-slate-100 p-1 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setPendingVerificationEmail('')
              setFormError('')
              setEmailError('')
              setPasswordError('')
              setFullNameError('')
            }}
            className={`rounded-md px-2.5 py-2 text-sm font-medium transition sm:px-3 ${
              mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setPendingVerificationEmail('')
              setFormError('')
              setEmailError('')
              setPasswordError('')
              setFullNameError('')
            }}
            className={`rounded-md px-2.5 py-2 text-sm font-medium transition sm:px-3 ${
              mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Create account
          </button>
        </div>

        <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
          {mode === 'signup' && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900" htmlFor="full-name">
                Full name
              </label>
              <input
                id="full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Juan Dela Cruz"
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#cfae3f] sm:py-2"
              />
              {fullNameError && <p className="text-xs text-rose-600">{fullNameError}</p>}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setPendingVerificationEmail('')
                setEmailError('')
                setFormError('')
              }}
              type="email"
              placeholder="you@email.com"
              autoComplete="email"
              required
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#cfae3f] sm:py-2"
            />
            {emailError && <p className="text-xs text-rose-600">{emailError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                  setPasswordError('')
                  setFormError('')
                }}
                type={showPassword ? 'text' : 'password'}
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 pr-20 text-sm text-slate-900 outline-none focus:border-[#cfae3f] sm:py-2"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {passwordError && <p className="text-xs text-rose-600">{passwordError}</p>}
          </div>

          {formError && <p className="text-sm text-rose-600">{formError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-md bg-[#cfae3f] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>

          {pendingVerificationEmail && (
            <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>
                Your account is not verified yet. Check your inbox for <span className="font-semibold">{pendingVerificationEmail}</span>.
              </p>
              <button
                type="button"
                onClick={() => void onResendConfirmation()}
                disabled={resending}
                className="inline-flex rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          )}
        </form>

        <div className="text-center text-sm text-slate-600">
          <Link to="/" className="font-medium text-slate-700 hover:text-slate-900">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  )
}
