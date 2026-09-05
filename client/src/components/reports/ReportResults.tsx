import { Activity, AlertCircle, CalendarDays, FileText, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { generateMedicalSummary } from '../../api/reports'
import { buildReportAnalysis } from '../../../../shared/analysis/reportAnalysis'
import type { PatientRecord } from '../../../../shared/schemas/patient.schema'
import type { MedicalReport } from '../../../../shared/schemas/report.schema'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
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

function buildDeterministicSummary(
  report: MedicalReport | null,
  previousReport?: MedicalReport | null,
  patient?: PatientRecord | null
) {
  if (!report) {
    return 'No structured report is available yet.'
  }

  const notable = report.tests.slice(0, 3).map((test) => {
    const value = typeof test.value === 'number' ? test.value : String(test.value ?? 'not provided')
    const range = test.referenceRange?.text ? `, reference ${test.referenceRange.text}` : ''
    return `${test.parameter}: ${value}${range}`
  })

  const contextBits: string[] = []
  if (report.patientContext?.allergies?.length) {
    contextBits.push(`allergies: ${report.patientContext.allergies.join(', ')}`)
  }
  if (report.patientContext?.medications?.length) {
    contextBits.push(`medications: ${report.patientContext.medications.join(', ')}`)
  }
  if (patient?.allergies?.length) {
    contextBits.push(`patient allergies: ${patient.allergies.join(', ')}`)
  }
  if (patient?.medications?.length) {
    contextBits.push(`patient medications: ${patient.medications.join(', ')}`)
  }
  if (previousReport) {
    contextBits.push(`previous report available for longitudinal comparison`)
  }

  return [
    'The report contains extracted clinical information.',
    notable.length > 0 ? `Key values: ${notable.join('; ')}.` : 'No numeric values were extracted.',
    contextBits.length > 0 ? `Relevant context: ${contextBits.join('; ')}.` : 'No additional patient context was captured.',
    'Please review any conflict or low/high/unknown statuses before final interpretation.'
  ].join(' ')
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
  const [localReport, setLocalReport] = useState<MedicalReport | null>(report)
  const [resolvedConflictIds, setResolvedConflictIds] = useState<string[]>([])
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    setLocalReport(report)
    setResolvedConflictIds([])
    setSummary('')
  }, [report])

  useEffect(() => {
    if (!localReport) {
      return
    }

    let isCancelled = false
    setSummaryLoading(true)
    generateMedicalSummary({ patient: patient ?? null, report: localReport, previousReport: previousReport ?? null })
      .then((result: { summary: string }) => {
        if (!isCancelled) {
          setSummary(result.summary)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setSummary(buildDeterministicSummary(localReport, previousReport, patient))
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setSummaryLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [localReport, patient, previousReport])

  const analysis = useMemo(
    () => buildReportAnalysis(patient ?? null, localReport, previousReport ?? null),
    [localReport, patient, previousReport]
  )

  const activeConflicts = localReport
    ? analysis.conflicts.filter((conflict) => !resolvedConflictIds.includes(conflict.id))
    : []

  const reviewCounts = useMemo(() => {
    const counts = { 'AI-EXTRACTED': 0, 'NEEDS REVIEW': 0, 'HUMAN-EDITED': 0, 'HUMAN-VERIFIED': 0, RESOLVED: 0 }

    if (!localReport) {
      return counts
    }

    for (const test of localReport.tests) {
      const status = test.reviewStatus ?? 'AI-EXTRACTED'
      counts[status as keyof typeof counts] += 1
    }

    counts['NEEDS REVIEW'] = activeConflicts.length
    counts.RESOLVED = resolvedConflictIds.length

    return counts
  }, [localReport, activeConflicts.length, resolvedConflictIds.length])

  if (!localReport) {
    return (
      <Card className="p-5">
        <p className="text-sm font-semibold text-slate-700">No structured report has been extracted yet.</p>
      </Card>
    )
  }

  const updateTest = (testId: string, field: 'parameter' | 'value' | 'unit' | 'observation', value: string) => {
    setLocalReport((current: MedicalReport | null) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        reviewStatus: 'HUMAN-EDITED',
        tests: current.tests.map((test: MedicalReport['tests'][number]) => {
          if (test.id !== testId) {
            return test
          }

          if (field === 'value') {
            const parsedNumber = Number(value)
            return {
              ...test,
              value: value === '' ? undefined : Number.isFinite(parsedNumber) ? parsedNumber : value,
              reviewStatus: 'HUMAN-EDITED'
            }
          }

          return {
            ...test,
            [field]: value,
            reviewStatus: 'HUMAN-EDITED'
          }
        })
      }
    })
  }

  const updateReferenceRange = (testId: string, value: string) => {
    setLocalReport((current: MedicalReport | null) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        reviewStatus: 'HUMAN-EDITED',
        tests: current.tests.map((test: MedicalReport['tests'][number]) => {
          if (test.id !== testId) {
            return test
          }

          return {
            ...test,
            referenceRange: {
              ...(test.referenceRange ?? {}),
              text: value || undefined,
              low: test.referenceRange?.low,
              high: test.referenceRange?.high
            },
            reviewStatus: 'HUMAN-EDITED'
          }
        })
      }
    })
  }

  const verifyTest = (testId: string) => {
    setLocalReport((current: MedicalReport | null) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        reviewStatus: 'HUMAN-VERIFIED',
        tests: current.tests.map((test: MedicalReport['tests'][number]) =>
          test.id === testId ? { ...test, reviewStatus: 'HUMAN-VERIFIED' } : test
        )
      }
    })
  }

  const markConflictResolved = (conflictId: string) => {
    setResolvedConflictIds((current) => [...new Set([...current, conflictId])])
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Structured output</p>
          <h2 className="text-2xl font-black">Medical report</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="info">{localReport.reviewStatus ?? 'AI-EXTRACTED'}</Badge>
          <Badge tone="neutral">{localReport.source.label}</Badge>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="border-2 border-ink bg-stone-100 p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
            <CalendarDays className="h-3 w-3" />
            Report date
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">{localReport.reportDate || 'Not provided'}</p>
        </div>
        <div className="border-2 border-ink bg-stone-100 p-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
            <FileText className="h-3 w-3" />
            Source
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-700">{localReport.source.fileName || localReport.source.label}</p>
        </div>
      </div>

      <div className="mb-4 border-2 border-ink bg-stone-100 p-3">
        <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Review status</div>
        <div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
          <span>{reviewCounts['AI-EXTRACTED']} AI-extracted</span>
          <span>{reviewCounts['HUMAN-VERIFIED']} human-verified</span>
          <span>{reviewCounts['NEEDS REVIEW']} needs review</span>
          <span>{reviewCounts.RESOLVED} resolved</span>
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
              <th className="border-b-2 border-ink px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Review</th>
            </tr>
          </thead>
          <tbody>
            {analysis.normalizedTests.map((test) => (
              <tr key={test.id}>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">
                  <input
                    className="w-full border-2 border-ink bg-white px-2 py-1 text-sm font-semibold text-slate-700"
                    value={test.parameter}
                    onChange={(event) => updateTest(test.id, 'parameter', event.target.value)}
                  />
                </td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">{test.originalParameter || test.parameter}</td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">
                  <input
                    className="w-full border-2 border-ink bg-white px-2 py-1 text-sm font-semibold text-slate-700"
                    value={String(test.value ?? '')}
                    onChange={(event) => updateTest(test.id, 'value', event.target.value)}
                  />
                </td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">
                  <input
                    className="w-full border-2 border-ink bg-white px-2 py-1 text-sm font-semibold text-slate-700"
                    value={test.unit ?? ''}
                    onChange={(event) => updateTest(test.id, 'unit', event.target.value)}
                  />
                </td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">
                  <input
                    className="w-full border-2 border-ink bg-white px-2 py-1 text-sm font-semibold text-slate-700"
                    value={test.referenceRange?.text ?? ''}
                    onChange={(event) => updateReferenceRange(test.id, event.target.value)}
                  />
                </td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">
                  {renderStatusBadge(test.referenceRangeStatus || test.status)}
                </td>
                <td className="border-b-2 border-ink px-3 py-3 text-sm font-semibold text-slate-700">
                  <div className="flex flex-col gap-2">
                    <Badge tone={test.reviewStatus === 'HUMAN-VERIFIED' ? 'success' : 'warning'}>{test.reviewStatus ?? 'AI-EXTRACTED'}</Badge>
                    <Button type="button" variant="secondary" onClick={() => verifyTest(test.id)}>
                      Verify
                    </Button>
                  </div>
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
        {activeConflicts.length > 0 ? (
          <ul className="space-y-3 text-sm leading-6 text-slate-700">
            {activeConflicts.map((conflict) => (
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
                <div className="mt-2">
                  <Button type="button" variant="secondary" onClick={() => markConflictResolved(conflict.id)}>
                    Mark resolved
                  </Button>
                </div>
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
        {previousReport && previousReport.id !== localReport.id ? (
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

      <div className="mt-5 border-2 border-ink bg-sky-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
          <Activity className="h-3 w-3" />
          AI summary
        </div>
        {summaryLoading ? (
          <p className="text-sm font-semibold text-slate-700">Generating summary from structured patient and report data...</p>
        ) : (
          <p className="text-sm leading-6 text-slate-700">{summary || buildDeterministicSummary(localReport, previousReport, patient)}</p>
        )}
      </div>

      {localReport.observations && localReport.observations.length > 0 && (
        <div className="mt-5 border-2 border-ink bg-yellow-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">
            <AlertCircle className="h-3 w-3" />
            Observations
          </div>
          <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {localReport.observations.map((observation: string) => (
              <li key={observation}>{observation}</li>
            ))}
          </ul>
        </div>
      )}

      {localReport.extractedNotes && localReport.extractedNotes.length > 0 && (
        <div className="mt-5 border-2 border-ink bg-sky-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-600">Extracted notes</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
            {localReport.extractedNotes.map((note: string) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
