import type { PatientRecord } from '../schemas/patient.schema'
import type { ExtractedTest, MedicalReport, ReferenceRange } from '../schemas/report.schema'

export type ReferenceRangeStatus = 'low' | 'normal' | 'high' | 'unknown'
export type LongitudinalDirection = 'increased' | 'decreased' | 'stable' | 'new' | 'missing'

export type NormalizedTest = ExtractedTest & {
  normalizedParameter: string
  referenceRangeStatus: ReferenceRangeStatus
}

export type ReviewConflict = {
  id: string
  field: string
  values: Array<{ value: string; source: string }>
  message: string
  status: 'open' | 'resolved'
}

function normalizeList(values: unknown): string[] {
  if (!values) {
    return []
  }

  if (Array.isArray(values)) {
    return values
      .map((value) => String(value ?? '').trim())
      .filter(Boolean)
      .map((value) => value.replace(/\s+/g, ' '))
  }

  if (typeof values === 'string') {
    return values
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => part.replace(/\s+/g, ' '))
  }

  return []
}

function normalizeConflictValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isMissingValue(value: string): boolean {
  const cleaned = normalizeConflictValue(value)
  return !cleaned || ['not provided', 'not available', 'n/a', 'unknown', 'not specified'].includes(cleaned)
}

function isExplicitNegativeValue(value: string): boolean {
  const cleaned = normalizeConflictValue(value)
  if (!cleaned) {
    return false
  }

  return cleaned === 'none' || cleaned === 'no known' || cleaned.startsWith('no known ')
}

export type LongitudinalChange = {
  id: string
  parameter: string
  direction: LongitudinalDirection
  previousValue?: number | string
  currentValue?: number | string
  message: string
}

const PARAMETER_ALIASES: Record<string, string> = {
  hb: 'Hemoglobin',
  hgb: 'Hemoglobin',
  hemoglobin: 'Hemoglobin',
  wbc: 'White Blood Cell Count',
  whitebloodcellcount: 'White Blood Cell Count',
  whitebloodcells: 'White Blood Cell Count',
  plt: 'Platelet Count',
  plateletcount: 'Platelet Count',
  platelets: 'Platelet Count',
  rbc: 'Red Blood Cell Count',
  redbloodcellcount: 'Red Blood Cell Count',
  hct: 'Hematocrit',
  hematocrit: 'Hematocrit',
  creatinine: 'Creatinine',
  sodium: 'Sodium',
  potassium: 'Potassium',
  tsh: 'TSH',
  t4: 'Free T4',
  'free t4': 'Free T4',
  'vitamin d': 'Vitamin D',
  'vitamin-d': 'Vitamin D'
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export function normalizeParameterName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'Unspecified Parameter'
  }

  const normalizedKey = normalizeText(trimmed)
  return PARAMETER_ALIASES[normalizedKey] ?? trimmed
}

export function evaluateReferenceRange(value: number | string | undefined, range: ReferenceRange | undefined): ReferenceRangeStatus {
  const numericValue = toNumber(value)

  if (numericValue === undefined) {
    return 'unknown'
  }

  if (!range) {
    return 'unknown'
  }

  const low = typeof range.low === 'number' ? range.low : undefined
  const high = typeof range.high === 'number' ? range.high : undefined

  if (low !== undefined && high !== undefined) {
    if (numericValue < low) {
      return 'low'
    }

    if (numericValue > high) {
      return 'high'
    }

    return 'normal'
  }

  if (low !== undefined) {
    return numericValue < low ? 'low' : 'normal'
  }

  if (high !== undefined) {
    return numericValue > high ? 'high' : 'normal'
  }

  return 'unknown'
}

export function normalizeReportTests(report: MedicalReport | null | undefined): NormalizedTest[] {
  if (!report) {
    return []
  }

  return report.tests.map((test) => {
    const canonical = normalizeParameterName(test.parameter)
    const rangeStatus = evaluateReferenceRange(test.value, test.referenceRange)

    return {
      ...test,
      normalizedParameter: canonical,
      referenceRangeStatus: rangeStatus,
      status: test.status && test.status !== 'unknown' ? test.status : rangeStatus,
      needsReview: test.needsReview ?? (rangeStatus === 'unknown' && Boolean(test.referenceRange))
    }
  })
}

function extractReportContextValues(report: MedicalReport | null | undefined, field: 'allergies' | 'medications' | 'conditions' | 'symptoms') {
  return normalizeList(report?.patientContext?.[field])
}

