import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <label className="block text-left">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{label}</span>
      <input
        className={`w-full border-2 border-ink bg-white px-3 py-2 text-sm text-ink shadow-brutal outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${className}`}
        {...props}
      />
    </label>
  )
}
