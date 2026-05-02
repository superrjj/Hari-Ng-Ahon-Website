import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import { supabase } from '../../lib/supabase'
import { saveRegistrationCheckoutPayload } from '../../services/registrationService'
import type { Event } from '../../types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventType {
  slug: string
  name: string
}

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

// ─── Constants ───────────────────────────────────────────────────────────────

const shirtSizes = ['XS', 'S', 'M', 'L', 'XL']
const cardClass =
  'rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.28),0_6px_14px_-8px_rgba(15,23,42,0.2)] sm:p-5'

// ─── Age category detection & resolution ────────────────────────────────────

// Patterns that indicate a category is age-graded (not open/heavyweight/etc.)
const AGE_PATTERNS = [
  /youth/i,
  /junior/i,
  /under\s*23/i,
  /u23/i,
  /masters?/i,
  /\b15\b/,
  /\b16\b/,
  /18\b/,
  /19\b/,
  /\b22\b/,
  /\b23\b/,
  /\b34\b/,
  /\b35\b/,
  /\b44\b/,
  /\b45\b/,
  /\b54\b/,
  /\b55\b/,
]

/**
 * Returns true if the category list for this discipline contains
 * at least one age-graded entry (Youth, Junior, Masters, etc.).
 */
function disciplineHasAgeCategories(categoryNames: string[]): boolean {
  return categoryNames.some((name) => AGE_PATTERNS.some((re) => re.test(name)))
}

/**
 * Compute race age per the rules: age on December 31 of the competition year.
 * Uses the full birth date so month/day are taken into account.
 */
function computeRaceAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null
  const dob = new Date(birthDateStr)
  if (Number.isNaN(dob.getTime())) return null
  const competitionYear = new Date().getFullYear()
  // December 31 of competition year
  const dec31 = new Date(competitionYear, 11, 31)
  let age = dec31.getFullYear() - dob.getFullYear()
  // Adjust if birthday hasn't occurred yet by Dec 31 (it always has, but keep safe)
  const m = dec31.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && dec31.getDate() < dob.getDate())) age--
  return age
}

/**
 * Match an age to an age-graded category by keyword-scanning the category names.
 * This is robust to DB ordering changes.
 */