function resolveNoConflictStatus(patientValues: string[], reportValues: string[]): boolean {
  const patientExplicit = patientValues
    .map((value) => normalizeConflictValue(value))
    .filter((value) => value && !isMissingValue(value))

  const reportExplicit = reportValues
    .map((value) => normalizeConflictValue(value))
    .filter((value) => value && !isMissingValue(value))

  if (patientExplicit.length === 0 || reportExplicit.length === 0) {
    return true
  }

  const patientActual = patientExplicit.filter((value) => !isExplicitNegativeValue(value))
  const reportActual = reportExplicit.filter((value) => !isExplicitNegativeValue(value))

  if (patientActual.length === 0 && reportActual.length === 0) {
    const patientNegative = new Set(patientExplicit.filter((value) => isExplicitNegativeValue(value)))
    const reportNegative = new Set(reportExplicit.filter((value) => isExplicitNegativeValue(value)))
    return patientNegative.size === reportNegative.size && [...patientNegative].every((value) => reportNegative.has(value))
  }

  if (patientActual.length > 0 && reportActual.length === 0) {
    return reportExplicit.every((value) => !isExplicitNegativeValue(value))
  }

  if (patientActual.length === 0 && reportActual.length > 0) {
    return patientExplicit.every((value) => !isExplicitNegativeValue(value))
  }

  const patientSet = new Set(patientActual)
  const reportSet = new Set(reportActual)
  return patientSet.size === reportSet.size && [...patientSet].every((value) => reportSet.has(value))
}

function findListConflict(field: string, patientValues: string[], reportValues: string[]): ReviewConflict | null {
  const patientExplicit = patientValues
    .map((value) => normalizeConflictValue(value))
    .filter((value) => value && !isMissingValue(value))

  const reportExplicit = reportValues
    .map((value) => normalizeConflictValue(value))
    .filter((value) => value && !isMissingValue(value))

  if (patientExplicit.length === 0 || reportExplicit.length === 0) {
    return null
  }

  const patientActual = patientExplicit.filter((value) => !isExplicitNegativeValue(value))
  const reportActual = reportExplicit.filter((value) => !isExplicitNegativeValue(value))
  const patientNegative = patientExplicit.filter((value) => isExplicitNegativeValue(value))
  const reportNegative = reportExplicit.filter((value) => isExplicitNegativeValue(value))

  if (patientActual.length === 0 && reportActual.length === 0) {
    const patientSet = new Set(patientNegative)
    const reportSet = new Set(reportNegative)

    if (patientSet.size === reportSet.size && [...patientSet].every((value) => reportSet.has(value))) {
      return null
    }
  }

  if (patientActual.length > 0 && reportActual.length === 0 && reportNegative.length > 0) {
    return {
      id: `conflict-${field}-${Date.now()}`,
      field,
      values: [
        { value: patientActual.join(', '), source: 'patient intake' },
        { value: reportNegative.join(', ') || `No known ${field}`, source: 'current report' }
      ],
      message: `Patient intake lists ${patientActual.join(', ')} in ${field}, but the current report indicates no known ${field}. Human review required.`,
      status: 'open'
    }
  }

  if (patientActual.length === 0 && reportActual.length > 0 && patientNegative.length > 0) {
    return {
      id: `conflict-${field}-${Date.now()}`,
      field,
      values: [
        { value: patientNegative.join(', ') || 'None', source: 'patient intake' },
        { value: reportActual.join(', '), source: 'current report' }
      ],
      message: `Patient intake indicates no ${field}, but the current report lists ${reportActual.join(', ')}. Human review required.`,
      status: 'open'
    }
  }

  const patientSet = new Set(patientActual)
  const reportSet = new Set(reportActual)
  const sameValues = patientSet.size === reportSet.size && [...patientSet].every((value) => reportSet.has(value))

  if (sameValues) {
    return null
  }

  const patientMissingReportValues = patientActual.filter((value) => !reportSet.has(value))
  const reportMissingPatientValues = reportActual.filter((value) => !patientSet.has(value))
  const mismatchValues = [...patientMissingReportValues, ...reportMissingPatientValues]

  if (mismatchValues.length === 0) {
    return null
  }

  return {
    id: `conflict-${field}-${Date.now()}`,
    field,
    values: [
      { value: patientExplicit.join(', ') || 'None', source: 'patient intake' },
      { value: reportExplicit.join(', ') || `No known ${field}`, source: 'current report' }
    ],
    message: `${field.replace(/(^\w|\s\w)/g, (value) => value.toUpperCase())} differs between patient intake and current report. Human review required.`,
    status: 'open'
  }
}

