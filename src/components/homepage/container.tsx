import type { ReactNode } from 'react'

export function Container({ children }: { children?: ReactNode }) {
  return <div className="min-h-screen bg-white text-slate-900">{children}</div>
}