function resolveAgeCategoryByKeyword(age: number, categoryNames: string[]): string {
  // Only consider age-graded categories
  const ageCats = categoryNames.filter((name) => AGE_PATTERNS.some((re) => re.test(name)))

  // Try explicit bracket matching first (e.g. "15 and Below", "16-18", "19-22", etc.)
  for (const name of ageCats) {
    if (age <= 15 && (/15\s*(and\s*)?below/i.test(name) || /youth/i.test(name))) return name
    if (age >= 16 && age <= 18 && (/16[-–]18/i.test(name) || /junior/i.test(name))) return name
    if (age >= 19 && age <= 22 && (/19[-–]22/i.test(name) || /under\s*23/i.test(name) || /u23/i.test(name))) return name
    if (age >= 23 && age <= 34 && (/23[-–]34/i.test(name) || /masters?\s*a/i.test(name))) return name
    if (age >= 35 && age <= 44 && (/35[-–]44/i.test(name) || /masters?\s*b/i.test(name))) return name
    if (age >= 45 && age <= 54 && (/45[-–]54/i.test(name) || /masters?\s*c/i.test(name))) return name
    if (age >= 55 && (/55\s*(and\s*)?above/i.test(name) || /masters?\s*d/i.test(name))) return name
  }

  // Fallback: pick last age-graded category for seniors
  if (ageCats.length > 0) return ageCats[ageCats.length - 1]
  return ''
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSlug(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RegistrationForm() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    gender: '',
    birthDate: '',
    address: '',
    contactNumber: '',
    emergencyContactName: '',
    emergencyContactNumber: '',
    teamName: '',
    discipline: '',
  })
  const [categoryId, setCategoryId] = useState('')
  const [shirtSize, setShirtSize] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // ── Events ─────────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventId, setEventId] = useState('')

  useEffect(() => {
    let active = true
    void (async () => {
      if (!active) return
      setEventsLoading(true)
      try {
        const data = await api.upcomingEvents()
        if (!active) return
        setEvents(data)
        const queryEventId = params.get('eventId')
        const matched = queryEventId ? data.find((item) => item.id === queryEventId) : null
        const fallback = data[0]?.id ?? ''
        setEventId(matched?.id ?? fallback)
      } catch (e) {
        if (!active) return
        setError((e as Error).message || 'Failed to load events.')
      } finally {
        if (active) {
          setEventsLoading(false)
        }
      }
    })()
    return () => { active = false }
  }, [params])

  const selectedEvent = useMemo(() => events.find((item) => item.id === eventId) ?? null, [events, eventId])
  const registrationFee = Number(selectedEvent?.registration_fee ?? 0)

  // ── Event Types (from event_types table + event's race_type slugs) ─────────
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [eventTypesLoading, setEventTypesLoading] = useState(false)
  const [selectedEventTypeSlugs, setSelectedEventTypeSlugs] = useState<string[]>([])

  useEffect(() => {
    let active = true
    void (async () => {
      if (!selectedEvent) {
        if (!active) return
        setEventTypes([])
        setSelectedEventTypeSlugs([])
        return
      }

      // Parse slugs from the event's race_type field (comma-separated)
      const rawSlugs = String(selectedEvent.race_type ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      if (rawSlugs.length === 0) {
        if (!active) return
        setEventTypes([])
        setSelectedEventTypeSlugs([])
        return
      }

      if (!active) return
      setEventTypesLoading(true)
      setSelectedEventTypeSlugs([])

      try {
        const { data, error: err } = await supabase
          .from('event_types')
          .select('slug, name')
          .in('slug', rawSlugs)

        if (!active) return
        if (err || !data || data.length === 0) {
          // Fallback: derive name from slug if table query fails or returns nothing
          setEventTypes(rawSlugs.map((slug) => ({ slug, name: formatSlug(slug) })))
        } else {
          // Preserve order from rawSlugs
          const bySlug = new Map((data as EventType[]).map((t) => [t.slug, t]))
          setEventTypes(rawSlugs.map((slug) => bySlug.get(slug) ?? { slug, name: formatSlug(slug) }))
        }
      } catch {
        if (!active) return
        setEventTypes(rawSlugs.map((slug) => ({ slug, name: formatSlug(slug) })))
      } finally {
        if (active) {
          setEventTypesLoading(false)
        }
      }
    })()

    return () => { active = false }
  }, [selectedEvent])

  const toggleEventType = (slug: string) => {
    setSelectedEventTypeSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    )
  }

  // ── Computed total fee ─────────────────────────────────────────────────────
  const totalFee = useMemo(
    () => registrationFee * Math.max(1, selectedEventTypeSlugs.length),
    [registrationFee, selectedEventTypeSlugs.length],
  )

  // ── Race Categories from DB ────────────────────────────────────────────────
  const [disciplineGroups, setDisciplineGroups] = useState<DisciplineGroup[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  useEffect(() => {
    let active = true
    void (async () => {
      if (!selectedEvent?.id) {
        if (!active) return
        setDisciplineGroups([])
        setForm((p) => ({ ...p, discipline: '' }))
        setCategoryId('')
        return
      }
      if (!active) return
      setCategoriesLoading(true)
      try {
        const { data, error: err } = await supabase
          .from('race_categories')
          .select('id, discipline, category_name, code, rider_limit, active')
          .eq('event_id', selectedEvent.id)
          .eq('active', true)

        if (!active) return
        if (err || !data) {
          setDisciplineGroups([])
          return
        }
        const rows = data as RaceCategory[]
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

        // Auto-select first discipline
        const firstDisc = groups[0]?.discipline ?? ''
        setForm((p) => ({ ...p, discipline: firstDisc }))
        setCategoryId('')
      } finally {
        if (active) {
          setCategoriesLoading(false)
        }
      }
    })()

    return () => { active = false }
  }, [selectedEvent?.id])

  // The categories available for the currently selected discipline
  const currentDisciplineGroup = useMemo(
    () => disciplineGroups.find((g) => g.discipline === form.discipline) ?? null,
    [disciplineGroups, form.discipline],
  )

  const currentCategoryNames = useMemo(
    () => (currentDisciplineGroup?.categories ?? []).map((c) => c.category_name),
    [currentDisciplineGroup],
  )
  const currentCategoryIds = useMemo(
    () => (currentDisciplineGroup?.categories ?? []).map((c) => c.id),
    [currentDisciplineGroup],
  )
  const validCategoryId = useMemo(
    () => (categoryId && currentCategoryIds.includes(categoryId) ? categoryId : ''),
    [categoryId, currentCategoryIds],
  )
  const selectedCategory = useMemo(
    () => (currentDisciplineGroup?.categories ?? []).find((c) => c.id === validCategoryId) ?? null,
    [currentDisciplineGroup, validCategoryId],
  )

  // Does this discipline have age-graded categories (Youth / Junior / Masters)?
  const hasAgeCategories = useMemo(
    () => disciplineHasAgeCategories(currentCategoryNames),
    [currentCategoryNames],
  )

  // Race age computed from the DOB field (December 31 of competition year rule)
  const raceAge = useMemo(() => computeRaceAge(form.birthDate), [form.birthDate])

  // The category that best matches the rider's age (only meaningful when discipline has age cats)
  const suggestedAgeCategory = useMemo(() => {
    if (!hasAgeCategories || raceAge === null) return ''
    return resolveAgeCategoryByKeyword(raceAge, currentCategoryNames)
  }, [hasAgeCategories, raceAge, currentCategoryNames])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async () => {
    setFieldErrors({})
    setError(null)

    const errors: Record<string, string> = {}
    if (!form.email) errors.email = 'Email is required.'
    if (!form.firstName) errors.firstName = 'First name is required.'
    if (!form.lastName) errors.lastName = 'Last name is required.'
    if (!form.gender) errors.gender = 'Please select a gender.'
    if (!form.birthDate) errors.birthDate = 'Date of birth is required.'
    if (!form.address) errors.address = 'Address is required.'
    if (!form.contactNumber) errors.contactNumber = 'Contact number is required.'
    if (!form.emergencyContactName) errors.emergencyContactName = 'Emergency contact name is required.'
    if (!form.emergencyContactNumber) errors.emergencyContactNumber = 'Emergency contact number is required.'
    if (!validCategoryId) errors.category = 'Please select a category.'
    if (!shirtSize) errors.shirtSize = 'Please select a shirt size.'
    if (!selectedEvent) errors.event = 'Please select an event.'
    if (selectedEventTypeSlugs.length === 0) errors.eventTypes = 'Please select at least one event type.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const raceTypeLabel = selectedEventTypeSlugs
        .map((slug) => eventTypes.find((t) => t.slug === slug)?.name ?? formatSlug(slug))
        .join(', ')

      saveRegistrationCheckoutPayload({
        raceType: raceTypeLabel || (selectedEvent!.race_type ?? ''),
        eventId: selectedEvent!.id,
        raceCategoryId: validCategoryId,
        registrationFee: totalFee,
        registrantEmail: form.email,
        eventTitle: selectedEvent?.title ?? '',
        raceTypeLabel: selectedEvent?.race_type ?? '',
        rider: {
          firstName: form.firstName,
          lastName: form.lastName,
          gender: form.gender,
          birthDate: form.birthDate,
          birthYear: form.birthDate ? new Date(form.birthDate).getFullYear() : null,
          address: form.address,
          contactNumber: form.contactNumber,
          emergencyContactName: form.emergencyContactName,
          emergencyContactNumber: form.emergencyContactNumber,
          teamName: form.teamName,
          discipline: form.discipline,
          ageCategory: selectedCategory?.category_name ?? '',
          jerseySize: shirtSize,
        },
      })

      navigate('/register/payment')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <section className="bg-white px-4 py-8 text-slate-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-[760px] space-y-5 sm:space-y-6">
        <img src="/hna-banner-1.png" alt="Hari ng Ahon 2026 banner" className="w-full rounded-lg object-cover" />

        <Link to="/register/info" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
          &larr; Back
        </Link>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">Registration</h1>
          <p className="text-sm text-slate-600">Fill up the rider information and choose your category.</p>
        </div>

        {/* ── Event & Event Types Card ────────────────────────────────────── */}
        <div className={`${cardClass} space-y-4`}>
          {/* Event selector (hidden visually if only one event) */}
          {events.length > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-900">
                Event <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-col gap-2">
                {eventsLoading ? <p className="text-xs text-slate-500">Loading events…</p> : null}
                {events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setEventId(event.id)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm ${eventId === event.id ? 'border-[#cfae3f] bg-[#fff6d6]' : 'border-slate-300 bg-white'
                      }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-sm border ${eventId === event.id ? 'bg-[#cfae3f] border-[#cfae3f]' : 'border-slate-400'
                        }`}
                    />
                    <span className="flex-1">{event.title}</span>
                    <span className="text-xs text-slate-500">₱{Number(event.registration_fee ?? 0).toLocaleString()} / type</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Event Types as checkboxes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-900">
              Event Type <span className="text-rose-500">*</span>
            </label>
            <p className="text-xs text-slate-500">Select one or more event types to join.</p>

            {eventsLoading || eventTypesLoading ? (
              <p className="text-xs text-slate-500">Loading event types…</p>
            ) : eventTypes.length === 0 ? (
              <p className="text-xs text-rose-600">No event types available for this event.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {eventTypes.map((et) => {
                  const checked = selectedEventTypeSlugs.includes(et.slug)
                  return (
                    <button
                      key={et.slug}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleEventType(et.slug)}
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${checked
                          ? 'border-[#cfae3f] bg-[#fff6d6] text-slate-900'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-[#cfae3f]'
                        }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex h-4 w-4 items-center justify-center rounded border text-xs ${checked ? 'border-[#cfae3f] bg-[#cfae3f] text-black' : 'border-slate-300 bg-white'
                          }`}
                      >
                        {checked ? '✓' : ''}
                      </span>
                      {et.name}
                    </button>
                  )
                })}
              </div>
            )}
            {fieldErrors.eventTypes && (
              <p className="text-xs text-rose-500">{fieldErrors.eventTypes}</p>
            )}
          </div>

          {/* Dynamic fee preview */}
          {selectedEventTypeSlugs.length > 0 && (
            <div className="rounded-lg border border-[#cfae3f]/40 bg-[#fff6d6] px-4 py-3">
              <p className="text-xs text-slate-600">
                {selectedEventTypeSlugs.length} event type{selectedEventTypeSlugs.length > 1 ? 's' : ''} selected
                &nbsp;×&nbsp;₱{registrationFee.toLocaleString()}
              </p>
              <p className="mt-0.5 text-base font-semibold text-slate-900">
                Total: ₱{totalFee.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* ── Personal Info Card ─────────────────────────────────────────── */}
        <div className={`${cardClass} grid grid-cols-1 gap-4 md:grid-cols-2`}>
          <Field
            label={<>Email <span className="text-rose-500">*</span></>}
            type="email"
            value={form.email}
            placeholder="you@gmail.com"
            error={fieldErrors.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
          />
          <Field
            label={<>First Name <span className="text-rose-500">*</span></>}
            value={form.firstName}
            placeholder="Juan"
            error={fieldErrors.firstName}
            onChange={(v) => setForm((p) => ({ ...p, firstName: v }))}
          />
          <Field
            label={<>Last Name <span className="text-rose-500">*</span></>}
            value={form.lastName}
            placeholder="Dela Cruz"
            error={fieldErrors.lastName}
            onChange={(v) => setForm((p) => ({ ...p, lastName: v }))}
          />
          <SelectField
            label={<>Gender <span className="text-rose-500">*</span></>}
            value={form.gender}
            options={['Male', 'Female']}
            placeholder="Select gender"
            error={fieldErrors.gender}
            onChange={(v) => setForm((p) => ({ ...p, gender: v }))}
          />
          <Field
            label={<>Date Of Birth <span className="text-rose-500">*</span></>}
            type="date"
            value={form.birthDate}
            error={fieldErrors.birthDate}
            onChange={(v) => setForm((p) => ({ ...p, birthDate: v }))}
          />
          <Field
            label={<>Address <span className="text-rose-500">*</span></>}
            value={form.address}
            placeholder="Baguio City"
            error={fieldErrors.address}
            onChange={(v) => setForm((p) => ({ ...p, address: v }))}
          />
          <Field
            label={<>Contact Number <span className="text-rose-500">*</span></>}
            value={form.contactNumber}
            placeholder="+63 9XX XXX XXXX"
            error={fieldErrors.contactNumber}
            onChange={(v) => setForm((p) => ({ ...p, contactNumber: v }))}
          />
          <Field
            label={<>Emergency Contact <span className="text-rose-500">*</span></>}
            value={form.emergencyContactName}
            placeholder="Full name"
            error={fieldErrors.emergencyContactName}
            onChange={(v) => setForm((p) => ({ ...p, emergencyContactName: v }))}
          />
          <Field
            label={<>Emergency Contact Number <span className="text-rose-500">*</span></>}
            value={form.emergencyContactNumber}
            placeholder="+63 9XX XXX XXXX"
            error={fieldErrors.emergencyContactNumber}
            onChange={(v) => setForm((p) => ({ ...p, emergencyContactNumber: v }))}
          />
          <Field
            label="Team Name"
            value={form.teamName}
            placeholder="Optional"
            onChange={(v) => setForm((p) => ({ ...p, teamName: v }))}
          />
        </div>

        {/* ── Discipline & Category Card ─────────────────────────────────── */}
        <div className={`${cardClass} space-y-4`}>
          <div>
            <label className="text-sm font-semibold text-slate-900">
              Category <span className="text-rose-500">*</span>
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
              *The organizers reserve the right to merge categories with less than 10 participants.
            </p>
          </div>

          {categoriesLoading ? (
             <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 1 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
                  <div className="h-4 w-32 rounded bg-slate-200 mb-2" />
                  <div className="h-3 w-40 rounded bg-slate-100 mb-4" />
                  <div className="space-y-2">
                    {Array.from({ length: 1 }).map((_, j) => (
                      <div key={j} className="h-3 w-3/4 rounded bg-slate-100" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : disciplineGroups.length === 0 ? (
            <p className="text-xs text-rose-600">No categories configured for this event.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Discipline selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Discipline <span className="text-rose-500">*</span>
                </label>
                <select
                  value={form.discipline}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, discipline: e.target.value }))
                    setCategoryId('')
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#cfae3f]"
                >
                  {disciplineGroups.map((g) => (
                    <option key={g.discipline} value={g.discipline}>
                      {g.discipline}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">
                  Age / Class Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={validCategoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#cfae3f] ${fieldErrors.category ? 'border-rose-400' : 'border-slate-300'
                    }`}
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {currentDisciplineGroup?.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.category_name}
                    </option>
                  ))}
                </select>
                {fieldErrors.category && (
                  <p className="text-xs text-rose-500">{fieldErrors.category}</p>
                )}
              </div>
            </div>
          )}

          {/* Age-based category suggestion — only shown for age-graded disciplines */}
          {hasAgeCategories && form.birthDate && suggestedAgeCategory && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
              <p className="text-xs text-slate-600">
                Based on your date of birth, your race age on Dec 31, {new Date().getFullYear()} is{' '}
                <span className="font-semibold text-slate-900">{raceAge}</span>.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs text-slate-700">
                  Suggested category:{' '}
                  <span className="font-semibold text-slate-900">{suggestedAgeCategory}</span>
                </p>
                {selectedCategory?.category_name !== suggestedAgeCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      const match = (currentDisciplineGroup?.categories ?? []).find((cat) => cat.category_name === suggestedAgeCategory)
                      if (match) setCategoryId(match.id)
                    }}
                    className="rounded-md bg-[#1e4a8e] px-3 py-1 text-xs font-semibold text-white hover:bg-[#163b72] transition"
                  >
                    Use this category
                  </button>
                )}
                {selectedCategory?.category_name === suggestedAgeCategory && (
                  <span className="text-xs font-semibold text-emerald-700">✓ Applied</span>
                )}
              </div>
            </div>
          )}

          {!hasAgeCategories && selectedCategory && (
            <p className="text-xs text-slate-600">
              Selected: <span className="font-semibold text-slate-900">{selectedCategory.category_name}</span>
            </p>
          )}
        </div>

        {/* ── Shirt Size Card ────────────────────────────────────────────── */}
        <div className={`${cardClass} space-y-3`}>
          <label className="text-sm font-semibold text-slate-900">
            Event Shirt <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {shirtSizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setShirtSize(size)}
                className={`min-w-[3rem] rounded-md border px-3 py-2 text-sm sm:min-w-[3.25rem] ${shirtSize === size
                    ? 'border-[#cfae3f] bg-[#fff6d6] text-slate-900'
                    : 'border-slate-300 bg-white text-slate-700 hover:text-slate-900'
                  }`}
              >
                {size}
              </button>
            ))}
          </div>
          {fieldErrors.shirtSize && <p className="text-xs text-rose-500">{fieldErrors.shirtSize}</p>}
        </div>

        {/* ── Fee Summary ────────────────────────────────────────────────── */}
        {selectedEventTypeSlugs.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-800">Registration Summary</p>
            <div className="mt-2 space-y-1 text-slate-600">
              <p>Event: <span className="font-medium text-slate-900">{selectedEvent?.title ?? '—'}</span></p>
              <p>
                Types:{' '}
                <span className="font-medium text-slate-900">
                  {selectedEventTypeSlugs
                    .map((slug) => eventTypes.find((t) => t.slug === slug)?.name ?? formatSlug(slug))
                    .join(', ')}
                </span>
              </p>
              <p>
                Total Fee:{' '}
                <span className="font-semibold text-slate-900">₱{totalFee.toLocaleString()}</span>
                {selectedEventTypeSlugs.length > 1 && (
                  <span className="ml-1 text-xs text-slate-400">
                    ({selectedEventTypeSlugs.length} × ₱{registrationFee.toLocaleString()})
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="pt-2">
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-md bg-[#cfae3f] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#dab852] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {submitting ? 'Saving…' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── Field Components ─────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
}: {
  label: React.ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  error?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <input
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#cfae3f] sm:py-2 ${error ? 'border-rose-400' : 'border-slate-300'
          }`}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  error,
  placeholder,
}: {
  label: React.ReactNode
  value: string
  options: string[]
  onChange: (value: string) => void
  error?: string
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-900">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#cfae3f] sm:py-2 ${error ? 'border-rose-400' : 'border-slate-300'
          }`}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  )
}