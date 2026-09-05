import { AlertTriangle, CheckCheck, PencilLine, ShieldCheck } from 'lucide-react'

import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

type ReviewItem = {
  title: string
  intake: string
  report: string
  action: string
}

type ReviewPanelProps = {
  reviewItems: ReviewItem[]
}

export function ReviewPanel({ reviewItems }: ReviewPanelProps) {
  return (
    <Card className="bg-orange-50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="text-xl font-black uppercase tracking-tight">Needs Review</h2>
        </div>
        <div className="border-2 border-ink bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] shadow-brutal">
          Human Review
        </div>
      </div>

      <div className="space-y-4">
        {reviewItems.map((item) => (
          <div key={item.title} className="border-2 border-ink bg-white p-4 shadow-brutal">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">{item.title}</p>
              <span className="border-2 border-ink bg-orange-200 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                Needs review
              </span>
            </div>

            <dl className="space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3 border-b border-ink/40 pb-1">
                <dt className="font-bold uppercase tracking-[0.12em] text-slate-600">Intake</dt>
                <dd>{item.intake}</dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-b border-ink/40 pb-1">
                <dt className="font-bold uppercase tracking-[0.12em] text-slate-600">Report</dt>
                <dd>{item.report}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="font-bold uppercase tracking-[0.12em] text-slate-600">Action</dt>
                <dd>{item.action}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" variant="primary" className="gap-2">
          <ShieldCheck className="h-4 w-4" />
          Verify
        </Button>
        <Button type="button" variant="secondary" className="gap-2">
          <PencilLine className="h-4 w-4" />
          Edit
        </Button>
        <Button type="button" variant="ghost" className="gap-2 border-2 border-ink bg-white shadow-brutal">
          <CheckCheck className="h-4 w-4" />
          Resolve
        </Button>
      </div>
    </Card>
  )
}
