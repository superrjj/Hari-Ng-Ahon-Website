import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays, CheckCircle2, Clock3, Filter, MapPinned,
  Pencil, Plus, Search, Trash2, UploadCloud, Users, X, ChevronLeft,
  ChevronRight, Copy, Trophy, UserCheck, Image, CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { adminModulesApi } from '../../services/adminModulesApi'
import { EmptyState, ModuleShell, formatDate, formatMoney, useModuleLoader } from './admin-module-shared'

// ─── Types ───────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4

interface Category {
  id: string
  name: string
  riderLimit: string
  fee: string
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

// ─── Step indicator ──────────────────────────────────────────────────────────
const STEPS = ['Event Information', 'Categories & Pricing', 'Additional Information', 'Review & Publish']

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
}: {
  form: any
  setForm: any
  posterFile: File | null
  setPosterFile: (file: File | null) => void
  routeMapFile: File | null
  setRouteMapFile: (file: File | null) => void
  currentPosterUrl?: string | null
  currentRouteMapUrl?: string | null
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
              <p className="mb-1 text-xs font-medium text-slate-600">Race Type <span className="text-red-500">*</span></p>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={form.race_type} onChange={(e) => setForm((v: any) => ({ ...v, race_type: e.target.value }))}>
                <option value="">Select race type</option>
                <option value="criterium">Criterium</option>
                <option value="itt">ITT</option>
                <option value="road_race">Road Race</option>
              </select>
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
const BIKE_ICONS: Record<string, string> = { 'Road Bike': '🚴', MTB: '🚵', Gravel: '🚵', 'E-Bike (Open)': '⚡' }

function Step2({ categories, setCategories }: { categories: Category[]; setCategories: React.Dispatch<React.SetStateAction<Category[]>> }) {
  const addCategory = () => {
    setCategories((prev) => [...prev, { id: crypto.randomUUID(), name: '', riderLimit: '', fee: '', active: true }])
  }
  const removeCategory = (id: string) => setCategories((prev) => prev.filter((c) => c.id !== id))
  const updateCategory = (id: string, key: keyof Category, value: any) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: value } : c)))
  }
  const totalFee = categories.reduce((sum, c) => sum + Number(c.fee || 0), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-800">Event Categories</p>
          <p className="text-xs text-slate-500 mt-0.5">Add race categories for this event. Each category can have its own price and rider limit.</p>
        </div>
        <button type="button" onClick={addCategory} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
          <Plus className="h-3.5 w-3.5" /> Add Category
        </button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{BIKE_ICONS[cat.name] ?? '🚴'}</span>
                <p className="text-sm font-semibold text-slate-800">{cat.name || 'New Category'}</p>
              </div>
              <button type="button" onClick={() => removeCategory(cat.id)} className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label>
                <p className="mb-1 text-[10px] font-medium text-slate-500">Category Name <span className="text-red-500">*</span></p>
                <input className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. Road Bike" value={cat.name} onChange={(e) => updateCategory(cat.id, 'name', e.target.value)} />
              </label>
              <label>
                <p className="mb-1 text-[10px] font-medium text-slate-500">Rider Limit</p>
                <input className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" type="number" placeholder="150" value={cat.riderLimit} onChange={(e) => updateCategory(cat.id, 'riderLimit', e.target.value)} />
              </label>
              <label>
                <p className="mb-1 text-[10px] font-medium text-slate-500">Registration Fee (PHP) <span className="text-red-500">*</span></p>
                <input className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" type="number" placeholder="1,200" value={cat.fee} onChange={(e) => updateCategory(cat.id, 'fee', e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateCategory(cat.id, 'active', !cat.active)}
                className={`relative h-5 w-9 rounded-full transition-colors ${cat.active ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${cat.active ? 'translate-x-4' : ''}`} />
              </button>
              <span className="text-xs text-slate-600">{cat.active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
          ℹ️ Rider limit is the maximum number of participants allowed for this category.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Pricing Summary</p>
          <p className="text-xs text-slate-500">Total Categories: {categories.length}</p>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-600">Total Registration Fee (All Categories)</p>
          <p className="text-sm font-bold text-blue-600">PHP {totalFee.toLocaleString()}</p>
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
  categories,
  extra,
  posterFile,
  currentPosterUrl,
}: {
  form: any
  categories: Category[]
  extra: any
  posterFile?: File | null
  currentPosterUrl?: string | null
}) {
  const totalFee = categories.reduce((sum, c) => sum + Number(c.fee || 0), 0)

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
        <div className="flex gap-4">
          <div className="h-28 w-24 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
            {displayPosterUrl ? (
              <img
                src={displayPosterUrl}
                alt="Event poster"
                className="h-full w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-800">
                <Image className="h-6 w-6 text-slate-500" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs flex-1">
            <div><p className="text-slate-500">Race Type</p><p className="font-medium text-slate-800">{form.race_type || '—'}</p></div>
              <div><p className="text-slate-500">Date & Time</p><p className="font-medium text-slate-800">{form.event_date ? `${form.event_date} (${form.start_time || '—'})` : '—'}</p></div>
            <div><p className="text-slate-500">Venue</p><p className="font-medium text-slate-800">{form.venue ? `${form.venue}, ${form.city}` : '—'}</p></div>
              <div><p className="text-slate-500">Registration Deadline</p><p className="font-medium text-slate-800">{form.registration_deadline || '—'}</p></div>
            <div><p className="text-slate-500">Rider Limit</p><p className="font-medium text-slate-800">{categories.reduce((s, c) => s + Number(c.riderLimit || 0), 0)} Riders (All Categories)</p></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-800 mb-3">Categories & Pricing</p>
        <div className="mb-2 grid grid-cols-2 gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Category</span><span>Registration Fee</span>
        </div>
        <div className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="grid grid-cols-2 gap-1 text-xs text-slate-700">
              <span>{c.name || '—'}</span><span>PHP {Number(c.fee || 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-slate-100 pt-3 flex justify-between text-xs">
          <span className="text-slate-500">Total Categories: {categories.length}</span>
          <span className="font-bold text-slate-800">Total Fee (All Categories): PHP {totalFee.toLocaleString()}</span>
        </div>
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
  const [form, setForm] = useState({
    title: String(initialEvent?.title ?? ''),
    description: String(initialEvent?.description ?? ''),
    race_type: String(initialEvent?.race_type ?? ''),
    venue: String(initialEvent?.venue ?? ''),
    city: '',
    event_date: toDateInputValue(initialEvent?.event_date),
    start_time: toTimeInputValue(initialEvent?.start_time),
    end_time: '',
    google_maps_link: '',
    registration_deadline: toDateTimeLocalValue(
      initialEvent?.registration_deadline ?? initialEvent?.registration_closes_at,
    ),
    registration_fee: String(initialEvent?.registration_fee ?? '0'),
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [posterFile, setPosterFile] = useState<File | null>(null)
  const [routeMapFile, setRouteMapFile] = useState<File | null>(null)
  const [organizerLogoFile, setOrganizerLogoFile] = useState<File | null>(null)
  const [extra, setExtra] = useState({
    prizePool: initialEvent?.prize_pool ? 'has' : 'none',
    totalPrize: '',
    prizeDesc: String(initialEvent?.prize_pool ?? ''),
    orgName: String(initialEvent?.organizer_name ?? ''),
    orgEmail: String(initialEvent?.organizer_email ?? ''),
    orgPhone: String(initialEvent?.organizer_contact ?? ''),
    orgWebsite: '',
    bibInstructions: String(initialEvent?.bib_claim_instructions ?? ''),
  })

  const isLastStep = step === 4

  const handleNext = async () => {
    if (isLastStep) {
      setSaving(true)
      try {
        if (!form.title.trim() || !form.description.trim() || !form.race_type || !form.venue.trim() || !form.event_date) {
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

        const posterUrl = await uploadToBucket('event-posters', posterFile)
        const routeMapUrl = await uploadToBucket('event-route-maps', routeMapFile)
        const organizerLogoUrl = await uploadToBucket('organizer-logos', organizerLogoFile)
        const baseSlug = slugify(form.title) || 'event'
        const riderLimit = categories.reduce((sum, category) => sum + Number(category.riderLimit || 0), 0)

        const payload = {
          title: form.title.trim(),
          description: form.description.trim(),
          race_type: form.race_type,
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
          slug: `${baseSlug}-${Date.now()}`,
          short_description: form.description.trim().slice(0, 160),
          banner_url: organizerLogoUrl,
          registration_closes_at: deadlineTimestamp,
          rider_limit: riderLimit > 0 ? riderLimit : null,
          organizer_name: extra.orgName || null,
          organizer_contact: extra.orgPhone || null,
          organizer_email: extra.orgEmail || null,
          bib_claim_instructions: extra.bibInstructions || null,
          start_time: eventTimestamp,
          status: mode === 'edit' ? String(initialEvent?.status ?? 'draft') : 'draft',
          updated_at: new Date().toISOString(),
        }

        const response =
          mode === 'edit'
            ? await supabase.from('events').update(payload).eq('id', initialEvent?.id)
            : await supabase.from('events').insert({
                ...payload,
                slug: `${baseSlug}-${Date.now()}`,
              })

        if (response.error) throw response.error
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
              currentPosterUrl={initialEvent?.poster_url ?? null}
              currentRouteMapUrl={initialEvent?.route_map_url ?? null}
            />
          )}
          {step === 2 && <Step2 categories={categories} setCategories={setCategories} />}
          {step === 3 && (
            <Step3
              extra={extra}
              setExtra={setExtra}
              organizerLogoFile={organizerLogoFile}
              setOrganizerLogoFile={setOrganizerLogoFile}
              currentOrgLogoUrl={initialEvent?.banner_url ?? null}
            />
          )}
          {step === 4 && (
            <Step4
              form={form}
              categories={categories}
              extra={extra}
              posterFile={posterFile}
              currentPosterUrl={initialEvent?.poster_url ?? null}
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
          <p className="text-[10px] text-slate-400">(11:59 PM)</p>
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
        bib_claim_instructions: event.bib_claim_instructions ?? null,
        start_time: event.start_time ?? null,
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
            <option value="all">All Categories</option>
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
            <EmptyState text="No matching events found." />
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