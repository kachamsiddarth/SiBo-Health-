import { AlertCircle, CalendarDays, FileText } from 'lucide-react'

import type { MedicalReport } from '../../../../shared/schemas/report.schema'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'

function formatReferenceRange(range: MedicalReport['tests'][number]['referenceRange']) {
  if (!range) {
    return 'Reference range not provided'
  }

  if (range.text) {
    return range.text
  }

  if (range.low !== undefined && range.high !== undefined) {
    return `${range.low} - ${range.high}`
  }

  if (range.low !== undefined) {
    return `≥ ${range.low}`
  }

  if (range.high !== undefined) {
    return `≤ ${range.high}`
  }

  return 'Reference range not provided'
}

export function ReportResults({ report }: { report: MedicalReport | null }) {
  if (!report) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold text-slate-700">No structured report has been extracted yet.</p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Structured output</p>
          <h2 className="text-2xl font-black">Medical report</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">AI extracted</Badge>
          <Badge tone="neutral">{report.source.label}</Badge>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="border-2 border-ink bg-stone-100 p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
            <CalendarDays className="h-3 w-3" />
            Report date
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">{report.reportDate || 'Not provided'}</p>
        </div>
        <div className="border-2 border-ink bg-stone-100 p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
            <FileText className="h-3 w-3" />
            Source
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">{report.source.fileName || report.source.label}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-2 border-ink text-left">
          <thead className="bg-stone-100">
            <tr>
              <th className="border-b-2 border-ink px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Parameter</th>
              <th className="border-b-2 border-ink px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Original</th>
              <th className="border-b-2 border-ink px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Value</th>
              <th className="border-b-2 border-ink px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Unit</th>
              <th className="border-b-2 border-ink px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Reference range</th>
              <th className="border-b-2 border-ink px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {report.tests.map((test) => (
              <tr key={test.id}>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{test.parameter}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{test.originalParameter || test.parameter}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{String(test.value ?? 'Not provided')}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{test.unit || '—'}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{formatReferenceRange(test.referenceRange)}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">
                  <Badge tone={test.status === 'unknown' ? 'neutral' : test.status === 'normal' ? 'success' : 'warning'}>
                    {test.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report.observations && report.observations.length > 0 && (
        <div className="mt-5 border-2 border-ink bg-yellow-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
            <AlertCircle className="h-3 w-3" />
            Observations
          </div>
          <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {report.observations.map((observation) => (
              <li key={observation}>{observation}</li>
            ))}
          </ul>
        </div>
      )}

      {report.extractedNotes && report.extractedNotes.length > 0 && (
        <div className="mt-5 border-2 border-ink bg-sky-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Extracted notes</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
            {report.extractedNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
