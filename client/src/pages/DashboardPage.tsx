import { useMemo, useState } from 'react'

import { extractMedicalReport } from '../api/reports'
import { AppShell } from '../components/layout/AppShell'
import { PageContainer } from '../components/layout/PageContainer'
import { PatientIntakeForm } from '../components/patient/PatientIntakeForm'
import { PatientRecordCard } from '../components/patient/PatientRecordCard'
import { PatientDetails } from '../components/patient/PatientDetails'
import { ReportInput } from '../components/reports/ReportInput'
import { ReportResults } from '../components/reports/ReportResults'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import type { MedicalReport } from '../../../shared/schemas/report.schema'
import type { PatientRecord } from '../../../shared/schemas/patient.schema'

export function DashboardPage() {
  const [patient, setPatient] = useState<PatientRecord | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [report, setReport] = useState<MedicalReport | null>(null)
  const [isProcessingReport, setIsProcessingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const selectedPatient = useMemo(() => patient, [patient])

  const handleCreate = (nextPatient: PatientRecord) => {
    setPatient(nextPatient)
    setIsCreating(false)
    setIsEditing(false)
  }

  const handleEdit = () => {
    setIsCreating(true)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsCreating(false)
    setIsEditing(false)
  }

  const handleMedicalReportSubmit = async (input: { text: string; reportDate?: string; fileName?: string }) => {
    setIsProcessingReport(true)
    setReportError(null)

    try {
      const nextReport = await extractMedicalReport({
        ...input,
        sourceType: 'user-provided'
      })
      setReport(nextReport)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to extract this report. Please try again.'
      setReportError(message)
    } finally {
      setIsProcessingReport(false)
    }
  }

  return (
    <AppShell>
      <PageContainer>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">Dashboard</p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">Patient Record Workspace</h1>
          </div>
          {!isCreating && !patient && (
            <Button type="button" variant="primary" onClick={() => setIsCreating(true)}>
              Create Patient Record
            </Button>
          )}
        </div>

        {!patient && !isCreating && (
          <Alert tone="info">
            No patient record yet. Create one to begin collecting patient details from intake.
          </Alert>
        )}

        {isCreating && (
          <PatientIntakeForm patient={isEditing ? selectedPatient : null} onSubmitPatient={handleCreate} onCancel={handleCancel} />
        )}

        {!isCreating && patient && (
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <PatientRecordCard patient={patient} onEdit={handleEdit} />
            <PatientDetails patient={patient} />
          </div>
        )}

        {patient && !isCreating && (
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={handleEdit}>
              Edit Patient
            </Button>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <ReportInput onSubmit={handleMedicalReportSubmit} isLoading={isProcessingReport} error={reportError} />
          <ReportResults report={report} />
        </div>
      </PageContainer>
    </AppShell>
  )
}

export default DashboardPage
