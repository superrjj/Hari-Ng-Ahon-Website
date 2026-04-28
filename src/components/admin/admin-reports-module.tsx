import { useMemo } from 'react'
import { adminModulesApi } from '../../services/adminModulesApi'
import { ModuleShell, SectionCard, StatGrid, formatMoney, useModuleLoader } from './admin-module-shared'

export function AdminReportsModule() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.reportsDashboard(), [])
  const items = useMemo(
    () => [
      { label: 'Events', value: data?.stats.events ?? 0 },
      { label: 'Registrations', value: data?.stats.registrations ?? 0 },
      { label: 'Payments', value: data?.stats.payments ?? 0 },
      { label: 'Results', value: data?.stats.results ?? 0 },
      { label: 'Revenue', value: formatMoney(data?.stats.revenue ?? 0) },
    ],
    [data],
  )
  return (
    <ModuleShell loading={loading} error={error}>
      <StatGrid items={items} />
      <SectionCard title="Report Coverage" subtitle="These stats are now sourced from live tables and ready for CSV/PDF export wiring next.">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          <li>Participant list report is backed by `registration_forms`.</li>
          <li>Revenue report is backed by paid `payment_orders`.</li>
          <li>Result summary is backed by `race_results`.</li>
          <li>Event activity is backed by `events` and category tables.</li>
        </ul>
      </SectionCard>
    </ModuleShell>
  )
}
