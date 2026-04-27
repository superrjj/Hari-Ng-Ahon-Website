import { Link } from 'react-router-dom'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Events', to: '/events' },
  { label: 'Results', to: '/results' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'About', to: '#about' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3">
        <Link to="/" className="inline-flex items-center">
          <img src="/hna-logo.jpg" alt="Hari ng Ahon" className="h-12 w-auto" />
        </Link>

        <nav className="flex items-center gap-5 text-sm font-medium" aria-label="Main navigation">
          {navItems.map((item) =>
            item.to.startsWith('#') ? (
              <a key={item.label} href={item.to} className="text-slate-600 transition-colors hover:text-slate-900">
                {item.label}
              </a>
            ) : (
              <Link key={item.label} to={item.to} className="text-slate-600 transition-colors hover:text-slate-900">
                {item.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  )
}
