import type { ReactNode } from 'react'

type AlertProps = {
  children: ReactNode
  tone?: 'info' | 'warning' | 'success'
}

export function Alert({ children, tone = 'info' }: AlertProps) {
  const toneClasses = {
    info: 'border-sky-500 bg-sky-100',
    warning: 'border-orange-500 bg-orange-100',
    success: 'border-green-500 bg-green-100'
  }

  return (
    <div className={`border-2 border-ink p-3 text-sm font-semibold shadow-brutal ${toneClasses[tone]}`}>
      {children}
    </div>
  )
}
