import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDuration, useModuleLoader } from './admin-module-shared'

export function AdminResultsManagement() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.resultsDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <StatGrid items={[{ label: 'Results rows', value: data?.stats.results ?? 0 }, { label: 'Published', value: data?.stats.published ?? 0 }]} />
      <SectionCard title="Results Ledger" subtitle="Result upload records, time capture, and publication status.">
        <DataTable
          rows={data?.results ?? []}
          columns={[
            { key: 'bib_number', label: 'Bib' },
            { key: 'result_status', label: 'Status' },
            { key: 'rank_overall', label: 'Overall Rank' },
            { key: 'rank_category', label: 'Category Rank' },
            { key: 'chip_time_ms', label: 'Chip Time', render: (row) => formatDuration(row.chip_time_ms) },
            { key: 'gun_time_ms', label: 'Gun Time', render: (row) => formatDuration(row.gun_time_ms) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
