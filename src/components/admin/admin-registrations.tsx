import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type AdminRegistrationRow } from '../../services/adminApi'
import { Search } from 'lucide-react'

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

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search registrations..."
                className="w-full rounded-md border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
              />
            </div>
            <select
              value={raceFilter}
              onChange={(e) => setRaceFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
            >
              <option value="all">All races</option>
              {raceOptions.map((race) => (
                <option key={race} value={race}>
                  {race}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
            >
              <option value="all">All payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="unknown">Unknown</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#1e4a8e]"
            >
              <option value="created_desc">Newest created</option>
              <option value="created_asc">Oldest created</option>
              <option value="cyclist_asc">Cyclist A-Z</option>
              <option value="cyclist_desc">Cyclist Z-A</option>
            </select>
          </div>
          <p className="text-xs text-slate-500">Page 1/1</p>
        </div>
        {loading ? <p className="px-4 py-3 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="px-4 py-3 text-sm text-rose-600">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.06em] text-slate-500">
              <tr>
                <th className="py-3 pl-3 pr-3 font-semibold">Cyclist Name</th>
                <th className="py-3 pr-3 font-semibold">Email</th>
                <th className="py-3 pr-3 font-semibold">Race</th>
                <th className="py-3 pr-3 font-semibold">Discipline</th>
                <th className="py-3 pr-3 font-semibold">Category</th>
                <th className="py-3 pr-3 font-semibold">Payment</th>
                <th className="py-3 pr-3 font-semibold">Created</th>
                <th className="py-3 pr-5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const payment = String(r.payment_status ?? 'unknown')
                return (
                  <tr key={r.id} className="text-slate-800 transition-colors hover:bg-slate-50/70">
                    <td className="py-3 pl-3 pr-3 text-xs font-semibold">{r.rider_full_name ?? '-'}</td>
                    <td className="py-3 pr-3 text-xs">{r.registrant_email ?? '-'}</td>
                    <td className="py-3 pr-3 text-xs">{r.race_type ?? '-'}</td>
                    <td className="py-3 pr-3 text-xs">{r.discipline ?? '-'}</td>
                    <td className="py-3 pr-3 text-xs">{r.age_category ?? '-'}</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase ${pill(payment)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {payment}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 pr-5 text-right">
                      <Link
                        to={`/admin/registrations/${encodeURIComponent(r.id)}`}
                        className="inline-flex items-center gap-1 rounded-md bg-[#0f5ea8] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0b4f8d]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && !loading ? (
                <tr>
                  <td className="py-4 pl-4 text-sm text-slate-500" colSpan={8}>
                    No registrations found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          <p>
            Showing {filtered.length === 0 ? 0 : 1}-{filtered.length} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-slate-400" disabled>
              ‹
            </button>
            <button type="button" className="rounded-md bg-[#0f5ea8] px-2.5 py-1 font-semibold text-white">
              1
            </button>
            <button type="button" className="rounded-md border border-slate-200 px-2 py-1 text-slate-400" disabled>
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

