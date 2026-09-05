export type BadgeTone = 'neutral' | 'accent' | 'success' | 'info' | 'warning'

export type StatItem = {
  label: string
  value: string
  detail: string
}

export type PatientRecord = {
  name: string
  age: number
  sex: string
  symptoms: string[]
  reports: number
  reviewItems: number
  source: string
}

export type ReportRow = {
  parameter: string
  value: string
  unit: string
  referenceRange: string
  status: string
  source: string
}

export type ReviewItem = {
  title: string
  intake: string
  report: string
  action: string
}

export type ProvenanceItem = {
  label: string
  value: string
}

export const dashboardStats: StatItem[] = [
  { label: 'Patient Records', value: '128', detail: 'Active files' },
  { label: 'Reports Processed', value: '342', detail: 'This month' },
  { label: 'Items Needing Review', value: '23', detail: 'Flagged' },
  { label: 'Verified Items', value: '1,284', detail: 'Validated' }
]

export const patientRecord: PatientRecord = {
  name: 'Demo Patient',
  age: 42,
  sex: 'Female',
  symptoms: ['Fatigue', 'Mild dizziness', 'Sleep disruption'],
  reports: 2,
  reviewItems: 3,
  source: 'Intake + Current Report'
}

export const reportRows: ReportRow[] = [
  {
    parameter: 'Hemoglobin',
    value: '12.4',
    unit: 'g/dL',
    referenceRange: '13–17',
    status: 'Below source range',
    source: 'Current Report'
  },
  {
    parameter: 'WBC',
    value: '7.2',
    unit: 'x10⁹/L',
    referenceRange: '4–11',
    status: 'Within range',
    source: 'Current Report'
  },
  {
    parameter: 'TSH',
    value: '4.9',
    unit: 'mIU/L',
    referenceRange: '0.4–4.0',
    status: 'Above source range',
    source: 'Previous Report'
  }
]

export const reviewItems: ReviewItem[] = [
  {
    title: 'Patient age mismatch',
    intake: 'Intake: 42',
    report: 'Report: 45',
    action: 'Verify age source'
  },
  {
    title: 'Medication note conflict',
    intake: 'Intake: No known medications',
    report: 'Report: Current medication list includes iron',
    action: 'Review reconciliation'
  }
]

export const provenanceItems: ProvenanceItem[] = [
  { label: 'Source', value: 'Current Blood Report' },
  { label: 'Original term', value: 'HGB' },
  { label: 'Normalized term', value: 'Hemoglobin' },
  { label: 'Origin', value: 'AI extracted' }
]
