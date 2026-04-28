import { Link, NavLink } from 'react-router-dom'
import {
  Bike,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileSignature,
  Hash,
  Images,
  LayoutDashboard,
  Mail,
  Megaphone,
  QrCode,
  ScrollText,
  Settings,
  Trophy,
  X,
} from 'lucide-react'

const SIDEBAR_BG = '#ffffff'
const SIDEBAR_ACTIVE = '#1e4a8e'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }

const mainNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/events', label: 'Events Management', icon: CalendarDays },
  { to: '/admin/registrations', label: 'Registrations', icon: ClipboardList },
  { to: '/admin/payments', label: 'Online Payments', icon: CreditCard },
  { to: '/admin/bibs', label: 'Auto Race Bib Generator', icon: Hash },
  { to: '/admin/results', label: 'Results Management', icon: Trophy },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/gallery', label: 'Gallery', icon: Images },
  { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const moreNav: NavItem[] = [
  { to: '/admin/check-in', label: 'QR Code Check-in', icon: QrCode },
  { to: '/admin/email-notifications', label: 'Email Notifications', icon: Mail },
  { to: '/admin/rider-dashboard', label: 'Rider Dashboard', icon: Bike },
  { to: '/admin/digital-waiver', label: 'Digital Waiver', icon: FileSignature },
  { to: '/admin/system-logs', label: 'System Logs', icon: ScrollText },
]

function navClassName({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
  }`
}

function NavItemLink({ item }: { item: NavItem }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => navClassName({ isActive })}
      style={({ isActive }) => ({
        backgroundColor: isActive ? SIDEBAR_ACTIVE : 'transparent',
      })}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={2} />
      <span className="leading-snug">{item.label}</span>
    </NavLink>
  )
}

export function AdminSidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean
  onCloseMobile: () => void
}) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-hidden border-r border-slate-200 shadow-sm transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
      style={{ backgroundColor: SIDEBAR_BG }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4">
        <Link to="/admin" className="flex min-w-0 items-center gap-2" onClick={onCloseMobile}>
          <img src="/hna-logo.jpg" alt="Hari ng Ahon" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-900">Hari ng Ahon 2026</p>
            <p className="truncate text-[11px] text-slate-500">Cycling Event System</p>
          </div>
        </Link>
        <button
          type="button"
          className="rounded-md p-1 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-hidden px-3 py-4">
        <div className="space-y-1">
          {mainNav.map((item) => (
            <div key={item.to} onClick={onCloseMobile}>
              <NavItemLink item={item} />
            </div>
          ))}
        </div>

        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">More features</p>
        <div className="space-y-1">
          {moreNav.map((item) => (
            <div key={item.to} onClick={onCloseMobile}>
              <NavItemLink item={item} />
            </div>
          ))}
        </div>
      </nav>
    </aside>
  )
}
