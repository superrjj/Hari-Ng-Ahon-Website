import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminApi, type AdminRegistrationRow } from '../../services/adminApi'

function pill(status: string) {
  const s = status.toLowerCase()
  if (s === 'paid') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (s === 'pending') return 'bg-amber-50 text-amber-800 border-amber-200'
  if (s === 'failed') return 'bg-rose-50 text-rose-800 border-rose-200'
  if (s === 'refunded') return 'bg-slate-100 text-slate-700 border-slate-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

export function AdminRegistrations() {
  const [rows, setRows] = useState<AdminRegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

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

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((r) => {
      return (
        r.id.toLowerCase().includes(query) ||
        String(r.registrant_email ?? '').toLowerCase().includes(query) ||
        String(r.race_type ?? '').toLowerCase().includes(query) ||
        String(r.payment_status ?? '').toLowerCase().includes(query)
      )
    })
  }, [q, rows])

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Registrations</h2>
            <p className="text-xs text-slate-500">Search by email, race type, payment status, or ID.</p>
          </div>
          <div className="w-full sm:w-80">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#cfae3f]"
            />
          </div>
        </div>
        {loading ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="py-3 pl-4 pr-3">ID</th>
                <th className="py-3 pr-3">Email</th>
                <th className="py-3 pr-3">Race</th>
                <th className="py-3 pr-3">Payment</th>
                <th className="py-3 pr-3">Created</th>
                <th className="py-3 pr-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => {
                const payment = String(r.payment_status ?? 'unknown')
                return (
                  <tr key={r.id} className="text-slate-800">
                    <td className="py-3 pl-4 pr-3 font-mono text-xs">{r.id}</td>
                    <td className="py-3 pr-3">{r.registrant_email ?? '-'}</td>
                    <td className="py-3 pr-3">{r.race_type ?? '-'}</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${pill(payment)}`}>
                        {payment}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-slate-500">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <Link to={`/admin/registrations/${encodeURIComponent(r.id)}`} className="text-sm font-medium text-slate-900 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && !loading ? (
                <tr>
                  <td className="py-4 pl-4 text-sm text-slate-500" colSpan={6}>
                    No registrations found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

