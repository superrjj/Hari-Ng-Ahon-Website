import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthPage } from '../components/auth/auth-page'
import { AdminDashboard } from '../components/admin/admin-dashboard'
import { AdminLayout } from '../components/admin/admin-layout'
import { AdminShell } from '../components/admin/admin-shell'
import { AdminRegistrations } from '../components/admin/admin-registrations'
import { AdminRegistrationDetail } from '../components/admin/admin-registration-detail'
import {
  AdminAnnouncementsModule,
  AdminCyclistsManagement,
  AdminDigitalWaiver,
  AdminEmailNotifications,
  AdminEventsManagement,
  AdminGalleryModule,
  AdminOnlinePayments,
  AdminQrCheckIn,
  AdminRaceBibGenerator,
  AdminReportsModule,
  AdminResultsManagement,
  AdminRiderDashboardInfo,
  AdminSettingsModule,
  AdminSystemLogs,
} from '../components/admin/admin-pages'
import { Hero } from '../components/homepage/hero'
import { RegistrationForm } from '../components/homepage/registration-form'
import { RegistrationInfo } from '../components/homepage/registration-info'
import { RegistrationPayment } from '../components/homepage/registration-payment'
import { RegistrationPaymentSuccess } from '../components/homepage/registration-payment-success'
import { Shell } from '../components/Shell'
import { useAuth } from '../hooks/useAuth'

/** Public home; admins are sent straight to the admin dashboard (same layout as after login). */
function HomeRoute() {
  const { session, loading, role, roleLoading } = useAuth()
  if (loading || (session && roleLoading)) {
    return (
      <Shell>
        <section className="flex min-h-[40vh] items-center justify-center px-4 py-16 text-sm text-slate-600">
          Loading…
        </section>
      </Shell>
    )
  }
  if (session && role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  return (
    <Shell>
      <Hero />
    </Shell>
  )
}

function RequireAuth({ children, redirectTo }: { children: ReactNode; redirectTo: string }) {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <Shell>
        <section className="px-4 py-10 text-center text-sm text-slate-600">Checking session...</section>
      </Shell>
    )
  }

  if (!session) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectTo)}`} replace />
  }

  return children
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading, role, roleLoading } = useAuth()
  if (loading || (session && roleLoading)) {
    return (
      <Shell>
        <section className="px-4 py-10 text-center text-sm text-slate-600">Checking session...</section>
      </Shell>
    )
  }
  if (session && role === 'admin') return <Navigate to="/admin" replace />
  return children
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading, role, roleLoading } = useAuth()
  if (loading || (session && roleLoading)) {
    return (
      <Shell>
        <section className="px-4 py-10 text-center text-sm text-slate-600">Checking access...</section>
      </Shell>
    )
  }
  if (!session) return <Navigate to="/auth?redirect=%2Fadmin" replace />
  if (role !== 'admin') return <Navigate to="/" replace />
  return children
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      {/* Public landing (admins redirected from `/` can open this via View site) */}
      <Route
        path="/home"
        element={
          <PublicOnly>
            <Shell>
              <Hero />
            </Shell>
          </PublicOnly>
        }
      />
      <Route path="/auth" element={<Shell><AuthPage /></Shell>} />
      <Route
        path="/register/info"
        element={
          <PublicOnly>
            <Shell><RegistrationInfo /></Shell>
          </PublicOnly>
        }
      />
      <Route
        path="/register/form"
        element={
          <PublicOnly>
            <RequireAuth redirectTo="/register/form"><Shell><RegistrationForm /></Shell></RequireAuth>
          </PublicOnly>
        }
      />
      <Route
        path="/register/payment"
        element={
          <PublicOnly>
            <RequireAuth redirectTo="/register/payment"><Shell><RegistrationPayment /></Shell></RequireAuth>
          </PublicOnly>
        }
      />
      <Route
        path="/register/payment-success"
        element={
          <PublicOnly>
            <RequireAuth redirectTo="/register/payment-success"><Shell><RegistrationPaymentSuccess /></Shell></RequireAuth>
          </PublicOnly>
        }
      />

      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/events"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Events Management" subtitle="Create, publish, and configure race events.">
                <AdminEventsManagement />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/registrations"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Registration Management" subtitle="Review, approve, and export participant data.">
                <AdminRegistrations />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/registrations/:id"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Registration detail" subtitle="Rider profile and payment context.">
                <AdminRegistrationDetail />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Online Payments" subtitle="PayMongo transactions and verification.">
                <AdminOnlinePayments />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/bibs"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Auto Race Bib Generator" subtitle="Generate and export race bibs with QR codes.">
                <AdminRaceBibGenerator />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/results"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Results Management" subtitle="Upload times, rankings, and publish standings.">
                <AdminResultsManagement />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/announcements"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Announcements" subtitle="Pinned notices and race communications.">
                <AdminAnnouncementsModule />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/gallery"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Gallery" subtitle="Event photos and albums.">
                <AdminGalleryModule />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/cyclists"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Cyclists Management" subtitle="Profiles, teams, and account actions.">
                <AdminCyclistsManagement />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Reports" subtitle="Exports and analytics summaries.">
                <AdminReportsModule />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Settings" subtitle="Branding, payments, email, and admin accounts.">
                <AdminSettingsModule />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/check-in"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="QR Code Check-in" subtitle="Venue entry verification.">
                <AdminQrCheckIn />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/email-notifications"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Email Notifications" subtitle="Templates and automated rider emails.">
                <AdminEmailNotifications />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/rider-dashboard"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Rider Dashboard" subtitle="What cyclists see after login.">
                <AdminRiderDashboardInfo />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/digital-waiver"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="Digital Waiver" subtitle="Consent capture and storage.">
                <AdminDigitalWaiver />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/system-logs"
        element={
          <RequireAdmin>
            <AdminShell>
              <AdminLayout title="System Logs" subtitle="Webhooks and audit trails.">
                <AdminSystemLogs />
              </AdminLayout>
            </AdminShell>
          </RequireAdmin>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
