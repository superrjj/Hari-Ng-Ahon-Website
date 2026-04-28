import type { ReactNode } from 'react'

/** Full-viewport admin chrome without the public site header. */
export function AdminShell({ children }: { children: ReactNode }) {
  return <div className="h-screen overflow-hidden bg-[#f4f6f9] text-slate-900">{children}</div>
}
