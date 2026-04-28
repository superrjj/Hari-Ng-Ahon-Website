import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, formatDate, useModuleLoader } from './admin-module-shared'

export function AdminSystemLogs() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.systemLogsDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <SectionCard title="System Audit Logs" subtitle="Admin actions and operational audit trail.">
        <DataTable
          rows={data?.logs ?? []}
          columns={[
            { key: 'module', label: 'Module' },
            { key: 'action', label: 'Action' },
            { key: 'entity_table', label: 'Entity Table' },
            { key: 'entity_id', label: 'Entity ID' },
            { key: 'created_at', label: 'Created', render: (row) => formatDate(row.created_at) },
          ]}
        />
      </SectionCard>
      <SectionCard title="Webhook Events" subtitle="Recent payment webhook deliveries and processing state.">
        <DataTable
          rows={data?.webhooks ?? []}
          columns={[
            { key: 'provider_event_id', label: 'Provider Event' },
            { key: 'event_type', label: 'Type' },
            { key: 'signature_valid', label: 'Signature', render: (row) => (row.signature_valid ? 'Valid' : 'Invalid') },
            { key: 'processed', label: 'Processed', render: (row) => (row.processed ? 'Yes' : 'No') },
            { key: 'processed_at', label: 'Processed At', render: (row) => formatDate(row.processed_at ?? row.created_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
