import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <section className="bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-500">Hari ng Ahon 2026</p>
            <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          </div>
          <Link to="/" className="text-sm font-medium text-slate-700 hover:text-slate-900">
            Back to site
          </Link>
        </div>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-64">
            <nav className="rounded-xl border border-slate-200 bg-white p-3">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/admin/registrations"
                className={({ isActive }) =>
                  `mt-1 block rounded-md px-3 py-2 text-sm font-medium transition ${
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                Registrations
              </NavLink>
            </nav>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </section>
  )
}

