import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthPage } from '../components/auth/auth-page'
import { AdminDashboard } from '../components/admin/admin-dashboard'
import { AdminLayout } from '../components/admin/admin-layout'
import { AdminRegistrations } from '../components/admin/admin-registrations'
import { AdminRegistrationDetail } from '../components/admin/admin-registration-detail'
import { Hero } from '../components/homepage/hero'
import { RegistrationForm } from '../components/homepage/registration-form'
import { RegistrationInfo } from '../components/homepage/registration-info'
import { RegistrationPayment } from '../components/homepage/registration-payment'
import { Shell } from '../components/Shell'
import { useAuth } from '../hooks/useAuth'

function HomePagePlaceholder() {
  return <Hero />
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
      <Route path="/" element={<Shell><HomePagePlaceholder /></Shell>} />
      <Route path="/auth" element={<Shell><AuthPage /></Shell>} />
      <Route path="/register/info" element={<Shell><RegistrationInfo /></Shell>} />
      <Route path="/register/form" element={<RequireAuth redirectTo="/register/form"><Shell><RegistrationForm /></Shell></RequireAuth>} />
      <Route path="/register/payment" element={<RequireAuth redirectTo="/register/payment"><Shell><RegistrationPayment /></Shell></RequireAuth>} />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <Shell>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </Shell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/registrations"
        element={
          <RequireAdmin>
            <Shell>
              <AdminLayout>
                <AdminRegistrations />
              </AdminLayout>
            </Shell>
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/registrations/:id"
        element={
          <RequireAdmin>
            <Shell>
              <AdminLayout>
                <AdminRegistrationDetail />
              </AdminLayout>
            </Shell>
          </RequireAdmin>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
