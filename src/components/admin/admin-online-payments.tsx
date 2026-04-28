import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDate, formatMoney, useModuleLoader } from './admin-module-shared'

export function AdminOnlinePayments() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.paymentsDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <StatGrid items={[{ label: 'Orders', value: data?.stats.orders ?? 0 }, { label: 'Transactions', value: data?.stats.transactions ?? 0 }, { label: 'Paid orders', value: data?.stats.paid ?? 0 }]} />
      <SectionCard title="Payment Orders" subtitle="Latest PayMongo-linked orders, references, and payment state.">
        <DataTable
          rows={data?.orders ?? []}
          columns={[
            { key: 'merchant_reference', label: 'Merchant Ref' },
            { key: 'provider_reference', label: 'Provider Ref' },
            { key: 'payment_method', label: 'Method' },
            { key: 'amount', label: 'Amount', render: (row) => formatMoney(row.amount) },
            { key: 'status', label: 'Status' },
            { key: 'paid_at', label: 'Paid At', render: (row) => formatDate(row.paid_at ?? row.created_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
