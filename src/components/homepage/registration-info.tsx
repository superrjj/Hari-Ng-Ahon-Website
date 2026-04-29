import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { registrationService } from '../../services/registrationService'
import type { Event } from '../../types'

const roadBikeCategories = [
  'RB OPEN/ELITE',
  'YOUTH (15 and Below)',
  'Junior (16-18)',
  'Under 23 (19-22)',
  'Masters A (23-34)',
  'Masters B (35-44)',
  'Masters C (45-54)',
  'Masters D (55 and above)',
]

const mountainBikeCategories = [
  'MTB OPEN/Elite',
  'YOUTH (15 and Below)',
  'Junior (16-18)',
  'Under 23 (19-22)',
  'Masters A (23-34)',
  'Masters B (35-44)',
  'Masters C (45-54)',
  'Masters D (55 and above)',
]

export function RegistrationInfo() {
  const { session } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingRegistrationId, setPendingRegistrationId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    void api
      .upcomingEvents()
      .then((data) => {
        if (!active) return
        setEvents(data)
      })
      .catch((e) => {
        if (!active) return
        setError((e as Error).message || 'Failed to load events.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setPendingRegistrationId(null)
      return
    }
    let active = true
    void registrationService
      .getPendingPaymentDraft()
      .then((draft) => {
        if (!active) return
        setPendingRegistrationId(draft?.registrationId ?? null)
      })
      .catch(() => {
        if (!active) return
        setPendingRegistrationId(null)
      })
    return () => {
      active = false
    }
  }, [session])

  const selectedEvent = useMemo(() => events[0] ?? null, [events])
  const eventDate = selectedEvent?.event_date ? new Date(selectedEvent.event_date).toLocaleDateString() : 'TBA'
  const eventRace = selectedEvent?.race_type ?? 'Race'
  const registrationFee = Number(selectedEvent?.registration_fee ?? 0)
  const nextPath = pendingRegistrationId
    ? `/register/payment?registrationId=${encodeURIComponent(pendingRegistrationId)}`
    : selectedEvent
      ? `/register/form?eventId=${encodeURIComponent(selectedEvent.id)}`
      : '/register/form'

  return (
    <section className="bg-white px-4 py-8 text-slate-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-[760px] space-y-8 sm:space-y-10">
        <img src="/hna-banner-1.png" alt="Hari ng Ahon 2026 banner" className="w-full rounded-lg object-cover" />

        <header className="space-y-3">
          <p className="text-sm font-medium text-slate-600">{selectedEvent?.title ?? 'Hari ng Ahon'}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">{eventRace}</h1>
          <dl className="grid grid-cols-1 gap-2 text-sm text-slate-800 sm:gap-3 md:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)]">
              <dt className="text-xs text-slate-500">Race date</dt>
              <dd className="font-medium">{eventDate}</dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)]">
              <dt className="text-xs text-slate-500">Venue</dt>
              <dd className="font-medium">{selectedEvent?.venue ?? 'TBA'}</dd>
            </div>
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)]">
              <dt className="text-xs text-slate-500">Status</dt>
              <dd className="font-medium capitalize">{selectedEvent?.status ?? 'draft'}</dd>
            </div>
          </dl>
        </header>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Bike Challenge Series</h2>
          <p className="text-sm leading-relaxed text-slate-700">
            Baguio City is nestled almost 1500 meters above sea level. This is the reason why it is usually taunted as
            the killer lap in most national road bike races since biking towards the city would always mean several
            kilometers of unforgiving climbs.
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            Hari ng Ahon bike challenge series is a sporting event organized by All Out Multisports in partnership with
            the Metropolitan Baguio-La Trinidad-Itogon-Sablan-Tuba-Tublay Development Authority (MBLISTTDA).
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            This highly anticipated event consists of a thrilling five-leg bike race, covering various routes leading to
            the breathtaking city of Baguio from its neighboring municipalities.
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            The series is now on its 4th and 5th legs to complete Season 4.
          </p>
        </section>

        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5">
          <h3 className="text-lg font-semibold">Registration fees</h3>
          <p className="text-sm text-slate-600">
            Race Inclusions: Finisher Shirt, Drawstring bag, Race Bib, Bike plate, Post-Race Meal, Finisher Medal
            (Metal), and Timing Chip (Rental)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-[#cfae3f] px-3 py-1 text-sm font-semibold text-black">Tier 1</span>
            <span className="text-sm text-slate-800">₱{registrationFee.toLocaleString()} </span>
            <span className="text-xs text-slate-500">Current</span>
          </div>
          <p className="text-xs text-slate-500">
            *Slots are limited to ensure a safe and manageable race experience for all participants*
          </p>
        </section>

        <section className="space-y-6">
          <h3 className="text-lg font-semibold">Categories</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5">
              <h4 className="text-sm font-semibold">Road Bike</h4>
              <p className="mt-1 text-xs text-slate-500">Tire Size: &lt;32mm / &lt;1.25&quot;</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 marker:text-slate-500">
              {roadBikeCategories.map((item) => (
                <li key={item}>{item}</li>
              ))}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5">
              <h4 className="text-sm font-semibold">Mountain Bike</h4>
              <p className="mt-1 text-xs text-slate-500">Tire Size: &gt;50mm / 1.95&quot;</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 marker:text-slate-500">
              {mountainBikeCategories.map((item) => (
                <li key={item}>{item}</li>
              ))}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5">
              <h4 className="text-sm font-semibold">Gravel Bike</h4>
              <p className="mt-1 text-xs text-slate-500">Tire Size: 33–49mm / 1.3–1.9&quot;</p>
              <ul className="mt-3 list-disc pl-5 text-sm text-slate-700 marker:text-slate-500">
                <li>Open Gravel Bike</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5">
              <h4 className="text-sm font-semibold">Mixed</h4>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 marker:text-slate-500">
                <li>Open / Elite Women</li>
                <li>Heavyweight</li>
                <li>Public Servant</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="pt-2">
          {loading ? <p className="text-sm text-slate-500">Loading available events...</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          {pendingRegistrationId ? (
            <p className="mb-2 text-sm text-amber-700">
              You have a pending checkout. Clicking Next will resume your payment.
            </p>
          ) : null}
          <Link
            to={session ? nextPath : `/auth?redirect=${encodeURIComponent(nextPath)}`}
            className="inline-flex w-full items-center justify-center rounded-md bg-[#cfae3f] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852] sm:w-auto"
          >
            Next
          </Link>
        </div>
      </div>
    </section>
  )
}