import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminApi, type AdminRiderDetailRow, type AdminRegistrationRow } from '../../services/adminApi'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-900 sm:max-w-[70%] sm:text-right">{value}</p>
    </div>
  )
}

export function AdminRegistrationDetail() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [registration, setRegistration] = useState<AdminRegistrationRow | null>(null)
  const [rider, setRider] = useState<AdminRiderDetailRow | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    void adminApi
      .registrationDetails(id)
      .then((data) => {
        if (!active) return
        setRegistration(data.registration)
        setRider(data.rider)
      })
      .catch((e) => {
        if (!active) return
        setError((e as Error).message || 'Failed to load registration.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Registration detail</h2>
          <p className="font-mono text-xs text-slate-500">{id}</p>
        </div>
        <Link to="/admin/registrations" className="text-sm font-medium text-slate-700 hover:text-slate-900">
          ← Back to registrations
        </Link>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!loading && !error && !registration ? (
        <p className="text-sm text-slate-500">Registration not found.</p>
      ) : null}

      {registration ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Registration</h3>
            <div className="mt-3 space-y-3">
              <Row label="Race type" value={String(registration.race_type ?? '-')} />
              <Row label="Email" value={String(registration.registrant_email ?? '-')} />
              <Row label="Payment status" value={String(registration.payment_status ?? 'unknown')} />
              <Row label="Status" value={String(registration.status ?? '-')} />
              <Row label="Created" value={registration.created_at ? new Date(registration.created_at).toLocaleString() : '-'} />
              <Row label="User ID" value={String(registration.user_id ?? '-')} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Rider details</h3>
            <div className="mt-3 space-y-3">
              <Row label="Name" value={`${rider?.first_name ?? ''} ${rider?.last_name ?? ''}`.trim() || '-'} />
              <Row label="Gender" value={String(rider?.gender ?? '-')} />
              <Row label="Birth date" value={String(rider?.birth_date ?? '-')} />
              <Row label="Address" value={String(rider?.address ?? '-')} />
              <Row label="Contact" value={String(rider?.contact_number ?? '-')} />
              <Row label="Emergency contact" value={String(rider?.emergency_contact_name ?? '-')} />
              <Row label="Emergency number" value={String(rider?.emergency_contact_number ?? '-')} />
              <Row label="Team" value={String(rider?.team_name ?? '-')} />
              <Row label="Discipline" value={String(rider?.discipline ?? '-')} />
              <Row label="Category" value={String(rider?.age_category ?? '-')} />
              <Row label="Jersey size" value={String(rider?.jersey_size ?? '-')} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

