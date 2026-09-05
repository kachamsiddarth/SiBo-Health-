import { ArrowRight, FileText } from 'lucide-react'

import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type SummaryCardProps = {
  title: string
  subtitle: string
  description: string
}

export function SummaryCard({ title, subtitle, description }: SummaryCardProps) {
  return (
    <Card className="bg-sky-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-white shadow-brutal">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">{subtitle}</p>
            <h3 className="text-xl font-black">{title}</h3>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-700">{description}</p>

      <div className="mt-5">
        <Button type="button" variant="primary" className="gap-2">
          View summary
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
