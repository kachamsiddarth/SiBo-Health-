import { Activity, AlertCircle, CalendarDays, FileText, ShieldAlert } from 'lucide-react'

import { buildReportAnalysis } from '../../../../shared/analysis/reportAnalysis'
import type { PatientRecord } from '../../../../shared/schemas/patient.schema'
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

function renderStatusBadge(status: string) {
  const tone = status === 'unknown' ? 'neutral' : status === 'normal' ? 'success' : 'warning'
  return <Badge tone={tone}>{status}</Badge>
}

export function ReportResults({
  report,
  previousReport,
  patient
}: {
  report: MedicalReport | null
  previousReport?: MedicalReport | null
  patient?: PatientRecord | null
}) {
  if (!report) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold text-slate-700">No structured report has been extracted yet.</p>
      </Card>
    )
  }

  const analysis = buildReportAnalysis(patient ?? null, report, previousReport ?? null)

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
            {analysis.normalizedTests.map((test) => (
              <tr key={test.id}>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{test.normalizedParameter}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{test.originalParameter || test.parameter}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{String(test.value ?? 'Not provided')}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{test.unit || '—'}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{formatReferenceRange(test.referenceRange)}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">
                  {renderStatusBadge(test.referenceRangeStatus || test.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 border-2 border-ink bg-sky-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
          <Activity className="h-3 w-3" />
          Normalized information
        </div>
        <ul className="space-y-2 text-sm leading-6 text-slate-700">
          {analysis.normalizedTests.map((test) => (
            <li key={`${test.id}-normalized`}>
              <span className="font-black">{test.normalizedParameter}</span> — {test.originalParameter || test.parameter}
              {test.referenceRange && <span> | Reference: {formatReferenceRange(test.referenceRange)}</span>}
              {test.referenceRangeStatus && <span> | {test.referenceRangeStatus.toUpperCase()}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 border-2 border-ink bg-orange-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
          <ShieldAlert className="h-3 w-3" />
          Conflicts / NEEDS REVIEW
        </div>
        {analysis.conflicts.length > 0 ? (
          <ul className="space-y-3 text-sm leading-6 text-slate-700">
            {analysis.conflicts.map((conflict) => (
              <li key={conflict.id} className="border-2 border-ink bg-white p-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-black">{conflict.field}</span>
                  <Badge tone="warning">NEEDS REVIEW</Badge>
                </div>
                <p>{conflict.message}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Patient Intake: {conflict.values[0]?.value ?? 'Not available'}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  Current Report: {conflict.values[1]?.value ?? 'Not available'}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-semibold text-slate-700">No conflicts detected from the available patient intake and report data.</p>
        )}
      </div>

      <div className="mt-5 border-2 border-ink bg-stone-100 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
          <Activity className="h-3 w-3" />
          Longitudinal changes
        </div>
        {previousReport && previousReport.id !== report.id ? (
          <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {analysis.longitudinalChanges.length > 0 ? (
              analysis.longitudinalChanges.map((change) => (
                <li key={change.id}>
                  <span className="font-black uppercase">{change.direction}</span> — {change.message}
                </li>
              ))
            ) : (
              <li className="font-semibold text-slate-700">No longitudinal change detected between the previous and current reports.</li>
            )}
          </ul>
        ) : (
          <p className="text-sm font-semibold text-slate-700">No previous report is available for comparison yet.</p>
        )}
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
