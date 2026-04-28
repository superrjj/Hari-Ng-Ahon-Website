import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, formatDate, useModuleLoader } from './admin-module-shared'

export function AdminDigitalWaiver() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.digitalWaiverDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <SectionCard title="Waiver Audit Trail" subtitle="Stored consent and agreement acceptance records before payment.">
        <DataTable
          rows={data ?? []}
          columns={[
            { key: 'registration_id', label: 'Registration' },
            { key: 'liability_waiver_accepted', label: 'Liability', render: (row) => (row.liability_waiver_accepted ? 'Accepted' : 'Pending') },
            { key: 'race_rules_accepted', label: 'Rules', render: (row) => (row.race_rules_accepted ? 'Accepted' : 'Pending') },
            { key: 'waiver_version', label: 'Version' },
            { key: 'signed_at', label: 'Signed At', render: (row) => formatDate(row.signed_at ?? row.accepted_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
