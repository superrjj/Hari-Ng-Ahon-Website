import { useState } from 'react'
import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDate, formatMoney, useModuleLoader } from './admin-module-shared'

export function AdminEventsManagement() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.eventsDashboard(), [refreshKey])
  const [form, setForm] = useState({
    title: '',
    race_type: 'criterium',
    venue: '',
    event_date: '',
    registration_fee: '1000',
  })
  const [saving, setSaving] = useState(false)

  const onCreate = async () => {
    if (!form.title || !form.venue || !form.event_date) return
    setSaving(true)
    try {
      await adminModulesApi.createQuickEvent({
        title: form.title,
        race_type: form.race_type,
        venue: form.venue,
        event_date: form.event_date,
        registration_fee: Number(form.registration_fee || 0),
      })
      setForm({ title: '', race_type: 'criterium', venue: '', event_date: '', registration_fee: '1000' })
      setRefreshKey((value) => value + 1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModuleShell loading={loading} error={error}>
      <StatGrid
        items={[
          { label: 'Total events', value: data?.stats.events ?? 0 },
          { label: 'Published', value: data?.stats.published ?? 0 },
          { label: 'Race categories', value: data?.stats.categories ?? 0 },
        ]}
      />
      <SectionCard title="Quick Create Event" subtitle="Fast event setup for admin testing and initial operations.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Event title" value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} />
          <select className="rounded-lg border border-slate-300 px-3 py-2" value={form.race_type} onChange={(e) => setForm((v) => ({ ...v, race_type: e.target.value }))}>
            <option value="criterium">Criterium</option>
            <option value="itt">ITT</option>
            <option value="ttt">TTT</option>
            <option value="road_race">Road Race</option>
            <option value="fun_ride">Fun Ride</option>
          </select>
          <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Venue" value={form.venue} onChange={(e) => setForm((v) => ({ ...v, venue: e.target.value }))} />
          <input className="rounded-lg border border-slate-300 px-3 py-2" type="datetime-local" value={form.event_date} onChange={(e) => setForm((v) => ({ ...v, event_date: e.target.value }))} />
          <div className="flex gap-2">
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2" type="number" min="0" placeholder="Fee" value={form.registration_fee} onChange={(e) => setForm((v) => ({ ...v, registration_fee: e.target.value }))} />
            <button type="button" onClick={() => void onCreate()} disabled={saving} className="rounded-lg bg-[#1e4a8e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? 'Saving...' : 'Create'}
            </button>
          </div>
        </div>
      </SectionCard>
      <SectionCard title="Events List" subtitle="Latest configured events and publishing state.">
        <DataTable
          rows={data?.events ?? []}
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'race_type', label: 'Race' },
            { key: 'venue', label: 'Venue' },
            { key: 'registration_fee', label: 'Fee', render: (row) => formatMoney(row.registration_fee) },
            { key: 'status', label: 'Status' },
            { key: 'event_date', label: 'Date', render: (row) => formatDate(row.event_date) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
