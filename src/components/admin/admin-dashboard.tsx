import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bike,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileBarChart,
  Megaphone,
  QrCode,
  Settings,
  TrendingUp,
  Trophy,
  Upload,
  Users,
} from 'lucide-react'
import { adminApi, type AdminRegistrationRow } from '../../services/adminApi'

function StatCard({
  label,
  value,
  trend,
  icon: Icon,
  iconBg,
}: {
  label: string
  value: string
  trend: string
  icon: typeof Users
  iconBg: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[26px]">{value}</p>
          <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
            <TrendingUp className="h-3.5 w-3.5" />
            {trend}
          </p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5 text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}

function ChartPlaceholder({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-4 h-48 rounded-lg bg-slate-50/80">{children}</div>
    </div>
  )
}

function MonthlyRegistrationsChart() {
  const points = [20, 35, 28, 45, 38, 55, 48, 62, 58, 70, 65, 78]
  const max = Math.max(...points)
  const w = 280
  const h = 120
  const pad = 8
  const coords = points
    .map((p, i) => {
      const x = pad + (i / (points.length - 1)) * (w - pad * 2)
      const y = h - pad - (p / max) * (h - pad * 2)
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-full w-full" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="#1e4a8e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
      <polyline
        fill="url(#gradDash)"
        stroke="none"
        points={`${pad},${h - pad} ${coords} ${w - pad},${h - pad}`}
      />
      <defs>
        <linearGradient id="gradDash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e4a8e" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#1e4a8e" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function RevenueChart() {
  return (
    <svg viewBox="0 0 280 120" className="h-full w-full">
      <path
        d="M 8 100 Q 40 60 70 75 T 130 50 T 190 65 T 272 35 L 272 112 L 8 112 Z"
        fill="url(#revFill)"
        opacity={0.35}
      />
      <path
        d="M 8 100 Q 40 60 70 75 T 130 50 T 190 65 T 272 35"
        fill="none"
        stroke="#0d9488"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function BarTrendChart() {
  const bars = [40, 55, 48, 72, 65, 80, 58, 90, 75, 85, 70, 95]
  const max = Math.max(...bars)
  return (
    <div className="flex h-full items-end justify-between gap-1 px-2 pb-2 pt-4">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-[#6366f1]/80"
          style={{ height: `${(h / max) * 100}%`, minHeight: '8%' }}
        />
      ))}
    </div>
  )
}

function DonutCategory() {
  const segments = [
    { label: 'Road Bike', pct: 40, color: '#1e4a8e' },
    { label: 'MTB', pct: 30, color: '#0d9488' },
    { label: 'Gravel', pct: 15, color: '#d97706' },
    { label: 'Fun Ride', pct: 10, color: '#7c3aed' },
    { label: 'Elite', pct: 5, color: '#64748b' },
  ]
  let acc = 0
  const gradientStops = segments
    .map((s) => {
      const start = acc
      acc += s.pct
      return `${s.color} ${start}% ${acc}%`
    })
    .join(', ')
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-2 sm:flex-row sm:gap-6">
      <div
        className="relative h-28 w-28 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(${gradientStops})`,
        }}
      >
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
          <span className="text-lg font-bold text-slate-900">2,458</span>
          <span className="text-[10px] text-slate-500">total</span>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:block">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-slate-700">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} ({s.pct}%)
          </li>
        ))}
      </ul>
    </div>
  )
}

const quickActions = [
  { label: 'Create Event', to: '/admin/events', icon: CalendarDays },
  { label: 'Manage Registrations', to: '/admin/registrations', icon: ClipboardList },
  { label: 'View Payments', to: '/admin/payments', icon: CreditCard },
  { label: 'QR Code Race Kit', to: '/admin/qr-code-race-kit', icon: QrCode },
  { label: 'Upload Results', to: '/admin/results', icon: Upload },
  { label: 'Create Announcement', to: '/admin/announcements', icon: Megaphone },
  { label: 'View Reports', to: '/admin/reports', icon: FileBarChart },
  { label: 'System Settings', to: '/admin/settings', icon: Settings },
] as const

function initials(email: string) {
  const local = email.split('@')[0] ?? '?'
  return local.slice(0, 2).toUpperCase()
}

function statusPill(status: string) {
  const s = status.toLowerCase()
  if (s === 'paid') return 'bg-emerald-100 text-emerald-800'
  if (s === 'pending' || s === 'pending_payment') return 'bg-amber-100 text-amber-800'
  if (s === 'failed') return 'bg-rose-100 text-rose-800'
  return 'bg-slate-100 text-slate-700'
}

