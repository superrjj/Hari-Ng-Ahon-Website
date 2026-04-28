import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, formatDate, useModuleLoader } from './admin-module-shared'

export function AdminSettingsModule() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.settingsDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <SectionCard title="Application Settings" subtitle="Key-value settings stored in `app_settings` for branding and platform behavior.">
        <DataTable
          rows={data ?? []}
          columns={[
            { key: 'key', label: 'Key' },
            { key: 'description', label: 'Description' },
            { key: 'value', label: 'Value', render: (row) => <span className="font-mono text-xs">{JSON.stringify(row.value ?? {})}</span> },
            { key: 'updated_at', label: 'Updated', render: (row) => formatDate(row.updated_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
