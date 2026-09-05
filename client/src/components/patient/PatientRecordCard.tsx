import { BadgeCheck, FileText, UserRound } from 'lucide-react'

import type { PatientRecord } from '../../../../shared/schemas/patient.schema'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const formatList = (values: string[] | undefined) => {
  if (!values || values.length === 0) {
    return 'Not provided'
  }

  return values.join(', ')
}

type PatientRecordCardProps = {
  patient: PatientRecord | null
  onEdit: () => void
}

export function PatientRecordCard({ patient, onEdit }: PatientRecordCardProps) {
  if (!patient) {
    return (
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-stone-200 shadow-brutal">
            <UserRound className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Patient record</p>
            <h2 className="text-2xl font-black">No patient record yet</h2>
          </div>
        </div>
        <p className="mb-4 text-sm text-slate-700">Create a patient record to begin entering the intake data.</p>
        <button
          type="button"
          onClick={onEdit}
          className="border-2 border-ink bg-accent px-4 py-2 text-sm font-black uppercase tracking-[0.12em] shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        >
          Create Patient Record
        </button>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-sky-200 shadow-brutal">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Patient</p>
            <h2 className="text-2xl font-black">{patient.name}</h2>
          </div>
        </div>
        <Badge tone="info">User provided</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="border-2 border-ink bg-stone-100 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Age</p>
          <p className="mt-2 text-2xl font-black">{patient.age ?? 'Not provided'}</p>
        </div>
        <div className="border-2 border-ink bg-stone-100 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Sex</p>
          <p className="mt-2 text-xl font-black">{patient.sex || 'Not provided'}</p>
        </div>
        <div className="border-2 border-ink bg-stone-100 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Symptoms</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{formatList(patient.symptoms)}</p>
        </div>
        <div className="border-2 border-ink bg-stone-100 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">Conditions</p>
          <p className="mt-2 text-sm font-semibold text-slate-700">{formatList(patient.conditions)}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="border-2 border-ink bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Allergies</span>
          </div>
          <p className="text-sm font-semibold text-slate-700">{formatList(patient.allergies)}</p>
        </div>
        <div className="border-2 border-ink bg-white p-3">
          <div className="mb-2 flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Medications</span>
          </div>
          <p className="text-sm font-semibold text-slate-700">{formatList(patient.medications)}</p>
        </div>
      </div>

      <div className="mt-5 border-2 border-ink bg-orange-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Notes</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{patient.notes || 'Not provided'}</p>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onEdit}
          className="border-2 border-ink bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.12em] shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        >
          Edit Patient
        </button>
      </div>
    </Card>
  )
}