export function AdminDashboard() {
  const [rows, setRows] = useState<AdminRegistrationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    void adminApi
      .registrationsList()
      .then((data) => {
        if (!active) return
        setRows(data)
      })
      .catch((e) => {
        if (!active) return
        setError((e as Error).message || 'Failed to load admin data.')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const stats = useMemo(() => {
    const totalRegs = rows.length
    const paid = rows.filter((r) => String(r.payment_status ?? '').toLowerCase() === 'paid').length
    const uniqueEmails = new Set(rows.map((r) => r.registrant_email).filter(Boolean)).size
    return {
      totalRegs,
      paid,
      cyclists: uniqueEmails || totalRegs,
      activeEvents: 8,
      completedEvents: 12,
      revenue: paid * 1000,
    }
  }, [rows])

  const recent = rows.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          label="Total Cyclists"
          value={stats.cyclists.toLocaleString()}
          trend="+12% from last month"
          icon={Users}
          iconBg="bg-blue-600"
        />
        <StatCard
          label="Total Registrations"
          value={stats.totalRegs.toLocaleString()}
          trend="+12% from last month"
          icon={ClipboardList}
          iconBg="bg-emerald-600"
        />
        <StatCard
          label="Active Events"
          value={String(stats.activeEvents)}
          trend="+12% from last month"
          icon={CalendarDays}
          iconBg="bg-violet-600"
        />
        <StatCard
          label="Completed Events"
          value={String(stats.completedEvents)}
          trend="+12% from last month"
          icon={Trophy}
          iconBg="bg-orange-500"
        />
        <StatCard
          label="Paid Registrations"
          value={stats.paid.toLocaleString()}
          trend="+12% from last month"
          icon={CreditCard}
          iconBg="bg-teal-600"
        />
        <StatCard
          label="Revenue Summary"
          value={`₱${stats.revenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`}
          trend="+12% from last month"
          icon={Bike}
          iconBg="bg-lime-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <ChartPlaceholder title="Monthly Registrations">
          <MonthlyRegistrationsChart />
        </ChartPlaceholder>
        <ChartPlaceholder title="Revenue Analytics">
          <RevenueChart />
        </ChartPlaceholder>
        <ChartPlaceholder title="Event Participation Trends">
          <BarTrendChart />
        </ChartPlaceholder>
        <ChartPlaceholder title="Category Participation">
          <DonutCategory />
        </ChartPlaceholder>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-1">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Recent Registrations</h3>
            <Link to="/admin/registrations" className="text-xs font-medium text-[#1e4a8e] hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Rider</th>
                  <th className="px-4 py-2 font-medium">Event</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {error ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-rose-600">
                      {error}
                    </td>
                  </tr>
                ) : null}
                {!loading &&
                  recent.map((r) => (
                    <tr key={r.id} className="text-slate-800">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                            {r.registrant_email ? initials(r.registrant_email) : '—'}
                          </span>
                          <span className="max-w-[120px] truncate text-xs sm:text-sm">
                            {r.registrant_email ?? r.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="max-w-[100px] truncate px-4 py-3 text-xs sm:text-sm">
                        {r.event_title ?? r.race_type ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusPill(String(r.payment_status ?? 'pending'))}`}
                        >
                          {String(r.payment_status ?? 'pending')}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                {!loading && !error && recent.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No registrations yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Upcoming Events</h3>
            <Link to="/admin/events" className="text-xs font-medium text-[#1e4a8e] hover:underline">
              Manage
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 p-2">
            {[
              { name: 'Hari ng Ahon — Criterium', date: 'May 30, 2026', prog: '654 / 800', published: true },
              { name: 'Hari ng Ahon — ITT', date: 'May 31, 2026', prog: '420 / 600', published: true },
              { name: 'Season Finale (draft)', date: 'Jun 15, 2026', prog: '0 / 500', published: false },
            ].map((ev) => (
              <li key={ev.name} className="flex gap-3 rounded-lg p-2 hover:bg-slate-50">
                <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-200" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{ev.name}</p>
                  <p className="text-xs text-slate-500">{ev.date}</p>
                  <p className="mt-1 text-xs text-slate-600">Registration: {ev.prog}</p>
                </div>
                <span
                  className={`h-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    ev.published ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {ev.published ? 'Published' : 'Draft'}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Latest Announcements</h3>
            <Link to="/admin/announcements" className="text-xs font-medium text-[#1e4a8e] hover:underline">
              New
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 p-2">
            {[
              { title: 'Route update — ITT segment', snippet: 'Minor adjustment near Radar station…', date: 'Apr 26' },
              { title: 'Bib claiming schedule', snippet: 'Claiming opens May 28 at Burnham…', date: 'Apr 22' },
              { title: 'Weather advisory', snippet: 'Prepare for cool morning temps…', date: 'Apr 20' },
            ].map((a) => (
              <li key={a.title} className="flex gap-3 rounded-lg p-2 hover:bg-slate-50">
                <div className="h-12 w-12 shrink-0 rounded-lg bg-[#cfae3f]/30" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="line-clamp-2 text-xs text-slate-600">{a.snippet}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{a.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {quickActions.map(({ label, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-4 text-center text-xs font-medium text-slate-800 transition hover:border-[#1e4a8e]/40 hover:bg-slate-50"
            >
              <Icon className="h-5 w-5 text-[#1e4a8e]" strokeWidth={2} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