export function detectConflicts(patient: PatientRecord | null, report: MedicalReport | null): ReviewConflict[] {
  if (!patient || !report) {
    return []
  }

  const conflicts: ReviewConflict[] = []

  const patientContext = {
    allergies: normalizeList(patient.allergies),
    medications: normalizeList(patient.medications),
    conditions: normalizeList(patient.conditions),
    symptoms: normalizeList(patient.symptoms)
  }

  const reportContext = {
    allergies: extractReportContextValues(report, 'allergies'),
    medications: extractReportContextValues(report, 'medications'),
    conditions: extractReportContextValues(report, 'conditions'),
    symptoms: extractReportContextValues(report, 'symptoms')
  }

  const checks = [
    { field: 'allergies', patientValues: patientContext.allergies, reportValues: reportContext.allergies },
    { field: 'medications', patientValues: patientContext.medications, reportValues: reportContext.medications },
    { field: 'conditions', patientValues: patientContext.conditions, reportValues: reportContext.conditions },
    { field: 'symptoms', patientValues: patientContext.symptoms, reportValues: reportContext.symptoms }
  ]

  for (const check of checks) {
    if (resolveNoConflictStatus(check.patientValues, check.reportValues)) {
      continue
    }

    const candidate = findListConflict(check.field, check.patientValues, check.reportValues)
    if (candidate) {
      conflicts.push(candidate)
    }
  }

  if (typeof patient.age === 'number' && report.patientContext?.demographics?.age !== undefined) {
    const patientAge = Number(patient.age)
    const reportAge = Number(report.patientContext.demographics.age)

    if (!Number.isNaN(patientAge) && !Number.isNaN(reportAge) && patientAge !== reportAge) {
      conflicts.push({
        id: `conflict-age-${Date.now()}`,
        field: 'demographics.age',
        values: [
          { value: String(patientAge), source: 'patient intake' },
          { value: String(reportAge), source: 'current report' }
        ],
        message: 'Patient age differs between intake and current report. Human review required.',
        status: 'open'
      })
    }
  }

  return conflicts
}

export function compareReports(previousReport: MedicalReport | null | undefined, currentReport: MedicalReport | null | undefined): LongitudinalChange[] {
  if (!currentReport || !previousReport) {
    return []
  }

  if (previousReport.id === currentReport.id) {
    return []
  }

  const previousMap = new Map((previousReport?.tests ?? []).map((test) => [normalizeParameterName(test.parameter), test]))
  const currentTests = normalizeReportTests(currentReport)
  const results: LongitudinalChange[] = []

  for (const test of currentTests) {
    const previousTest = previousMap.get(test.normalizedParameter)
    const currentValue = toNumber(test.value)
    const previousValue = previousTest ? toNumber(previousTest.value) : undefined

    if (!previousTest) {
      results.push({
        id: `trend-${test.id}`,
        parameter: test.normalizedParameter,
        direction: 'new',
        currentValue: currentValue ?? test.value,
        message: `New finding: ${test.normalizedParameter} is present in the current report.`
      })
      continue
    }

    if (currentValue === undefined || previousValue === undefined) {
      results.push({
        id: `trend-${test.id}`,
        parameter: test.normalizedParameter,
        direction: 'missing',
        previousValue: previousTest.value,
        currentValue: test.value,
        message: `Unable to compare ${test.normalizedParameter} because one of the values is missing.`
      })
      continue
    }

    if (currentValue > previousValue) {
      results.push({
        id: `trend-${test.id}`,
        parameter: test.normalizedParameter,
        direction: 'increased',
        previousValue,
        currentValue,
        message: `${test.normalizedParameter} increased from ${previousValue} to ${currentValue}.`
      })
      continue
    }

    if (currentValue < previousValue) {
      results.push({
        id: `trend-${test.id}`,
        parameter: test.normalizedParameter,
        direction: 'decreased',
        previousValue,
        currentValue,
        message: `${test.normalizedParameter} decreased from ${previousValue} to ${currentValue}.`
      })
      continue
    }

    results.push({
      id: `trend-${test.id}`,
      parameter: test.normalizedParameter,
      direction: 'stable',
      previousValue,
      currentValue,
      message: `${test.normalizedParameter} is stable compared with the previous report.`
    })
  }

  return results
}

export type ReportAnalysis = {
  normalizedTests: NormalizedTest[]
  conflicts: ReviewConflict[]
  longitudinalChanges: LongitudinalChange[]
}

export function buildReportAnalysis(
  patient: PatientRecord | null,
  currentReport: MedicalReport | null,
  previousReport?: MedicalReport | null
): ReportAnalysis {
  return {
    normalizedTests: normalizeReportTests(currentReport),
    conflicts: detectConflicts(patient, currentReport),
    longitudinalChanges: compareReports(previousReport ?? null, currentReport)
  }
}
