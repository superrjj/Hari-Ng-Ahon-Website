import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDate, useModuleLoader } from './admin-module-shared'

export function AdminRaceBibGenerator() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.bibsDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <StatGrid items={[{ label: 'Generated bibs', value: data?.stats.bibs ?? 0 }, { label: 'Claimed bibs', value: data?.stats.claimed ?? 0 }]} />
      <SectionCard title="Race Bibs" subtitle="Generated bib numbers, QR-ready identifiers, and claim state.">
        <DataTable
          rows={data?.bibs ?? []}
          columns={[
            { key: 'bib_number', label: 'Bib Number' },
            { key: 'bib_prefix', label: 'Prefix' },
            { key: 'status', label: 'Status' },
            { key: 'generated_at', label: 'Generated', render: (row) => formatDate(row.generated_at) },
            { key: 'claimed_at', label: 'Claimed', render: (row) => formatDate(row.claimed_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
