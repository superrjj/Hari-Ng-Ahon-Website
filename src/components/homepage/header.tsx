import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Events', to: '/events', pending: true },
  { label: 'Results', to: '/results', pending: true },
  { label: 'Gallery', to: '/gallery', pending: true },
  { label: 'About', to: '#about', pending: true },
]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { session, logout, role } = useAuth()

  const showPendingPageToast = () => {
    toast.info('Oops! This page is not created yet.')
  }

  const onLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully.')
      setMobileOpen(false)
    } catch (error) {
      toast.error((error as Error).message || 'Failed to logout.')
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/98 shadow-[0_1px_12px_0_rgba(0,0,0,0.06)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
        {/* Logo */}
        <Link
          to={role === 'admin' ? '/admin' : '/'}
          className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-85"
        >
          <img src="/all_out_multisports_1.png" alt="All Out Multisports" className="h-14 w-auto" />
          <div className="h-7 w-px bg-slate-200" aria-hidden="true" />
          <img src="/hna-logo.png" alt="Hari Ng Ahon" className="h-14 w-auto" />
        </Link>

        {/* Desktop nav */}
        <div className="ml-auto flex items-center gap-2">
          <nav
            className="hidden items-center gap-0.5 text-sm font-medium md:flex"
            aria-label="Main navigation"
          >
            {role === 'admin' ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `rounded-lg px-3.5 py-2 transition-colors duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                Admin
              </NavLink>
            ) : (
              navItems.map((item) =>
                item.pending ? (
                  <button
                    key={item.label}
                    type="button"
                    className="rounded-lg px-3.5 py-2 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
                    onClick={showPendingPageToast}
                  >
                    {item.label}
                  </button>
                ) : item.to.startsWith('#') ? (
                  <a
                    key={item.label}
                    href={item.to}
                    className="rounded-lg px-3.5 py-2 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
                  >
                    {item.label}
                  </a>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded-lg px-3.5 py-2 transition-colors duration-150 ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ),
              )
            )}
          </nav>

          {/* Divider between nav and auth */}
          <div className="hidden h-5 w-px bg-slate-200 md:block" aria-hidden="true" />

          {/* Auth button */}
          {session ? (
            <button
              type="button"
              onClick={() => void onLogout()}
              className="hidden rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 md:inline-flex"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/auth?mode=login"
              className="hidden rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700 md:inline-flex"
            >
              Login
            </Link>
          )}

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav
          className="border-t border-slate-100 bg-white px-4 pb-4 pt-3 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-0.5">
            {role === 'admin' ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
                onClick={() => setMobileOpen(false)}
              >
                Admin
              </NavLink>
            ) : (
              navItems.map((item) =>
                item.pending ? (
                  <button
                    key={item.label}
                    type="button"
                    className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => {
                      showPendingPageToast()
                      setMobileOpen(false)
                    }}
                  >
                    {item.label}
                  </button>
                ) : item.to.startsWith('#') ? (
                  <a
                    key={item.label}
                    href={item.to}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ),
              )
            )}

            <div className="mt-3 border-t border-slate-100 pt-3">
              {session ? (
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/auth?mode=login"
                  className="block w-full rounded-lg bg-slate-900 px-3 py-2.5 text-center text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}