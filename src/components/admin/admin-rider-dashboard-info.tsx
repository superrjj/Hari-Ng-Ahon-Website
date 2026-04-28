import { Link } from 'react-router-dom'
import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDate, useModuleLoader } from './admin-module-shared'

export function AdminRiderDashboardInfo() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.riderDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <StatGrid items={[{ label: 'Registrations', value: data?.stats.registrations ?? 0 }, { label: 'Bibs', value: data?.stats.bibs ?? 0 }, { label: 'Results', value: data?.stats.results ?? 0 }]} />
      <SectionCard title="Rider-Facing Data" subtitle="This module shows what the cyclist dashboard can be driven from on the public side.">
        <DataTable
          rows={data?.registrations ?? []}
          columns={[
            { key: 'registrant_email', label: 'Email' },
            { key: 'status', label: 'Registration Status' },
            { key: 'bib_number', label: 'Bib Number' },
            { key: 'confirmed_at', label: 'Confirmed', render: (row) => formatDate(row.confirmed_at ?? row.created_at) },
          ]}
        />
        <Link to="/" className="mt-4 inline-flex text-sm font-semibold text-[#1e4a8e] hover:underline">
          Open public site →
        </Link>
      </SectionCard>
    </ModuleShell>
  )
}
