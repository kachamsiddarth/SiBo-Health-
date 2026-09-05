import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center border-2 border-ink px-4 py-2 text-sm font-bold uppercase tracking-[0.08em] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-ink shadow-brutal',
    secondary: 'bg-white text-ink shadow-brutal',
    ghost: 'bg-transparent text-ink shadow-none'
  }

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
