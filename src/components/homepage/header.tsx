import { Link } from 'react-router-dom'

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link to="/" className="inline-flex items-center">
          <img src="/hna-logo.jpg" alt="Hari ng Ahon" className="h-15 w-auto" />
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link to="/" className="text-slate-700 hover:text-slate-900">Home</Link>
          <Link to="/events" className="text-slate-700 hover:text-slate-900">Events</Link>
          <Link to="/results" className="text-slate-700 hover:text-slate-900">Results</Link>
          <Link to="/gallery" className="text-slate-700 hover:text-slate-900">Gallery</Link>
          <a href="#about" className="text-slate-700 hover:text-slate-900">About</a>
        </nav>
      </div>
    </header>
  )
}
