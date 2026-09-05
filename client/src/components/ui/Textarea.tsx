import type { TextareaHTMLAttributes } from 'react'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
}

export function Textarea({ label, className = '', ...props }: TextareaProps) {
  return (
    <label className="block text-left">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{label}</span>
      <textarea
        className={`w-full min-h-[110px] resize-y border-2 border-ink bg-white px-3 py-2 text-sm text-ink shadow-brutal outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${className}`}
        {...props}
      />
    </label>
  )
}
