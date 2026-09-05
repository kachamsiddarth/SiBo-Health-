import { Activity, UserRound } from 'lucide-react'

import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

type PatientCardProps = {
  name: string
  age: number
  sex: string
  symptoms: string[]
  reports: number
  reviewItems: number
  source: string
}

export function PatientCard({ name, age, sex, symptoms, reports, reviewItems, source }: PatientCardProps) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-sky-200 shadow-brutal">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-600">Patient</p>
            <h2 className="mt-1 text-2xl font-black">{name}</h2>
          </div>
        </div>
        <Badge tone="info">User provided</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="border-2 border-ink bg-stone-100 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Age</p>
          <p className="mt-2 text-2xl font-black">{age}</p>
        </div>
        <div className="border-2 border-ink bg-stone-100 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Sex</p>
          <p className="mt-2 text-xl font-black">{sex}</p>
        </div>
        <div className="border-2 border-ink bg-stone-100 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Reports</p>
          <p className="mt-2 text-2xl font-black">{reports}</p>
        </div>
        <div className="border-2 border-ink bg-stone-100 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Review Items</p>
          <p className="mt-2 text-2xl font-black">{reviewItems}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Symptoms</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {symptoms.map((symptom) => (
              <Badge key={symptom} tone="accent">
                {symptom}
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-2 border-ink bg-green-100 p-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-bold uppercase tracking-[0.12em]">Source</span>
          </div>
          <span className="text-sm font-semibold text-slate-700">{source}</span>
        </div>
      </div>
    </Card>
  )
}
