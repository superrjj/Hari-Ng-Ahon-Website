import { useEffect, useMemo, useState } from 'react'
import { adminApi, type AdminRegistrationRow } from '../../services/adminApi'

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}

export function AdminDashboard() {
  const [rows, setRows] = useState<AdminRegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
        setError((e as Error).message || 'Failed to load admin data.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    const total = rows.length
    const paid = rows.filter((r) => String(r.payment_status ?? '').toLowerCase() === 'paid').length
    const pending = rows.filter((r) => String(r.payment_status ?? '').toLowerCase() === 'pending').length
    const failed = rows.filter((r) => String(r.payment_status ?? '').toLowerCase() === 'failed').length
    return { total, paid, pending, failed }
  }, [rows])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total registrations" value={String(stats.total)} />
        <StatCard label="Paid" value={String(stats.paid)} />
        <StatCard label="Pending" value={String(stats.pending)} />
        <StatCard label="Failed" value={String(stats.failed)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Recent registrations</h2>
          {loading ? <span className="text-xs text-slate-500">Loading…</span> : null}
        </div>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[640px] w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr>
                <th className="py-2 pr-3">ID</th>
                <th className="py-2 pr-3">Race</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Payment</th>
                <th className="py-2 pr-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, 10).map((r) => (
                <tr key={r.id} className="text-slate-800">
                  <td className="py-2 pr-3 font-mono text-xs">{r.id.slice(0, 8)}…</td>
                  <td className="py-2 pr-3">{r.race_type ?? '-'}</td>
                  <td className="py-2 pr-3">{r.registrant_email ?? '-'}</td>
                  <td className="py-2 pr-3">{String(r.payment_status ?? 'unknown')}</td>
                  <td className="py-2 pr-3 text-xs text-slate-500">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading ? (
                <tr>
                  <td className="py-3 text-sm text-slate-500" colSpan={5}>
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

