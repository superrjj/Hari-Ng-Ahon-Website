import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type AdminRegistrationRow } from '../../services/adminApi'
import { CalendarDays, CheckCircle2, Printer, Search, ShieldX, UserRoundX, Users } from 'lucide-react'

function pill(status: string) {
  const s = status.toLowerCase()
  if (s === 'paid') return 'bg-emerald-50 text-emerald-700'
  if (s === 'pending') return 'bg-amber-50 text-amber-700'
  if (s === 'failed') return 'bg-rose-50 text-rose-700'
  if (s === 'refunded') return 'bg-slate-100 text-slate-700'
  return 'bg-slate-100 text-slate-700'
}

export function AdminRegistrations() {
  const [rows, setRows] = useState<AdminRegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [raceFilter, setRaceFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'cyclist_asc' | 'cyclist_desc'>('created_desc')

  useEffect(() => {
    let active = true
    setLoading(true)
    void adminApi
      .registrationsList()
      .then((data) => {
        if (!active) return
        setRows(data)
      })
      .catch((e) => {
        if (!active) return
        setError((e as Error).message || 'Failed to load registrations.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const raceOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => String(r.race_type ?? '').trim()).filter(Boolean))),
    [rows],
  )
  const categoryOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => String(r.age_category ?? '').trim()).filter(Boolean))),
    [rows],
  )

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    let result = rows.filter((r) => {
      const matchesSearch =
        r.id.toLowerCase().includes(query) ||
        String(r.rider_full_name ?? '').toLowerCase().includes(query) ||
        String(r.registrant_email ?? '').toLowerCase().includes(query) ||
        String(r.race_type ?? '').toLowerCase().includes(query) ||
        String(r.age_category ?? '').toLowerCase().includes(query) ||
        String(r.payment_status ?? '').toLowerCase().includes(query)

      const matchesRace = raceFilter === 'all' || String(r.race_type ?? '') === raceFilter
      const matchesPayment = paymentFilter === 'all' || String(r.payment_status ?? '') === paymentFilter
      const matchesCategory = categoryFilter === 'all' || String(r.age_category ?? '') === categoryFilter

      return matchesSearch && matchesRace && matchesPayment && matchesCategory
    })

    result = [...result].sort((a, b) => {
      if (sortBy === 'created_asc' || sortBy === 'created_desc') {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0
        const db = b.created_at ? new Date(b.created_at).getTime() : 0
        return sortBy === 'created_asc' ? da - db : db - da
      }
      const na = String(a.rider_full_name ?? '').toLowerCase()
      const nb = String(b.rider_full_name ?? '').toLowerCase()
      return sortBy === 'cyclist_asc' ? na.localeCompare(nb) : nb.localeCompare(na)
    })

    return result
  }, [q, rows, raceFilter, paymentFilter, categoryFilter, sortBy])

  const paidCount = filtered.filter((r) => String(r.payment_status ?? '').toLowerCase() === 'paid').length
  const pendingCount = filtered.filter((r) => String(r.payment_status ?? '').toLowerCase() === 'pending').length
  const approvedCount = filtered.filter((r) => String(r.status ?? '').toLowerCase() === 'approved').length
  const rejectedCount = filtered.filter((r) => String(r.status ?? '').toLowerCase() === 'rejected').length

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Registrations</h2>
            <p className="text-sm text-slate-500">Manage and monitor all event registrations</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Users className="h-3.5 w-3.5" />
              Export Participants
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Printer className="h-3.5 w-3.5" />
              Print Race Bibs
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-[#1e4a8e] px-3 py-2 text-xs font-semibold text-white hover:bg-[#163b72]">
              <ShieldX className="h-3.5 w-3.5" />
              Assign Manual Bib Override
            </button>
          </div>
        </div>

        <div className="border-b border-slate-100 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Filters</p>
          <div className="grid gap-2 md:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))_auto]">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search registrations..."
                className="h-10 w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
              />
            </div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
            >
              <option value="all">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="unknown">Unknown</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-10 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
            >
              <option value="created_desc">All Registration Status</option>
              <option value="created_asc">Created (Oldest)</option>
              <option value="cyclist_asc">Cyclist A-Z</option>
              <option value="cyclist_desc">Cyclist Z-A</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
            >
              <option value="all">All Categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={raceFilter}
              onChange={(e) => setRaceFilter(e.target.value)}
              className="h-10 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
            >
              <option value="all">All Events</option>
              {raceOptions.map((race) => (
                <option key={race} value={race}>
                  {race}
                </option>
              ))}
            </select>
            <input type="date" className="h-10 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]" />
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-100 px-4 py-3 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Paid" value={paidCount} icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
          <StatCard label="Pending" value={pendingCount} icon={<CalendarDays className="h-4 w-4" />} tone="amber" />
          <StatCard label="Approved" value={approvedCount} icon={<CheckCircle2 className="h-4 w-4" />} tone="blue" />
          <StatCard label="Rejected" value={rejectedCount} icon={<UserRoundX className="h-4 w-4" />} tone="rose" />
          <StatCard label="Total Registrations" value={filtered.length} icon={<Users className="h-4 w-4" />} tone="violet" />
        </div>

        {loading ? <p className="px-4 py-3 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="px-4 py-3 text-sm text-rose-600">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-[1220px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="py-3 pl-4 pr-3 font-semibold">Rider Name</th>
                <th className="py-3 pr-3 font-semibold">Event</th>
                <th className="py-3 pr-3 font-semibold">Category</th>
                <th className="py-3 pr-3 font-semibold">Discipline</th>
                <th className="py-3 pr-3 font-semibold">Team</th>
                <th className="py-3 pr-3 font-semibold">Registration Date</th>
                <th className="py-3 pr-3 font-semibold">Payment Status</th>
                <th className="py-3 pr-3 font-semibold">Bib Number</th>
                <th className="py-3 pr-3 font-semibold">Registration Status</th>
                <th className="py-3 pr-4 text-right font-semibold">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const payment = String(r.payment_status ?? 'unknown')
                const registrationStatus = String(r.status ?? 'pending')
                return (
                  <tr key={r.id} className="text-slate-800 transition-colors hover:bg-slate-50/70">
                    <td className="py-3 pl-4 pr-3">
                      <p className="text-xs font-semibold">{r.rider_full_name ?? '-'}</p>
                      <p className="text-[11px] text-slate-500">{r.registrant_email ?? '-'}</p>
                    </td>
                    <td className="py-3 pr-3 text-xs">{r.event_title ?? r.race_type ?? '-'}</td>
                    <td className="py-3 pr-3 text-xs">{r.age_category ?? '-'}</td>
                    <td className="py-3 pr-3 text-xs">{r.discipline ?? '-'}</td>
                    <td className="py-3 pr-3 text-xs">{r.discipline ?? '-'}</td>
                    <td className="py-3 pr-3 text-xs text-slate-600">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}
                      <p className="text-[10px] text-slate-400">{r.created_at ? new Date(r.created_at).toLocaleTimeString() : ''}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${pill(payment)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {payment}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs font-semibold text-slate-700">—</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${pill(registrationStatus)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {registrationStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link
                        to={`/admin/registrations/${encodeURIComponent(r.id)}`}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && !loading ? (
                <tr>
                  <td className="py-6 text-center text-sm font-medium text-slate-500" colSpan={10}>
                    No registrations found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <p>
            Showing {filtered.length === 0 ? 0 : 1} to {filtered.length} of {filtered.length} registrations
          </p>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-slate-400" disabled>
              ‹
            </button>
            <button type="button" className="rounded-md bg-[#0f5ea8] px-2.5 py-1 font-semibold text-white">
              1
            </button>
            {[2, 3, 4, 5].map((page) => (
              <button key={page} type="button" className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-600 hover:bg-slate-50">
                {page}
              </button>
            ))}
            <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-slate-400" disabled>
              ›
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: 'emerald' | 'amber' | 'blue' | 'rose' | 'violet'
}) {
  const iconClass =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-600'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-600'
        : tone === 'blue'
          ? 'bg-blue-50 text-blue-600'
          : tone === 'rose'
            ? 'bg-rose-50 text-rose-600'
            : 'bg-violet-50 text-violet-600'
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-slate-900">{value}</p>
        </div>
        <span className={`rounded-md p-2 ${iconClass}`}>{icon}</span>
      </div>
    </div>
  )
}

