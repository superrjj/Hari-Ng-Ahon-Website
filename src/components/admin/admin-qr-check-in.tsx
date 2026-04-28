import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDate, useModuleLoader } from './admin-module-shared'

export function AdminQrCheckIn() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.qrDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <StatGrid items={[{ label: 'Total scans', value: data?.stats.scans ?? 0 }, { label: 'Valid scans', value: data?.stats.valid ?? 0 }]} />
      <SectionCard title="QR Scan History" subtitle="Venue scans, validation result, and operator device context.">
        <DataTable
          rows={data?.scans ?? []}
          columns={[
            { key: 'scanned_code', label: 'Code' },
            { key: 'scan_status', label: 'Status' },
            { key: 'device_label', label: 'Device' },
            { key: 'scanned_at', label: 'Scanned At', render: (row) => formatDate(row.scanned_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
