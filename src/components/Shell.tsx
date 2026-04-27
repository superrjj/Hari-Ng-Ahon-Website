import type { ReactNode } from 'react'
import { Header } from './homepage/header'
import { Container } from './homepage/container'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header />
      <main className="flex-1">
        <Container>{children}</Container>
      </main>
    </div>
  )
}
