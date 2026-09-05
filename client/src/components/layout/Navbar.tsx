import { Bell, Menu, Search } from 'lucide-react'

export function Navbar() {
  return (
    <header className="border-b-2 border-ink bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-accent shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center border-2 border-ink bg-accent text-sm font-black shadow-brutal">
              S
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">SiBo</p>
              <p className="text-sm font-semibold text-slate-700">Clinical Information Intelligence</p>
            </div>
          </div>
        </div>

        <nav aria-label="Main navigation" className="hidden items-center gap-2 md:flex">
          <button type="button" className="border-2 border-ink bg-white px-3 py-2 text-sm font-bold uppercase tracking-[0.08em] shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2">
            Dashboard
          </button>
          <button type="button" className="border-2 border-ink bg-white px-3 py-2 text-sm font-bold uppercase tracking-[0.08em] shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2">
            Patients
          </button>
          <button type="button" className="border-2 border-ink bg-white px-3 py-2 text-sm font-bold uppercase tracking-[0.08em] shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2">
            Reports
          </button>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-white shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-white shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
