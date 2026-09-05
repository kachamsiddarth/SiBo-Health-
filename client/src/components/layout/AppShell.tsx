import type { ReactNode } from 'react'

import { Navbar } from './Navbar'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</main>
    </div>
  )
}
