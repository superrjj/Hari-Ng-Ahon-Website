import { Link } from 'react-router-dom'

function ModuleCard({
  title,
  description,
  features,
}: {
  title: string
  description: string
  features: string[]
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-slate-700">
        {features.map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-slate-500">
        This screen is a module scaffold. Connect Supabase tables and actions next.
      </p>
    </div>
  )
}

export function AdminEventsManagement() {
  return (
    <ModuleCard
      title="Events Management"
      description="Create, edit, publish, and configure events including posters, deadlines, rider limits, categories, and pricing."
      features={[
        'Create / edit / delete event',
        'Publish or unpublish',
        'Upload poster / banner',
        'Registration deadline & rider limit',
        'Configure categories & pricing',
        'Route map, prize pool, organizer info, bib instructions',
      ]}
    />
  )
}

export function AdminOnlinePayments() {
  return (
    <ModuleCard
      title="Online Payments"
      description="PayMongo integration: live status, webhooks, receipts, and transaction logs."
      features={[
        'Automatic verification & webhook confirmation',
        'GCash, Maya, cards, online banking',
        'Rider, event, amount, method, transaction ID, date, status',
        'Post-payment: confirm registration, bib, email',
      ]}
    />
  )
}

export function AdminRaceBibGenerator() {
  return (
    <ModuleCard
      title="Auto Race Bib Generator"
      description="Generate bibs with QR, rider details, sponsors, and category colors. Prefix examples: RB-1001, MTB-2034, FR-3012."
      features={[
        'Auto bib numbers & downloadable PDF',
        'QR verification, reprint, bulk export',
        'Category color coding & sponsor logos',
      ]}
    />
  )
}

export function AdminResultsManagement() {
  return (
    <ModuleCard
      title="Results Management"
      description="Upload results, finish times, rankings, and publish official standings by category."
      features={[
        'Upload results & enter times',
        'Auto ranking & publish standings',
        'Optional: chip timing, QR check-in, live leaderboard',
      ]}
    />
  )
}

export function AdminAnnouncementsModule() {
  return (
    <ModuleCard
      title="Announcements"
      description="Create, pin, and manage notices with optional images."
      features={['Create / edit / delete', 'Pin important posts', 'Upload images or posters']}
    />
  )
}

export function AdminGalleryModule() {
  return (
    <ModuleCard
      title="Gallery"
      description="Event photo albums and featured gallery."
      features={['Upload & organize by event', 'Delete photos', 'Featured gallery', 'Optional: drag-drop, compression']}
    />
  )
}

export function AdminCyclistsManagement() {
  return (
    <ModuleCard
      title="Cyclist / User Management"
      description="Profiles, teams, suspensions, and registration history."
      features={[
        'View profiles & teams',
        'Suspend or delete accounts',
        'Registration history per rider',
      ]}
    />
  )
}

export function AdminReportsModule() {
  return (
    <ModuleCard
      title="Reports"
      description="Export participant lists, revenue, analytics, and category summaries."
      features={['PDF, Excel, CSV exports', 'Participant & revenue reports', 'Event & registration summaries']}
    />
  )
}

export function AdminSettingsModule() {
  return (
    <ModuleCard
      title="Settings"
      description="Branding, registration rules, payments, email templates, and admin accounts."
      features={[
        'Logo & homepage banners',
        'Registration & payment settings',
        'Email templates',
        'Admin account management',
      ]}
    />
  )
}

export function AdminQrCheckIn() {
  return (
    <ModuleCard
      title="QR Code Check-in"
      description="Scan rider QR at venue entry for fast attendance verification."
      features={['Scan & verify', 'Link to registration / bib']}
    />
  )
}

export function AdminEmailNotifications() {
  return (
    <ModuleCard
      title="Email Notifications"
      description="Automated emails for registration, payment, reminders, and bib release."
      features={['Templates & triggers', 'Registration & payment confirmations']}
    />
  )
}

export function AdminRiderDashboardInfo() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Rider Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">
        Cyclists use the public site to view registrations, download bibs, receipts, and results after login.
      </p>
      <Link to="/" className="mt-4 inline-flex text-sm font-semibold text-[#1e4a8e] hover:underline">
        Open public site →
      </Link>
    </div>
  )
}

export function AdminDigitalWaiver() {
  return (
    <ModuleCard
      title="Digital Rider Waiver"
      description="Collect and store consent before payment."
      features={['Waiver before checkout', 'Stored digital consent', 'Audit trail']}
    />
  )
}

export function AdminSystemLogs() {
  return (
    <ModuleCard
      title="System Logs"
      description="Audit and debug webhooks, admin actions, and integrations."
      features={['Webhook delivery logs', 'Error tracking hooks']}
    />
  )
}
