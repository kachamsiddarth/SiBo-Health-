import type { ReactNode } from 'react'

import type { BadgeTone } from '../../lib/mock-data'

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  const toneClasses: Record<BadgeTone, string> = {
    neutral: 'bg-stone-200 text-ink',
    accent: 'bg-accent text-ink',
    success: 'bg-green-200 text-ink',
    info: 'bg-sky-200 text-ink',
    warning: 'bg-orange-200 text-ink'
  }

  return (
    <span className={`inline-flex items-center border-2 border-ink px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
