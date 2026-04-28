import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, useModuleLoader } from './admin-module-shared'

export function AdminCyclistsManagement() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.usersDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <SectionCard title="User Directory" subtitle="Cyclist and admin accounts currently available in the system.">
        <DataTable
          rows={data ?? []}
          columns={[
            { key: 'full_name', label: 'Full Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'city', label: 'City' },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
