import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays, CheckCircle2, Clock3, Filter, MapPinned,
  Pencil, Plus, Search, Trash2, UploadCloud, Users, X, ChevronLeft,
  ChevronRight, Copy, Trophy, UserCheck, Image, CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { adminModulesApi } from '../../services/adminModulesApi'
import { ModuleShell, formatDate, formatMoney, useModuleLoader } from './admin-module-shared'

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4

interface DisciplineCategory {
  id: string
  name: string
  code: string
  riderLimit: string
  active: boolean
}

interface Discipline {
  id: string
  name: string
  categories: DisciplineCategory[]
}

interface EventType {
  slug: string
  name: string
  active: boolean
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function combineDateAndTime(dateValue: string, timeValue?: string) {
  if (!dateValue) return null
  const finalTime = timeValue && timeValue.trim().length > 0 ? timeValue : '00:00'
  return new Date(`${dateValue}T${finalTime}:00`).toISOString()
}

async function uploadToBucket(bucket: string, file: File | null) {
  if (!file) return null
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `events/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
  if (error) throw error
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function formatTime(value: unknown) {
  if (!value) return '—'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function toDateInputValue(value: unknown) {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function toTimeInputValue(value: unknown) {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(11, 16)
}

function toDateTimeLocalValue(value: unknown) {
  if (!value) return ''
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  return `${date.toISOString().slice(0, 10)}T${date.toISOString().slice(11, 16)}`
}

/** Venue is saved as "Place, City" when city is set — split for editing. */
function parseVenueCity(storedVenue: string): { venue: string; city: string } {
  const v = String(storedVenue ?? '').trim()
  const idx = v.lastIndexOf(', ')
  if (idx <= 0) return { venue: v, city: '' }
  return { venue: v.slice(0, idx).trim(), city: v.slice(idx + 2).trim() }
}

/** Multiple event types are stored as comma-separated slugs in `race_type`. */
function parseRaceTypeSlugs(row: Record<string, unknown> | null | undefined): string[] {
  if (!row) return []
  const multi = row.race_types
  if (Array.isArray(multi)) return multi.map(String).map((s) => s.trim()).filter(Boolean)
  const raw = String(row.race_type ?? '').trim()
  if (!raw) return []
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function parsePrizePoolFields(prizePool: unknown): { totalPrize: string; prizeDesc: string } {
  const ppStr = typeof prizePool === 'string' ? prizePool.trim() : ''
  if (!ppStr) return { totalPrize: '', prizeDesc: '' }
  if (ppStr.startsWith('Total:')) {
    const rest = ppStr.replace(/^Total:\s*/i, '')
    const pipe = rest.indexOf('|')
    if (pipe >= 0) {
      return {
        totalPrize: rest.slice(0, pipe).trim(),
        prizeDesc: rest.slice(pipe + 1).trim(),
      }
    }
    return { totalPrize: rest, prizeDesc: '' }
  }
  return { totalPrize: '', prizeDesc: ppStr }
}

// ─── Step indicator ──────────────────────────────────────────────────────────
const STEPS = ['Event Information', 'Disciplines & Categories', 'Additional Information', 'Review & Publish']

function StepTab({ step, current }: { step: number; current: Step }) {
  const done = step < current
  const active = step === current
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${active ? 'border-blue-600 text-blue-700' : done ? 'border-blue-300 text-blue-500' : 'border-transparent text-slate-400'}`}>
      {done ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"><CheckCheck className="h-3 w-3" /></span>
      ) : (
        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{step}</span>
      )}
      {STEPS[step - 1]}
    </div>
  )
}

