import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, formatDate, useModuleLoader } from './admin-module-shared'

export function AdminEmailNotifications() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.emailDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <SectionCard title="Email Templates" subtitle="Configured templates and their trigger events.">
        <DataTable
          rows={data?.templates ?? []}
          columns={[
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Name' },
            { key: 'trigger_event', label: 'Trigger' },
            { key: 'is_active', label: 'Active', render: (row) => (row.is_active ? 'Yes' : 'No') },
            { key: 'updated_at', label: 'Updated', render: (row) => formatDate(row.updated_at) },
          ]}
        />
      </SectionCard>
      <SectionCard title="Delivery Queue" subtitle="Recent outbound email attempts and their current status.">
        <DataTable
          rows={data?.deliveries ?? []}
          columns={[
            { key: 'recipient', label: 'Recipient' },
            { key: 'subject', label: 'Subject' },
            { key: 'status', label: 'Status' },
            { key: 'sent_at', label: 'Sent At', render: (row) => formatDate(row.sent_at ?? row.created_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
