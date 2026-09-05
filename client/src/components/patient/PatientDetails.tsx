import type { PatientRecord } from '../../../../shared/schemas/patient.schema'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

const formatList = (values: string[] | undefined) => {
  if (!values || values.length === 0) {
    return 'Not provided'
  }

  return values.join(', ')
}

type PatientDetailsProps = {
  patient: PatientRecord | null
}

export function PatientDetails({ patient }: PatientDetailsProps) {
  if (!patient) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold text-slate-700">No patient record is active yet.</p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone="info">USER PROVIDED</Badge>
        <Badge tone="neutral">Patient Intake</Badge>
      </div>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-3 border-b-2 border-ink pb-2">
          <dt className="font-black uppercase tracking-[0.12em] text-slate-600">Name</dt>
          <dd className="font-semibold text-slate-800">{patient.name}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b-2 border-ink pb-2">
          <dt className="font-black uppercase tracking-[0.12em] text-slate-600">Age</dt>
          <dd className="font-semibold text-slate-800">{patient.age ?? 'Not provided'}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b-2 border-ink pb-2">
          <dt className="font-black uppercase tracking-[0.12em] text-slate-600">Sex</dt>
          <dd className="font-semibold text-slate-800">{patient.sex || 'Not provided'}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b-2 border-ink pb-2">
          <dt className="font-black uppercase tracking-[0.12em] text-slate-600">Symptoms</dt>
          <dd className="font-semibold text-slate-800">{formatList(patient.symptoms)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b-2 border-ink pb-2">
          <dt className="font-black uppercase tracking-[0.12em] text-slate-600">Conditions</dt>
          <dd className="font-semibold text-slate-800">{formatList(patient.conditions)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b-2 border-ink pb-2">
          <dt className="font-black uppercase tracking-[0.12em] text-slate-600">Allergies</dt>
          <dd className="font-semibold text-slate-800">{formatList(patient.allergies)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b-2 border-ink pb-2">
          <dt className="font-black uppercase tracking-[0.12em] text-slate-600">Medications</dt>
          <dd className="font-semibold text-slate-800">{formatList(patient.medications)}</dd>
        </div>
        <div className="flex justify-between gap-3 border-b-2 border-ink pb-2">
          <dt className="font-black uppercase tracking-[0.12em] text-slate-600">Notes</dt>
          <dd className="font-semibold text-slate-800">{patient.notes || 'Not provided'}</dd>
        </div>
      </dl>
    </Card>
  )
}
