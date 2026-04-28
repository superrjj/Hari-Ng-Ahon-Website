import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDate, useModuleLoader } from './admin-module-shared'

export function AdminGalleryModule() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.galleryDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <StatGrid items={[{ label: 'Gallery items', value: data?.stats.items ?? 0 }, { label: 'Featured', value: data?.stats.featured ?? 0 }]} />
      <SectionCard title="Gallery Items" subtitle="Uploaded media assets for events and homepage promotion.">
        <DataTable
          rows={data?.items ?? []}
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'media_type', label: 'Type' },
            { key: 'is_featured', label: 'Featured', render: (row) => (row.is_featured ? 'Yes' : 'No') },
            { key: 'file_url', label: 'File', render: (row) => (row.file_url ? <a href={String(row.file_url)} className="text-[#1e4a8e] hover:underline" target="_blank" rel="noreferrer">Open</a> : '—') },
            { key: 'created_at', label: 'Created', render: (row) => formatDate(row.created_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
