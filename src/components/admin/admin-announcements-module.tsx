import { adminModulesApi } from '../../services/adminModulesApi'
import { DataTable, ModuleShell, SectionCard, StatGrid, formatDate, useModuleLoader } from './admin-module-shared'

export function AdminAnnouncementsModule() {
  const { data, loading, error } = useModuleLoader(() => adminModulesApi.announcementsDashboard(), [])
  return (
    <ModuleShell loading={loading} error={error}>
      <StatGrid items={[{ label: 'Announcements', value: data?.stats.posts ?? 0 }, { label: 'Pinned', value: data?.stats.pinned ?? 0 }]} />
      <SectionCard title="Announcement Feed" subtitle="Published notices, post status, and pinned communications.">
        <DataTable
          rows={data?.announcements ?? []}
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'excerpt', label: 'Excerpt' },
            { key: 'is_pinned', label: 'Pinned', render: (row) => (row.is_pinned ? 'Yes' : 'No') },
            { key: 'is_published', label: 'Published', render: (row) => (row.is_published ? 'Yes' : 'No') },
            { key: 'published_at', label: 'Published At', render: (row) => formatDate(row.published_at ?? row.updated_at) },
          ]}
        />
      </SectionCard>
    </ModuleShell>
  )
}
