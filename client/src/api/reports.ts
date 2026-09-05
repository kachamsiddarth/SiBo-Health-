import type { MedicalReport, MedicalReportInput } from '../../../shared/schemas/report.schema'

export type ExtractReportInput = MedicalReportInput

export async function extractMedicalReport(input: ExtractReportInput): Promise<MedicalReport> {
  const response = await fetch('/api/reports/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    let message = 'Unable to extract this report. Please check the report text and try again.'

    try {
      const payload = (await response.json()) as { error?: { message?: string } }
      if (payload.error?.message) {
        message = payload.error.message
      }
    } catch {
      // ignore JSON parse issues and return a friendly fallback
    }

    throw new Error(message)
  }

  return (await response.json()) as MedicalReport
}