function UploadField({
  title,
  subtitle,
  accept = 'image/*',
  compact = false,
  value,
  onChange,
  currentUrl,
}: {
  title: string
  subtitle: string
  accept?: string
  compact?: boolean
  value: File | null
  onChange: (file: File | null) => void
  currentUrl?: string | null
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  // New file preview takes priority; existing remote URL gets a cache-busting param
  const displayUrl = previewUrl ?? (currentUrl ? `${currentUrl}?t=${Date.now()}` : null)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    onChange(files[0])
  }

  if (compact) {
    return (
      <div className="space-y-1.5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          className={`flex h-14 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 text-center transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'}`}
        >
          <UploadCloud className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-xs text-slate-600">{title}</p>
            <p className="text-[10px] text-slate-400">{value ? value.name : subtitle}</p>
          </div>
        </div>
        {displayUrl && (
          <div className="relative h-20 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            <img
              src={displayUrl}
              alt="Preview"
              className="h-full w-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-1 top-1 rounded-full bg-white/80 p-0.5 text-slate-500 shadow hover:bg-white hover:text-red-500 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {displayUrl ? (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100" style={{ minHeight: '13rem' }}>
          <img
            src={displayUrl}
            alt="Preview"
            className="h-full w-full object-cover"
            style={{ minHeight: '13rem', maxHeight: '18rem' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/40 to-transparent p-3">
            <p className="max-w-[70%] truncate text-[10px] text-white/80">{value ? value.name : 'Current image'}</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-white transition-colors"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded-md bg-red-500/90 px-2 py-1 text-[10px] font-semibold text-white hover:bg-red-600 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
          className={`flex min-h-52 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 text-center transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'}`}
        >
          <UploadCloud className="h-9 w-9 text-slate-400" />
          <div>
            <p className="text-sm text-slate-600">{title}</p>
            <p className="text-[10px] text-slate-400">{subtitle}</p>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  )
}

// ─── Step 1 ──────────────────────────────────────────────────────────────────
function Step1({
  form,
  setForm,
  posterFile,
  setPosterFile,
  routeMapFile,
  setRouteMapFile,
  currentPosterUrl,
  currentRouteMapUrl,
  eventTypes,
  eventTypesLoading,
  onAddEventType,
}: {
  form: any
  setForm: any
  posterFile: File | null
  setPosterFile: (file: File | null) => void
  routeMapFile: File | null
  setRouteMapFile: (file: File | null) => void
  currentPosterUrl?: string | null
  currentRouteMapUrl?: string | null
  eventTypes: EventType[]
  eventTypesLoading: boolean
  onAddEventType: () => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-semibold text-slate-800">Basic Information</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <p className="mb-1 text-xs font-medium text-slate-600">Event Title <span className="text-red-500">*</span></p>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter event title" value={form.title} onChange={(e) => setForm((v: any) => ({ ...v, title: e.target.value }))} />
            </label>
            <label className="block">
              <p className="mb-1 text-xs font-medium text-slate-600">Event Description <span className="text-red-500">*</span></p>
              <textarea
                className="min-h-[7rem] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                placeholder="Tell us about your event..."
                value={form.description}
                onChange={(e) => setForm((v: any) => ({ ...v, description: e.target.value }))}
              />
              <p className="mt-0.5 text-right text-[10px] text-slate-400">{form.description.length} / 1000</p>
            </label>
            <label className="block">
              <p className="mb-1 text-xs font-medium text-slate-600">Event Type <span className="text-red-500">*</span></p>
              <div className="space-y-2">
                {eventTypesLoading ? <p className="text-xs text-slate-500">Loading event types…</p> : null}
                <div className="flex flex-wrap items-center gap-3">
                  {eventTypes.map((t) => {
                    const uiSelected: string[] = Array.isArray(form.race_types) ? (form.race_types as string[]) : []
                    const checked = uiSelected.includes(t.slug)
                      ? true
                      : (!uiSelected.length && String(form.race_type ?? '') === t.slug)
                    return (
                      <label
                        key={t.slug}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          name="event_type"
                          checked={checked}
                          onChange={(e) => {
                            setForm((v: any) => {
                              const prev: string[] = Array.isArray(v.race_types) ? v.race_types : []
                              const set = new Set(prev)
                              if (e.target.checked) set.add(t.slug)
                              else set.delete(t.slug)
                              const next = Array.from(set)

                              // `race_type` stores comma-separated slugs; primary slug is first for legacy lookups.
                              const nextRaceType = next.length ? next[0] : ''
                              return { ...v, race_types: next, race_type: nextRaceType }
                            })
                          }}
                          disabled={eventTypesLoading}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="whitespace-nowrap">{t.name}</span>
                      </label>
                    )
                  })}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onAddEventType()}
                    disabled={eventTypesLoading}
                    className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Add new event type"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="ml-2 text-xs font-semibold">Add</span>
                  </button>
                </div>
              </div>
            </label>
            <label className="block">
              <p className="mb-1 text-xs font-medium text-slate-600">Registration Fee (PHP)</p>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                type="number"
                min="0"
                value={form.registration_fee}
                onChange={(e) => setForm((v: any) => ({ ...v, registration_fee: e.target.value }))}
              />
            </label>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-600">Event Poster / Banner <span className="text-red-500">*</span></p>
            <UploadField
              title="Drag and drop image here"
              subtitle="Recommended size: 1200x628px (2:1), JPG/PNG up to 5MB"
              value={posterFile}
              onChange={setPosterFile}
              currentUrl={currentPosterUrl}
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-800">Date, Time & Location</p>
        <div className="grid gap-3 md:grid-cols-3">
          <label>
            <p className="mb-1 text-xs font-medium text-slate-600">Event Date <span className="text-red-500">*</span></p>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" type="date" value={form.event_date} onChange={(e) => setForm((v: any) => ({ ...v, event_date: e.target.value }))} />
          </label>
          <label>
            <p className="mb-1 text-xs font-medium text-slate-600">Start Time <span className="text-red-500">*</span></p>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" type="time" value={form.start_time} onChange={(e) => setForm((v: any) => ({ ...v, start_time: e.target.value }))} />
          </label>
          <label>
            <p className="mb-1 text-xs font-medium text-slate-600">End Time <span className="text-red-500">*</span></p>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" type="time" value={form.end_time} onChange={(e) => setForm((v: any) => ({ ...v, end_time: e.target.value }))} />
          </label>
          <label className="md:col-span-2">
            <p className="mb-1 text-xs font-medium text-slate-600">Venue / Location <span className="text-red-500">*</span></p>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter venue or location" value={form.venue} onChange={(e) => setForm((v: any) => ({ ...v, venue: e.target.value }))} />
          </label>
          <label>
            <p className="mb-1 text-xs font-medium text-slate-600">City / Province <span className="text-red-500">*</span></p>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter city or province" value={form.city} onChange={(e) => setForm((v: any) => ({ ...v, city: e.target.value }))} />
          </label>
          <label>
            <p className="mb-1 text-xs font-medium text-slate-600">Route Map (Optional)</p>
            <UploadField
              title="Upload route map image"
              subtitle="PNG, JPG up to 5MB"
              compact
              value={routeMapFile}
              onChange={setRouteMapFile}
              currentUrl={currentRouteMapUrl}
            />
          </label>
          <label className="md:col-span-2">
            <p className="mb-1 text-xs font-medium text-slate-600">Google Maps Link (Optional)</p>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="https://maps.google.com/..." value={form.google_maps_link} onChange={(e) => setForm((v: any) => ({ ...v, google_maps_link: e.target.value }))} />
            <p className="mt-0.5 text-[10px] text-slate-400">Paste a Google Maps link for your event venue or route.</p>
          </label>
          <label className="md:col-span-2">
            <p className="mb-1 text-xs font-medium text-slate-600">Registration Deadline <span className="text-red-500">*</span></p>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              type="datetime-local"
              value={form.registration_deadline}
              onChange={(e) => setForm((v: any) => ({ ...v, registration_deadline: e.target.value }))}
            />
          </label>
        </div>
      </div>
    </div>
  )
}

// ─── Step 2 ──────────────────────────────────────────────────────────────────
const BIKE_DISCIPLINE_ICONS: Record<string, string> = {
  'Road Bike': '🚴',
  'Mountain Bike': '🚵',
  MTB: '🚵',
  Gravel: '🚵',
  'Gravel Bike': '🚵',
  'E-Bike (Open)': '⚡',
  Mixed: '🎽',
}

const CATEGORY_PREVIEW_LIMIT = 3

function Step2({
  disciplines,
  setDisciplines,
  disciplinesLoading,
}: {
  disciplines: Discipline[]
  setDisciplines: React.Dispatch<React.SetStateAction<Discipline[]>>
  disciplinesLoading?: boolean
}) {
  const [categoriesExpandedByDiscipline, setCategoriesExpandedByDiscipline] = useState<Record<string, boolean>>({})

  const addDiscipline = () => {
    setDisciplines((prev) => [...prev, { id: crypto.randomUUID(), name: '', categories: [] }])
  }

  const removeDiscipline = (id: string) => setDisciplines((prev) => prev.filter((d) => d.id !== id))

  const updateDiscipline = (id: string, value: Partial<Discipline>) => {
    setDisciplines((prev) => prev.map((d) => (d.id === id ? { ...d, ...value } : d)))
  }

  const addCategoryToDiscipline = (disciplineId: string) => {
    setDisciplines((prev) =>
      prev.map((d) =>
        d.id !== disciplineId
          ? d
          : {
            ...d,
            categories: [
              ...d.categories,
              { id: crypto.randomUUID(), name: '', code: '', riderLimit: '', active: true },
            ],
          },
      ),
    )
  }

  const removeCategoryFromDiscipline = (disciplineId: string, categoryId: string) => {
    setDisciplines((prev) =>
      prev.map((d) => (d.id !== disciplineId ? d : { ...d, categories: d.categories.filter((c) => c.id !== categoryId) })),
    )
  }

  const updateCategoryInDiscipline = (
    disciplineId: string,
    categoryId: string,
    value: Partial<DisciplineCategory>,
  ) => {
    setDisciplines((prev) =>
      prev.map((d) =>
        d.id !== disciplineId
          ? d
          : {
            ...d,
            categories: d.categories.map((c) => (c.id === categoryId ? { ...c, ...value } : c)),
          },
      ),
    )
  }

  const totalCategories = disciplines.reduce((sum, d) => sum + d.categories.length, 0)
  const totalRiderLimit = disciplines.reduce(
    (sum, d) => sum + d.categories.reduce((s, c) => s + Number(c.riderLimit || 0), 0),
    0,
  )

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Event Disciplines & Categories</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Add disciplines first, then add categories under each discipline. Registration fee is set in Step 1.
          </p>
        </div>
        <button
          type="button"
          onClick={addDiscipline}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Discipline
        </button>
      </div>

      {disciplinesLoading ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Loading disciplines & categories…
        </div>
      ) : null}

      <div className="space-y-3">
        {disciplines.map((disc) => (
          <div key={disc.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{BIKE_DISCIPLINE_ICONS[disc.name] ?? '🚴'}</span>
                  <p className="text-sm font-semibold text-slate-800">{disc.name || 'New Discipline'}</p>
                </div>
                <label>
                  <p className="mb-1 text-[10px] font-medium text-slate-500">
                    Discipline Name <span className="text-red-500">*</span>
                  </p>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Mountain Bike"
                    value={disc.name}
                    onChange={(e) => updateDiscipline(disc.id, { name: e.target.value })}
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => removeDiscipline(disc.id)}
                className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">Categories</p>
              <button
                type="button"
                onClick={() => addCategoryToDiscipline(disc.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Category
              </button>
            </div>

            {disc.categories.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                No categories yet. Add at least one category under this discipline.
              </div>
            ) : (
              <div className="space-y-3">
                {(categoriesExpandedByDiscipline[disc.id]
                  ? disc.categories
                  : disc.categories.slice(0, CATEGORY_PREVIEW_LIMIT)
                ).map((cat) => (
                  <div key={cat.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="grid grid-cols-3 gap-3">
                      <label>
                        <p className="mb-1 text-[10px] font-medium text-slate-500">
                          Category Name <span className="text-red-500">*</span>
                        </p>
                        <input
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. Youth / Open / Heavyweight"
                          value={cat.name}
                          onChange={(e) => updateCategoryInDiscipline(disc.id, cat.id, { name: e.target.value })}
                        />
                      </label>
                      <label>
                        <p className="mb-1 text-[10px] font-medium text-slate-500">Category Code</p>
                        <input
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          placeholder="e.g. YOUTH_OPEN"
                          value={cat.code}
                          onChange={(e) => updateCategoryInDiscipline(disc.id, cat.id, { code: e.target.value })}
                        />
                      </label>
                      <label>
                        <p className="mb-1 text-[10px] font-medium text-slate-500">Rider Limit</p>
                        <input
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          type="number"
                          placeholder="150"
                          value={cat.riderLimit}
                          onChange={(e) => updateCategoryInDiscipline(disc.id, cat.id, { riderLimit: e.target.value })}
                        />
                      </label>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateCategoryInDiscipline(disc.id, cat.id, { active: !cat.active })}
                          className={`relative h-5 w-9 rounded-full transition-colors ${cat.active ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${cat.active ? 'translate-x-4' : ''}`}
                          />
                        </button>
                        <span className="text-xs text-slate-600">{cat.active ? 'Active' : 'Inactive'}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeCategoryFromDiscipline(disc.id, cat.id)}
                        className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {disc.categories.length > CATEGORY_PREVIEW_LIMIT ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCategoriesExpandedByDiscipline((prev) => ({
                        ...prev,
                        [disc.id]: !prev[disc.id],
                      }))
                    }
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {categoriesExpandedByDiscipline[disc.id]
                      ? 'See less'
                      : `See more (${disc.categories.length - CATEGORY_PREVIEW_LIMIT})`}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>

      {disciplines.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
          ℹ️ Rider limit is the maximum number of participants allowed for each category.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Summary</p>
          <p className="text-xs text-slate-500">Total Categories: {totalCategories}</p>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-600">Total Riders (All Categories)</p>
          <p className="text-sm font-bold text-blue-600">{totalRiderLimit.toLocaleString()}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Step 3 ──────────────────────────────────────────────────────────────────
function Step3({
  extra,
  setExtra,
  organizerLogoFile,
  setOrganizerLogoFile,
  currentOrgLogoUrl,
}: {
  extra: any
  setExtra: any
  organizerLogoFile: File | null
  setOrganizerLogoFile: (file: File | null) => void
  currentOrgLogoUrl?: string | null
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-sm font-semibold text-slate-800">Prize Pool</p>
        <p className="mb-3 text-xs text-slate-500">Add prize pool details for your event (optional).</p>
        <div className="space-y-2 mb-3">
          {['none', 'has'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="prizePool" value={opt} checked={extra.prizePool === opt} onChange={() => setExtra((v: any) => ({ ...v, prizePool: opt }))} className="accent-blue-600" />
              <span className="text-sm text-slate-700">{opt === 'none' ? 'No prize pool' : 'Has prize pool'}</span>
            </label>
          ))}
        </div>
        {extra.prizePool === 'has' && (
          <div className="space-y-3">
            <label>
              <p className="mb-1 text-xs font-medium text-slate-600">Total Prize Pool (PHP)</p>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="50,000" value={extra.totalPrize} onChange={(e) => setExtra((v: any) => ({ ...v, totalPrize: e.target.value }))} />
            </label>
            <label>
              <p className="mb-1 text-xs font-medium text-slate-600">Prize Pool Description (Optional)</p>
              <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none min-h-16" placeholder="e.g., Cash prizes for top 3 finishers per category." value={extra.prizeDesc} onChange={(e) => setExtra((v: any) => ({ ...v, prizeDesc: e.target.value }))} />
            </label>
          </div>
        )}
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-800">Organizer Information</p>
        <div className="space-y-3">
          <label>
            <p className="mb-1 text-xs font-medium text-slate-600">Organizer Name <span className="text-red-500">*</span></p>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="All Out Multisports" value={extra.orgName} onChange={(e) => setExtra((v: any) => ({ ...v, orgName: e.target.value }))} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <p className="mb-1 text-xs font-medium text-slate-600">Contact Email <span className="text-red-500">*</span></p>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="email@example.com" value={extra.orgEmail} onChange={(e) => setExtra((v: any) => ({ ...v, orgEmail: e.target.value }))} />
            </label>
            <label>
              <p className="mb-1 text-xs font-medium text-slate-600">Contact Number <span className="text-red-500">*</span></p>
              <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="0917 123 4567" value={extra.orgPhone} onChange={(e) => setExtra((v: any) => ({ ...v, orgPhone: e.target.value }))} />
            </label>
          </div>
          <label>
            <p className="mb-1 text-xs font-medium text-slate-600">Website / Social Media (Optional)</p>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="https://www.example.com" value={extra.orgWebsite} onChange={(e) => setExtra((v: any) => ({ ...v, orgWebsite: e.target.value }))} />
          </label>
          <label>
            <p className="mb-1 text-xs font-medium text-slate-600">Organizer Logo (Optional)</p>
            <UploadField
              title="Upload logo"
              subtitle="JPG, PNG up to 2MB"
              compact
              value={organizerLogoFile}
              onChange={setOrganizerLogoFile}
              currentUrl={currentOrgLogoUrl}
            />
          </label>
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-slate-800">Jersey / Bib Claiming Instructions</p>
        <label>
          <p className="mb-1 text-xs font-medium text-slate-600">Instructions <span className="text-red-500">*</span></p>
          <textarea className="min-h-28 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" placeholder="Riders may claim their jerseys and bib numbers on:&#10;&#10;June 14, 2025 (Saturday) | 9:00 AM - 5:00 PM&#10;Burham Park Pavilion, Baguio City&#10;&#10;Please bring a valid ID or confirmation email." value={extra.bibInstructions} onChange={(e) => setExtra((v: any) => ({ ...v, bibInstructions: e.target.value }))} />
          <p className="mt-0.5 text-right text-[10px] text-slate-400">{extra.bibInstructions.length} / 1000</p>
        </label>
      </div>
    </div>
  )
}

// ─── Step 4 ──────────────────────────────────────────────────────────────────
function Step4({
  form,
  disciplines,
  extra,
  posterFile,
  currentPosterUrl,
  routeMapFile,
  currentRouteMapUrl,
  organizerLogoFile,
  currentOrgLogoUrl,
  eventTypes,
}: {
  form: any
  disciplines: Discipline[]
  extra: any
  posterFile?: File | null
  currentPosterUrl?: string | null
  routeMapFile?: File | null
  currentRouteMapUrl?: string | null
  organizerLogoFile?: File | null
  currentOrgLogoUrl?: string | null
  eventTypes: EventType[]
}) {
  const riderLimitTotal = disciplines.reduce(
    (sum, d) => sum + d.categories.reduce((s, c) => s + Number(c.riderLimit || 0), 0),
    0,
  )

  const [posterPreviewUrl, setPosterPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!posterFile) {
      setPosterPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(posterFile)
    setPosterPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [posterFile])

  const displayPosterUrl = posterPreviewUrl ?? currentPosterUrl ?? null

  const [routePreviewUrl, setRoutePreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!routeMapFile) {
      setRoutePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(routeMapFile)
    setRoutePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [routeMapFile])

  const [orgLogoPreviewUrl, setOrgLogoPreviewUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!organizerLogoFile) {
      setOrgLogoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(organizerLogoFile)
    setOrgLogoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [organizerLogoFile])

  const displayRouteUrl = routePreviewUrl ?? currentRouteMapUrl ?? null
  const displayOrgLogoUrl = orgLogoPreviewUrl ?? currentOrgLogoUrl ?? null

  const raceTypeLabels = (() => {
    const slugs: string[] = Array.isArray(form.race_types) && form.race_types.length > 0
      ? (form.race_types as string[])
      : form.race_type
        ? String(form.race_type).split(',').map((s) => s.trim()).filter(Boolean)
        : []
    const nameFor = (slug: string) => eventTypes.find((t) => t.slug === slug)?.name ?? slug
    return slugs.map(nameFor).join(', ') || '—'
  })()

  const [reviewCatExpandedByDiscipline, setReviewCatExpandedByDiscipline] = useState<Record<string, boolean>>({})
  const [posterLoadFailed, setPosterLoadFailed] = useState(false)
  useEffect(() => {
    setPosterLoadFailed(false)
  }, [displayPosterUrl])

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Review Your Event</p>
          <p className="text-xs text-slate-500">Please review all details before publishing your event.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-2">Event poster / banner</p>
        <div className="flex gap-4">
          <div className="h-28 w-24 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
            {displayPosterUrl && !posterLoadFailed ? (
              <img
                src={displayPosterUrl}
                alt="Event poster"
                className="h-full w-full object-cover"
                onError={() => setPosterLoadFailed(true)}
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center gap-1 bg-slate-100 px-1 text-center">
                <Image className="h-6 w-6 text-slate-400" />
                <span className="text-[9px] leading-tight text-slate-500">{displayPosterUrl ? 'Preview unavailable' : 'No image yet'}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs flex-1">
            <div className="col-span-2 sm:col-span-1"><p className="text-slate-500">Event Types</p><p className="font-medium text-slate-800">{raceTypeLabels}</p></div>
              <div><p className="text-slate-500">Date & Start — End</p><p className="font-medium text-slate-800">{form.event_date ? `${form.event_date} · ${form.start_time || '—'} — ${form.end_time || '—'}` : '—'}</p></div>
            <div><p className="text-slate-500">Venue</p><p className="font-medium text-slate-800">{form.venue ? (form.city ? `${form.venue}, ${form.city}` : form.venue) : '—'}</p></div>
              <div><p className="text-slate-500">Registration Deadline</p><p className="font-medium text-slate-800">{form.registration_deadline || '—'}</p></div>
            <div><p className="text-slate-500">Registration Fee</p><p className="font-medium text-slate-800">PHP {Number(form.registration_fee || 0).toLocaleString()}</p></div>
            <div><p className="text-slate-500">Rider Limit</p><p className="font-medium text-slate-800">{riderLimitTotal.toLocaleString()} Riders (All Categories)</p></div>
            <div className="col-span-2">
              <p className="text-slate-500">Google Maps</p>
              {form.google_maps_link ? (
                <p className="font-medium text-blue-700 truncate"><a href={form.google_maps_link} target="_blank" rel="noreferrer">{form.google_maps_link}</a></p>
              ) : (
                <p className="font-medium text-slate-400">—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800 mb-3">Route map & organizer logo</p>
        <div className="flex flex-wrap gap-4">
          {displayRouteUrl ? (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Route Map</p>
              <div className="h-24 w-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <img src={displayRouteUrl} alt="Route map" className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Route Map</p>
              <div className="flex h-24 w-36 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-500 px-2 text-center">
                None uploaded
              </div>
            </div>
          )}
          {displayOrgLogoUrl ? (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Organizer Logo</p>
              <div className="h-24 w-36 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center">
                <img src={displayOrgLogoUrl} alt="Organizer logo" className="max-h-full max-w-full object-contain p-1" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Organizer Logo</p>
              <div className="flex h-24 w-36 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-500 px-2 text-center">
                None uploaded
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800 mb-3">Disciplines & Categories</p>
        {disciplines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            No disciplines/categorizes were added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {disciplines.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-800">{d.name || '—'}</p>
                  <p className="text-[10px] text-slate-500">{d.categories.length} categories</p>
                </div>
                <div className="mt-2 space-y-2">
                  {d.categories.length === 0 ? (
                    <p className="text-xs text-slate-500">No categories.</p>
                  ) : (
                    <>
                      {(reviewCatExpandedByDiscipline[d.id] ? d.categories : d.categories.slice(0, CATEGORY_PREVIEW_LIMIT)).map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 text-xs text-slate-700">
                          <span>{c.name || '—'}</span>
                          <span className="text-slate-500">Limit: {Number(c.riderLimit || 0).toLocaleString()}</span>
                        </div>
                      ))}
                      {d.categories.length > CATEGORY_PREVIEW_LIMIT ? (
                        <button
                          type="button"
                          onClick={() =>
                            setReviewCatExpandedByDiscipline((prev) => ({
                              ...prev,
                              [d.id]: !prev[d.id],
                            }))
                          }
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {reviewCatExpandedByDiscipline[d.id]
                            ? 'See less'
                            : `See more (${d.categories.length - CATEGORY_PREVIEW_LIMIT})`}
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {extra.prizePool === 'has' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3"><Trophy className="h-4 w-4 text-amber-500" /><p className="text-sm font-semibold text-slate-800">Prize Pool</p></div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
            <div><p className="text-slate-500">Total Prize Pool</p><p className="font-medium">PHP {Number(extra.totalPrize || 0).toLocaleString()}</p></div>
            <div><p className="text-slate-500">Description</p><p className="font-medium">{extra.prizeDesc || '—'}</p></div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3"><UserCheck className="h-4 w-4 text-blue-500" /><p className="text-sm font-semibold text-slate-800">Organizer Information</p></div>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
          <div><p className="text-slate-500">Organizer</p><p className="font-medium">{extra.orgName || '—'}</p></div>
          <div><p className="text-slate-500">Contact</p><p className="font-medium">{extra.orgPhone || '—'}</p></div>
          <div><p className="text-slate-500">Email</p><p className="font-medium">{extra.orgEmail || '—'}</p></div>
          <div><p className="text-slate-500">Website / Social</p><p className="font-medium">{extra.orgWebsite || '—'}</p></div>
        </div>
      </div>

      {extra.bibInstructions && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-800 mb-2">Jersey / Bib Claiming Instructions</p>
          <p className="text-xs text-slate-600 whitespace-pre-line">{extra.bibInstructions}</p>
        </div>
      )}
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function CreateEventModal({
  onClose,
  onSave,
  mode = 'create',
  initialEvent,
}: {
  onClose: () => void
  onSave: () => void | Promise<void>
  mode?: 'create' | 'edit'
  initialEvent?: any
}) {
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const initialVenueParts = parseVenueCity(String(initialEvent?.venue ?? ''))
  const initialSlugs = parseRaceTypeSlugs(initialEvent as Record<string, unknown> | undefined)
  const initialPrizeFields = parsePrizePoolFields(initialEvent?.prize_pool)
  const [form, setForm] = useState({
    title: String(initialEvent?.title ?? ''),
    description: String(initialEvent?.description ?? ''),
    race_type: initialSlugs[0] ?? 'itt',
    // Multiple types are stored as comma-separated slugs in `events.race_type`.
    race_types: initialSlugs.length ? initialSlugs : ([] as string[]),
    venue: initialVenueParts.venue,
    city: initialVenueParts.city,
    event_date: toDateInputValue(initialEvent?.event_date),
    start_time: toTimeInputValue(initialEvent?.start_time),
    end_time: toTimeInputValue(initialEvent?.end_time),
    google_maps_link: String(initialEvent?.google_maps_link ?? ''),
    registration_deadline: toDateTimeLocalValue(
      initialEvent?.registration_deadline ?? initialEvent?.registration_closes_at,
    ),
    registration_fee: String(initialEvent?.registration_fee ?? '0'),
  })
  const [eventTypes, setEventTypes] = useState<EventType[]>([])
  const [eventTypesLoading, setEventTypesLoading] = useState(true)

  const loadEventTypes = async () => {
    setEventTypesLoading(true)
    try {
      const { data, error } = await supabase
        .from('event_types')
        .select('slug, name, active')
        .eq('active', true)
        .order('name', { ascending: true })

      if (error) throw error

      setEventTypes((data ?? []) as EventType[])
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load event types.')
      setEventTypes([])
    } finally {
      setEventTypesLoading(false)
    }
  }

  useEffect(() => {
    void loadEventTypes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddEventType = async () => {
    const nameRaw = window.prompt('Enter new event type (e.g., Criterium / ITT / Road Race):')
    const name = String(nameRaw ?? '').trim()
    if (!name) return

    const slug = slugify(name)
    if (!slug) {
      toast.error('Event type name is required.')
      return
    }

    setEventTypesLoading(true)
    try {
      const { error } = await supabase.from('event_types').upsert(
        { name, slug, active: true },
        { onConflict: 'slug' },
      )
      if (error) throw error

      await loadEventTypes()
      setForm((v: any) => {
        const prev = Array.isArray(v.race_types) ? v.race_types : []
        const next = [...new Set([...prev, slug])]
        return { ...v, race_types: next, race_type: next[0] ?? slug }
      })
      toast.success('Event type added.')
    } catch (e) {
      toast.error((e as Error).message || 'Failed to add event type.')
    } finally {
      setEventTypesLoading(false)
    }
  }
  const [disciplines, setDisciplines] = useState<Discipline[]>([])
  const [disciplinesLoading, setDisciplinesLoading] = useState(false)
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [routeMapFile, setRouteMapFile] = useState<File | null>(null)
  const [organizerLogoFile, setOrganizerLogoFile] = useState<File | null>(null)
  const [persistedMedia, setPersistedMedia] = useState(() => ({
    poster_url: (initialEvent?.poster_url as string | undefined) ?? null,
    route_map_url: (initialEvent?.route_map_url as string | undefined) ?? null,
    banner_url: (initialEvent?.banner_url as string | undefined) ?? null,
    slug: (initialEvent?.slug as string | undefined) ?? null,
  }))
  const [extra, setExtra] = useState({
    prizePool: initialEvent?.prize_pool ? 'has' : 'none',
    totalPrize: initialPrizeFields.totalPrize,
    prizeDesc: initialPrizeFields.prizeDesc,
    orgName: String(initialEvent?.organizer_name ?? ''),
    orgEmail: String(initialEvent?.organizer_email ?? ''),
    orgPhone: String(initialEvent?.organizer_contact ?? ''),
    orgWebsite: String(initialEvent?.organizer_website ?? ''),
    bibInstructions: String(initialEvent?.bib_claim_instructions ?? ''),
  })

  const isLastStep = step === 4

  const loadDisciplinesForEvent = async (eventId: string) => {
    setDisciplinesLoading(true)
    try {
      const { data, error } = await supabase
        .from('race_categories')
        .select('id, discipline, category_name, code, rider_limit, active')
        .eq('event_id', eventId)

      if (error) throw error

      const rows = (data ?? []) as Array<Record<string, unknown>>

      const grouped = new Map<string, Discipline>()
      for (const row of rows) {
        const disciplineName = String(row.discipline ?? '').trim() || 'General'
        const categoryName = String(row.category_name ?? '').trim()
        if (!categoryName) continue

        const riderLimitValue = row.rider_limit ?? 0
        const active = row.active === undefined ? true : Boolean(row.active)
        const categoryId = String(row.id ?? crypto.randomUUID())

        if (!grouped.has(disciplineName)) {
          grouped.set(disciplineName, { id: crypto.randomUUID(), name: disciplineName, categories: [] })
        }

        const disc = grouped.get(disciplineName)!
        disc.categories.push({
          id: categoryId,
          name: categoryName,
          code: String(row.code ?? ''),
          riderLimit: String(riderLimitValue ?? ''),
          active,
        })
      }

      setDisciplines(Array.from(grouped.values()))
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load disciplines/categories.')
      setDisciplines([])
    } finally {
      setDisciplinesLoading(false)
    }
  }

  useEffect(() => {
    if (mode !== 'edit') return
    const eventId = initialEvent?.id ? String(initialEvent.id) : ''
    if (!eventId) return
    void loadDisciplinesForEvent(eventId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialEvent?.id])

  useEffect(() => {
    setPersistedMedia({
      poster_url: (initialEvent?.poster_url as string | undefined) ?? null,
      route_map_url: (initialEvent?.route_map_url as string | undefined) ?? null,
      banner_url: (initialEvent?.banner_url as string | undefined) ?? null,
      slug: (initialEvent?.slug as string | undefined) ?? null,
    })
  }, [initialEvent?.id])

  useEffect(() => {
    if (mode !== 'edit' || !initialEvent?.id) return
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.from('events').select('*').eq('id', String(initialEvent.id)).maybeSingle()
      if (cancelled || error || !data) return
      const row = data as Record<string, unknown>
      const slugs = parseRaceTypeSlugs(row)
      const venueParts = parseVenueCity(String(row.venue ?? ''))
      const pp = parsePrizePoolFields(row.prize_pool)
      setPersistedMedia({
        poster_url: row.poster_url ? String(row.poster_url) : null,
        route_map_url: row.route_map_url ? String(row.route_map_url) : null,
        banner_url: row.banner_url ? String(row.banner_url) : null,
        slug: row.slug ? String(row.slug) : null,
      })
      setForm({
        title: String(row.title ?? ''),
        description: String(row.description ?? ''),
        race_type: slugs[0] ?? 'itt',
        race_types: slugs.length ? slugs : [],
        venue: venueParts.venue,
        city: venueParts.city,
        event_date: toDateInputValue(row.event_date),
        start_time: toTimeInputValue(row.start_time),
        end_time: toTimeInputValue(row.end_time),
        google_maps_link: String(row.google_maps_link ?? ''),
        registration_deadline: toDateTimeLocalValue(row.registration_deadline ?? row.registration_closes_at),
        registration_fee: String(row.registration_fee ?? '0'),
      })
      setExtra({
        prizePool: row.prize_pool ? 'has' : 'none',
        totalPrize: pp.totalPrize,
        prizeDesc: pp.prizeDesc,
        orgName: String(row.organizer_name ?? ''),
        orgEmail: String(row.organizer_email ?? ''),
        orgPhone: String(row.organizer_contact ?? ''),
        orgWebsite: String(row.organizer_website ?? ''),
        bibInstructions: String(row.bib_claim_instructions ?? ''),
      })
    })()
    return () => {
      cancelled = true
    }
  }, [mode, initialEvent?.id])

  const handleNext = async () => {
    if (isLastStep) {
      setSaving(true)
      try {
        const selectedTypeSlugs =
          Array.isArray(form.race_types) && form.race_types.length > 0
            ? form.race_types
            : form.race_type
              ? [String(form.race_type)]
              : []
        if (!form.title.trim() || !form.description.trim() || selectedTypeSlugs.length === 0 || !form.venue.trim() || !form.event_date) {
          toast.error('Please complete required event fields before publishing.')
          return
        }

        const eventTimestamp = combineDateAndTime(form.event_date, form.start_time)
        const defaultDeadline = combineDateAndTime(form.event_date, '23:59')
        const deadlineTimestamp = form.registration_deadline
          ? new Date(form.registration_deadline).toISOString()
          : defaultDeadline

        if (!eventTimestamp || !deadlineTimestamp) {
          toast.error('Invalid event date or registration deadline.')
          return
        }

        const uploadedPoster = await uploadToBucket('event-posters', posterFile)
        const uploadedRoute = await uploadToBucket('event-route-maps', routeMapFile)
        const uploadedOrgLogo = await uploadToBucket('organizer-logos', organizerLogoFile)
        const posterUrl = uploadedPoster ?? (mode === 'edit' ? persistedMedia.poster_url : null)
        const routeMapUrl = uploadedRoute ?? (mode === 'edit' ? persistedMedia.route_map_url : null)
        const organizerLogoStoredUrl = uploadedOrgLogo ?? (mode === 'edit' ? persistedMedia.banner_url : null)

        const baseSlug = slugify(form.title) || 'event'
        const eventIdForSave = mode === 'edit' ? String(initialEvent?.id) : crypto.randomUUID()
        const slugValue =
          mode === 'edit' && persistedMedia.slug ? persistedMedia.slug : `${baseSlug}-${Date.now()}`
        const riderLimit = disciplines.reduce(
          (sum, d) => sum + d.categories.reduce((s, c) => s + Number(c.riderLimit || 0), 0),
          0,
        )

        const endTimestamp =
          form.end_time?.trim() ? combineDateAndTime(form.event_date, form.end_time) : null
        const mapsLink = form.google_maps_link.trim()
        const orgWebsite = extra.orgWebsite.trim()

        const payload = {
          title: form.title.trim(),
          description: form.description.trim(),
          race_type: selectedTypeSlugs.join(','),
          venue: form.city ? `${form.venue.trim()}, ${form.city.trim()}` : form.venue.trim(),
          route_map_url: routeMapUrl,
          event_date: eventTimestamp,
          registration_deadline: deadlineTimestamp,
          registration_fee: Number(form.registration_fee || 0),
          prize_pool:
            extra.prizePool === 'has'
              ? `Total: ${extra.totalPrize || '0'} | ${extra.prizeDesc || ''}`.trim()
              : null,
          poster_url: posterUrl,
          slug: slugValue,
          short_description: form.description.trim().slice(0, 160),
          banner_url: organizerLogoStoredUrl,
          registration_closes_at: deadlineTimestamp,
          rider_limit: riderLimit > 0 ? riderLimit : null,
          organizer_name: extra.orgName || null,
          organizer_contact: extra.orgPhone || null,
          organizer_email: extra.orgEmail || null,
          organizer_website: orgWebsite || null,
          bib_claim_instructions: extra.bibInstructions || null,
          start_time: eventTimestamp,
          end_time: endTimestamp,
          google_maps_link: mapsLink || null,
          status: mode === 'edit' ? String(initialEvent?.status ?? 'draft') : 'draft',
          updated_at: new Date().toISOString(),
        }

        const response =
          mode === 'edit'
            ? await supabase.from('events').update(payload).eq('id', eventIdForSave)
            : await supabase.from('events').insert({
                ...payload,
                id: eventIdForSave,
              })

        if (response.error) throw response.error

        // Persist Step 2 categories into race_categories (includes category code).
        const categoryRows = disciplines.flatMap((d) =>
          d.categories.map((c) => ({
            event_id: eventIdForSave,
            discipline: d.name,
            category_name: c.name,
            code: c.code.trim() ? c.code.trim() : null,
            rider_limit: c.riderLimit.trim() ? Number(c.riderLimit) : null,
            active: c.active,
          })),
        )

        const { error: deleteErr } = await supabase.from('race_categories').delete().eq('event_id', eventIdForSave)
        if (deleteErr) throw deleteErr

        if (categoryRows.length > 0) {
          const { error: insertErr } = await supabase.from('race_categories').insert(categoryRows)
          if (insertErr) throw insertErr
        }

        toast.success(mode === 'edit' ? 'Event updated successfully.' : 'Event created successfully.')
        await onSave()
      } catch (error) {
        toast.error((error as Error).message || `Failed to ${mode} event.`)
      } finally {
        setSaving(false)
      }
      return
    }
    setStep((s) => (s + 1) as Step)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <section className="flex h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="text-xl font-semibold text-slate-900">Create New Event</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step tabs */}
        <div className="flex border-b border-slate-100 px-6 gap-1 flex-shrink-0 overflow-x-auto">
          {[1, 2, 3, 4].map((s) => <StepTab key={s} step={s} current={step} />)}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <Step1
              form={form}
              setForm={setForm}
              posterFile={posterFile}
              setPosterFile={setPosterFile}
              routeMapFile={routeMapFile}
              setRouteMapFile={setRouteMapFile}
              currentPosterUrl={persistedMedia.poster_url ?? initialEvent?.poster_url ?? null}
              currentRouteMapUrl={persistedMedia.route_map_url ?? initialEvent?.route_map_url ?? null}
              eventTypes={eventTypes}
              eventTypesLoading={eventTypesLoading}
              onAddEventType={handleAddEventType}
            />
          )}
          {step === 2 && (
            <Step2
              disciplines={disciplines}
              setDisciplines={setDisciplines}
              disciplinesLoading={disciplinesLoading}
            />
          )}
          {step === 3 && (
            <Step3
              extra={extra}
              setExtra={setExtra}
              organizerLogoFile={organizerLogoFile}
              setOrganizerLogoFile={setOrganizerLogoFile}
              currentOrgLogoUrl={persistedMedia.banner_url ?? initialEvent?.banner_url ?? null}
            />
          )}
          {step === 4 && (
            <Step4
              form={form}
              disciplines={disciplines}
              extra={extra}
              posterFile={posterFile}
              currentPosterUrl={persistedMedia.poster_url ?? initialEvent?.poster_url ?? null}
              routeMapFile={routeMapFile}
              currentRouteMapUrl={persistedMedia.route_map_url ?? initialEvent?.route_map_url ?? null}
              organizerLogoFile={organizerLogoFile}
              currentOrgLogoUrl={persistedMedia.banner_url ?? initialEvent?.banner_url ?? null}
              eventTypes={eventTypes}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 flex-shrink-0">
          <button
            type="button"
            onClick={step === 1 ? onClose : () => setStep((s) => (s - 1) as Step)}
            className="rounded-lg border border-slate-200 px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button
            type="button"
            onClick={() => void handleNext()}
            disabled={saving}
            className={`min-w-32 rounded-lg px-8 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${isLastStep ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {saving ? 'Saving...' : isLastStep ? '✓ Publish Event' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  )
}

// ─── Event card ──────────────────────────────────────────────────────────────
function EventCard({
  event,
  busy,
  onEdit,
  onDuplicate,
  onTogglePublish,
  onDelete,
}: {
  event: any
  busy: boolean
  onEdit: (event: any) => void
  onDuplicate: (event: any) => void
  onTogglePublish: (event: any) => void
  onDelete: (event: any) => void
}) {
  const isPublished = String(event.status ?? '').toLowerCase() === 'published'
  const registrations = Number(event.total_registrations ?? 0)
  const riderLimit = Number(event.rider_limit ?? 300)
  const pct = riderLimit > 0 ? Math.round((registrations / riderLimit) * 100) : 0
  const venue = String(event.venue ?? 'TBD')

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="grid gap-4 xl:grid-cols-[112px_minmax(0,1fr)_180px_220px] xl:items-center">
        <img
          src={String(event.poster_url ?? '/bg2.png')}
          alt={String(event.title ?? 'Event')}
          className="h-24 w-28 rounded-lg object-cover flex-shrink-0"
        />
        <div className="min-w-0">
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wide ${isPublished ? 'text-emerald-600' : 'text-amber-500'}`}>
            {isPublished ? 'Published' : 'Draft'}
          </span>
          <h3 className="text-3xl font-bold leading-tight text-slate-900">{String(event.title ?? 'Untitled')}</h3>
          <p className="mt-1 text-sm text-slate-500 line-clamp-1">{String(event.description ?? '')}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(event.event_date)}</span>
            <span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatTime(event.start_time ?? '6:00 AM')}</span>
            <span className="flex items-center gap-1"><MapPinned className="h-3.5 w-3.5" />{venue}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">🚴 {String(event.race_type ?? 'Race')}</span>
            <span className="flex items-center gap-1">{formatMoney(event.registration_fee)}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{riderLimit} Riders Limit</span>
          </div>
        </div>

        <div className="xl:pr-3">
          <p className="text-xs text-slate-500">Registration Deadline</p>
          <p className="text-xs font-medium text-red-500">{formatDate(event.registration_deadline ?? event.event_date)}</p>
          <div className="mt-2">
            <p className="text-xs text-slate-500">Registrations</p>
            <p className="text-xs font-bold text-blue-600">{registrations} / {riderLimit}</p>
            <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-right text-[10px] text-slate-400 mt-0.5">{pct}%</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onEdit(event)}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDuplicate(event)}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Copy className="h-3 w-3" /> Duplicate
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => onTogglePublish(event)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="text-xs font-medium text-slate-700">{isPublished ? 'Published' : 'Unpublished'}</span>
            <span className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${isPublished ? 'bg-blue-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isPublished ? 'translate-x-4' : ''}`} />
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(event)}
            className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-red-100 px-3 py-1 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </div>
      </div>
    </article>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function AdminEventsManagement() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.eventsDashboard(), [refreshKey])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [busyEventId, setBusyEventId] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<any | null>(null)

  const events = data?.events ?? []
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const title = String(event.title ?? '').toLowerCase()
      const venue = String(event.venue ?? '').toLowerCase()
      const raceType = String(event.race_type ?? '').toLowerCase()
      const status = String(event.status ?? '').toLowerCase()
      const q = search.trim().toLowerCase()
      return (
        (!q || title.includes(q) || venue.includes(q)) &&
        (statusFilter === 'all' || status === statusFilter) &&
        (categoryFilter === 'all' || raceType === categoryFilter)
      )
    })
  }, [events, search, statusFilter, categoryFilter])

  const totalRegistrations = events.reduce((t, e) => t + Number(e.total_registrations ?? 0), 0)
  const publishedCount = events.filter((e) => String(e.status ?? '').toLowerCase() === 'published').length
  const draftCount = events.filter((e) => String(e.status ?? '').toLowerCase() !== 'published').length

  const handleEditEvent = async (event: any) => {
    setEditingEvent(event)
  }

  const handleDuplicateEvent = async (event: any) => {
    setBusyEventId(String(event.id))
    try {
      const title = String(event.title ?? 'Untitled')
      const newSlug = `${slugify(title)}-copy-${Date.now()}`
      const { error } = await supabase.from('events').insert({
        title: `${title} (Copy)`,
        description: String(event.description ?? ''),
        race_type: String(event.race_type ?? 'criterium'),
        venue: String(event.venue ?? ''),
        route_map_url: event.route_map_url ?? null,
        event_date: event.event_date ?? new Date().toISOString(),
        registration_deadline: event.registration_deadline ?? event.event_date ?? new Date().toISOString(),
        registration_fee: Number(event.registration_fee ?? 0),
        prize_pool: event.prize_pool ?? null,
        poster_url: event.poster_url ?? null,
        slug: newSlug,
        short_description: event.short_description ?? null,
        banner_url: event.banner_url ?? null,
        registration_closes_at: event.registration_closes_at ?? null,
        rider_limit: event.rider_limit ?? null,
        organizer_name: event.organizer_name ?? null,
        organizer_contact: event.organizer_contact ?? null,
        organizer_email: event.organizer_email ?? null,
        organizer_website: event.organizer_website ?? null,
        bib_claim_instructions: event.bib_claim_instructions ?? null,
        start_time: event.start_time ?? null,
        end_time: event.end_time ?? null,
        google_maps_link: event.google_maps_link ?? null,
        status: 'draft',
        published_at: null,
      })
      if (error) throw error
      toast.success('Event duplicated.')
      setRefreshKey((v) => v + 1)
    } catch (error) {
      toast.error((error as Error).message || 'Failed to duplicate event.')
    } finally {
      setBusyEventId(null)
    }
  }

  const handleTogglePublishEvent = async (event: any) => {
    const currentlyPublished = String(event.status ?? '').toLowerCase() === 'published'
    setBusyEventId(String(event.id))
    try {
      const { error } = await supabase
        .from('events')
        .update({
          status: currentlyPublished ? 'draft' : 'published',
          published_at: currentlyPublished ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', event.id)
      if (error) throw error
      toast.success(currentlyPublished ? 'Event set to draft.' : 'Event published.')
      setRefreshKey((v) => v + 1)
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update event status.')
    } finally {
      setBusyEventId(null)
    }
  }

  const handleDeleteEvent = async (event: any) => {
    if (!window.confirm(`Delete "${String(event.title ?? 'this event')}"?`)) return
    setBusyEventId(String(event.id))
    try {
      const { error } = await supabase.from('events').delete().eq('id', event.id)
      if (error) throw error
      toast.success('Event deleted.')
      setRefreshKey((v) => v + 1)
    } catch (error) {
      toast.error((error as Error).message || 'Failed to delete event.')
    } finally {
      setBusyEventId(null)
    }
  }

  const handleSave = async () => {
    setRefreshKey((v) => v + 1)
    setIsCreateOpen(false)
  }

  return (
    <ModuleShell loading={loading} error={error}>
      {/* Header */}
      <section className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Events Management</h2>
          <p className="mt-0.5 text-sm text-slate-500">Create, manage, and publish cycling events.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Create Event
        </button>
      </section>

      {/* Stats */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Events', value: data?.stats.events ?? events.length, sub: 'All time', icon: <CalendarDays className="h-5 w-5" />, color: 'blue' },
          { label: 'Published Events', value: publishedCount || data?.stats.published || 0, sub: 'Currently live', icon: <CheckCircle2 className="h-5 w-5" />, color: 'emerald' },
          { label: 'Draft Events', value: draftCount, sub: 'Not published', icon: <Pencil className="h-5 w-5" />, color: 'amber' },
          { label: 'Total Registrations', value: totalRegistrations.toLocaleString(), sub: 'Across all events', icon: <Users className="h-5 w-5" />, color: 'violet' },
        ].map(({ label, value, sub, icon, color }) => {
          const iconClass = color === 'blue'
            ? 'bg-blue-50 text-blue-600'
            : color === 'emerald'
              ? 'bg-emerald-50 text-emerald-600'
              : color === 'amber'
                ? 'bg-amber-50 text-amber-600'
                : 'bg-violet-50 text-violet-600'
          return (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
                <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
              </div>
              <span className={`rounded-lg p-2 ${iconClass}`}>{icon}</span>
            </div>
          </div>
        )})}
      </div>

      {/* Events container */}
      <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="h-10 w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Search events..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <select className="h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="unpublished">Unpublished</option>
          </select>
          <select className="h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Event Types</option>
            <option value="criterium">Criterium</option>
            <option value="itt">ITT</option>
            <option value="road_race">Road Race</option>
          </select>
          <input type="date" className="h-10 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-500" placeholder="Select date range" />
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter className="h-4 w-4" /> Filter
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {filteredEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              {events.length === 0 ? (
                <>
                  <p className="text-sm font-semibold text-slate-700">No events yet.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Create your first event to display it here.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-700">No matching events found.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try clearing filters or updating your search keywords.
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredEvents.map((event, index) => (
              <EventCard
                key={String(event.id ?? index)}
                event={event}
                busy={busyEventId === String(event.id)}
                onEdit={handleEditEvent}
                onDuplicate={handleDuplicateEvent}
                onTogglePublish={handleTogglePublishEvent}
                onDelete={handleDeleteEvent}
              />
            ))
          )}
        </div>
        {filteredEvents.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
            <p>Showing 1 to {Math.min(filteredEvents.length, 3)} of {filteredEvents.length} events</p>
            <div className="flex items-center gap-1">
              <button type="button" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
              {[1, 2, 3, 4].map((p) => (
                <button key={p} type="button" className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${p === 1 ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
              ))}
              <button type="button" className="rounded-lg border border-slate-200 p-2 hover:bg-slate-50 transition-colors"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </section>

      {/* Modal */}
      {isCreateOpen && <CreateEventModal onClose={() => setIsCreateOpen(false)} onSave={handleSave} />}
      {editingEvent && (
        <CreateEventModal
          key={String(editingEvent.id)}
          mode="edit"
          initialEvent={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={async () => {
            setRefreshKey((v) => v + 1)
            setEditingEvent(null)
          }}
        />
      )}
    </ModuleShell>
  )
}