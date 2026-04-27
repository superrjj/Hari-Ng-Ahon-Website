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
  const { session, logout } = useAuth()
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
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link to="/" className="inline-flex items-center gap-3">
          <img src="/hna-logo.jpg" alt="Hari ng Ahon" className="h-15 w-auto" />
          <span className="text-base font-semibold text-slate-900">HARI NG AHON 2026</span>
        </Link>

        <div className="ml-auto flex items-center gap-3">
          <nav className="hidden items-center gap-1 text-sm font-medium md:flex" aria-label="Main navigation">
            {navItems.map((item) =>
              item.pending ? (
                <button
                  key={item.label}
                  type="button"
                  className="rounded-md px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  onClick={showPendingPageToast}
                >
                  {item.label}
                </button>
              ) : item.to.startsWith('#') ? (
                <a
                  key={item.label}
                  href={item.to}
                  className="rounded-md px-3 py-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 transition-colors ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>

          {session ? (
            <button
              type="button"
              onClick={() => void onLogout()}
              className="hidden rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 md:inline-flex"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/auth"
              className="hidden rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 md:ml-[30px] md:inline-flex"
            >
              Login / Sign up
            </Link>
          )}

          <button
            type="button"
            className="rounded-md p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-1">
            {navItems.map((item) =>
              item.pending ? (
                <button
                  key={item.label}
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
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
                  className="rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 text-sm ${
                      isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </NavLink>
              ),
            )}
            <div className="mt-2 border-t border-slate-200 pt-2">
              {session ? (
                <button
                  type="button"
                  onClick={() => void onLogout()}
                  className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="block w-full rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => setMobileOpen(false)}
                >
                  Login / Sign up
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
