import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { supabase } from '../../lib/supabase'
import { registrationService } from '../../services/registrationService'
import type { Event } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RaceCategory {
  id: string
  discipline: string
  category_name: string
  code: string
  rider_limit: number | null
  active: boolean
}

interface DisciplineGroup {
  discipline: string
  categories: RaceCategory[]
}

const CATEGORY_PREVIEW_LIMIT = 5

const DISCIPLINE_ICONS: Record<string, string> = {
  'Road Bike': '🚴',
  'Mountain Bike': '🚵',
  MTB: '🚵',
  Gravel: '🪨',
  'Gravel Bike': '🪨',
  'E-Bike': '⚡',
  'E-Bike (Open)': '⚡',
  Mixed: '🎽',
}

const DISCIPLINE_TIRE_HINTS: Record<string, string> = {
  'Road Bike': 'Tire Size: <32mm / <1.25"',
  'Mountain Bike': 'Tire Size: >50mm / 1.95"',
  'Gravel Bike': 'Tire Size: 33–49mm / 1.3–1.9"',
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CategorySkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5">
      <div className="h-4 w-32 rounded bg-slate-200 mb-2" />
      <div className="h-3 w-40 rounded bg-slate-100 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-3 w-3/4 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

// ─── Discipline Card ──────────────────────────────────────────────────────────

function DisciplineCard({ group }: { group: DisciplineGroup }) {
  const [expanded, setExpanded] = useState(false)
  const icon = DISCIPLINE_ICONS[group.discipline] ?? '🚴'
  const tireHint = DISCIPLINE_TIRE_HINTS[group.discipline] ?? null
  const activeCategories = group.categories.filter((c) => c.active)
  const visible = expanded ? activeCategories : activeCategories.slice(0, CATEGORY_PREVIEW_LIMIT)
  const hasMore = activeCategories.length > CATEGORY_PREVIEW_LIMIT

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base" aria-hidden="true">{icon}</span>
        <h4 className="text-sm font-semibold">{group.discipline}</h4>
      </div>
      {tireHint && (
        <p className="mt-0.5 text-xs text-slate-500">{tireHint}</p>
      )}
      {activeCategories.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400 italic">No active categories.</p>
      ) : (
        <>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700 marker:text-slate-500">
            {visible.map((cat) => (
              <li key={cat.id}>{cat.category_name}</li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs font-semibold text-[#1e4a8e] hover:underline"
            >
              {expanded
                ? 'See less'
                : `See ${activeCategories.length - CATEGORY_PREVIEW_LIMIT} more…`}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RegistrationInfo() {
  const { session } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingRegistrationId, setPendingRegistrationId] = useState<string | null>(null)

  // disciplines fetched from race_categories
  const [disciplineGroups, setDisciplineGroups] = useState<DisciplineGroup[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string | null>(null)

  // ── Fetch upcoming events ──────────────────────────────────────────────────
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
    return () => { active = false }
  }, [])

  // ── Fetch pending draft ────────────────────────────────────────────────────
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
    return () => { active = false }
  }, [session])

  const selectedEvent = useMemo(() => events[0] ?? null, [events])

  // ── Fetch race_categories for the selected event ───────────────────────────
  useEffect(() => {
    if (!selectedEvent?.id) {
      setDisciplineGroups([])
      return
    }
    let active = true
    setCategoriesLoading(true)
    setCategoriesError(null)

    ;(async () => {
      try {
        const { data, error: err } = await supabase
          .from('race_categories')
          .select('id, discipline, category_name, code, rider_limit, active')
          .eq('event_id', selectedEvent.id)

        if (!active) return
        if (err) {
          setCategoriesError(err.message || 'Failed to load categories.')
          setDisciplineGroups([])
          return
        }
        const rows = (data ?? []) as RaceCategory[]

        // group by discipline, preserving insertion order
        const groupMap = new Map<string, RaceCategory[]>()
        for (const row of rows) {
          const disc = (row.discipline ?? '').trim() || 'General'
          if (!groupMap.has(disc)) groupMap.set(disc, [])
          groupMap.get(disc)!.push(row)
        }

        const groups: DisciplineGroup[] = Array.from(groupMap.entries()).map(
          ([discipline, categories]) => ({ discipline, categories }),
        )
        setDisciplineGroups(groups)
      } catch (e) {
        if (!active) return
        setCategoriesError((e as Error).message || 'Failed to load categories.')
        setDisciplineGroups([])
      } finally {
        if (!active) return
        setCategoriesLoading(false)
      }
    })()

    return () => { active = false }
  }, [selectedEvent?.id])

  // ── Derived values ─────────────────────────────────────────────────────────
  const eventDate = selectedEvent?.event_date
    ? new Date(selectedEvent.event_date).toLocaleDateString()
    : 'TBA'
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

        {/* Description */}
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

        {/* Registration fees */}
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5">
          <h3 className="text-lg font-semibold">Registration fees</h3>
          <p className="text-sm text-slate-600">
            Race Inclusions: Finisher Shirt, Drawstring bag, Race Bib, Bike plate, Post-Race Meal, Finisher Medal
            (Metal), and Timing Chip (Rental)
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-[#cfae3f] px-3 py-1 text-sm font-semibold text-black">Tier 1</span>
            <span className="text-sm text-slate-800">
              {registrationFee > 0
                ? `₱${registrationFee.toLocaleString()} per event type`
                : loading
                  ? '—'
                  : 'Contact organizer for pricing'}
            </span>
            <span className="text-xs text-slate-500">Current</span>
          </div>
          <p className="text-xs text-slate-500">
            *Slots are limited to ensure a safe and manageable race experience for all participants*
          </p>
        </section>

        {/* Dynamic Categories */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Categories</h3>

          {categoriesLoading && (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <CategorySkeleton key={i} />
              ))}
            </div>
          )}

          {!categoriesLoading && categoriesError && (
            <p className="text-sm text-rose-600">{categoriesError}</p>
          )}

          {!categoriesLoading && !categoriesError && disciplineGroups.length === 0 && selectedEvent && (
            <p className="text-sm text-slate-500 italic">
              No categories have been configured for this event yet.
            </p>
          )}

          {!categoriesLoading && disciplineGroups.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {disciplineGroups.map((group) => (
                <DisciplineCard key={group.discipline} group={group} />
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
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