import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`border-2 border-ink bg-white p-4 shadow-brutal ${className}`}>{children}</div>
}
