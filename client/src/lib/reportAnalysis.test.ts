import { describe, expect, it } from 'vitest'

import { buildReportAnalysis, compareReports, detectConflicts, evaluateReferenceRange, normalizeParameterName } from '../../../shared/analysis/reportAnalysis'
import { parseMedicalReport } from '../../../shared/schemas/report.schema'
import { extractPatientContextFromText } from '../../../server/src/services/ai/reportExtractor'

describe('phase 5 and 6 deterministic analysis', () => {
  it('normalizes common parameter aliases while preserving original values', () => {
    expect(normalizeParameterName('Hb')).toBe('Hemoglobin')
    expect(normalizeParameterName('Hgb')).toBe('Hemoglobin')
    expect(normalizeParameterName('WBC')).toBe('White Blood Cell Count')
    expect(normalizeParameterName('PLT')).toBe('Platelet Count')
  })

  it('evaluates source-provided reference ranges deterministically', () => {
    expect(evaluateReferenceRange(12.4, { low: 13, high: 17, text: '13 - 17 g/dL' })).toBe('low')
    expect(evaluateReferenceRange(15, { low: 13, high: 17, text: '13 - 17 g/dL' })).toBe('normal')
    expect(evaluateReferenceRange(18, { low: 13, high: 17, text: '13 - 17 g/dL' })).toBe('high')
    expect(evaluateReferenceRange(9.1, undefined)).toBe('unknown')
  })

  it('flags a patient allergy conflict against a report that says no known allergies', () => {
    const patientRecord = {
      id: 'p-1',
      name: 'Test Patient',
      age: 42,
      sex: 'Female',
      symptoms: ['fatigue'],
      conditions: ['anemia'],
      allergies: ['Penicillin'],
      medications: [],
      notes: 'Patient intake notes',
      sourceType: 'user-provided' as const,
      sourceLabel: 'Patient Intake'
    }

    const report = parseMedicalReport({
      id: 'r-1',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted',
        fileName: 'lab.pdf'
      },
      patientContext: {
        allergies: ['No known allergies'],
        medications: ['Metformin 500 mg'],
        conditions: ['Anemia'],
        symptoms: ['Fatigue']
      },
      tests: [],
      observations: ['Report content reviewed.'],
      extractedNotes: ['No known allergies.'],
      extractionMetadata: {
        model: 'gemini-2.5-flash',
        extractedAt: '2026-09-05T12:00:00Z'
      }
    })

    const conflicts = detectConflicts(patientRecord, report)
    expect(conflicts.some((conflict) => conflict.field === 'allergies')).toBe(true)
    expect(conflicts.some((conflict) => conflict.status === 'open')).toBe(true)
  })

  it('flags a patient medication conflict against a report that lists current medication', () => {
    const patientRecord = {
      id: 'p-2',
      name: 'Test Patient',
      age: 42,
      sex: 'Female',
      symptoms: ['fatigue'],
      conditions: ['anemia'],
      allergies: [],
      medications: ['None'],
      notes: 'Patient intake notes',
      sourceType: 'user-provided' as const,
      sourceLabel: 'Patient Intake'
    }

    const report = parseMedicalReport({
      id: 'r-2',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted',
        fileName: 'lab.pdf'
      },
      patientContext: {
        allergies: [],
        medications: ['Metformin 500 mg'],
        conditions: ['Anemia'],
        symptoms: ['Fatigue']
      },
      tests: [],
      observations: ['Current medications: Metformin 500 mg'],
      extractedNotes: ['Medication context noted.'],
      extractionMetadata: {
        model: 'gemini-2.5-flash',
        extractedAt: '2026-09-05T12:00:00Z'
      }
    })

    const conflicts = detectConflicts(patientRecord, report)
    expect(conflicts.some((conflict) => conflict.field === 'medications')).toBe(true)
  })

  it('does not flag a matching allergy entry as a conflict', () => {
    const patientRecord = {
      id: 'p-3',
      name: 'Test Patient',
      age: 42,
      sex: 'Female',
      symptoms: ['fatigue'],
      conditions: ['anemia'],
      allergies: ['Penicillin'],
      medications: [],
      notes: 'Patient intake notes',
      sourceType: 'user-provided' as const,
      sourceLabel: 'Patient Intake'
    }

    const report = parseMedicalReport({
      id: 'r-3',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted',
        fileName: 'lab.pdf'
      },
      patientContext: {
        allergies: ['Penicillin'],
        medications: [],
        conditions: ['Anemia'],
        symptoms: ['Fatigue']
      },
      tests: [],
      observations: [],
      extractedNotes: [],
      extractionMetadata: {
        model: 'gemini-2.5-flash',
        extractedAt: '2026-09-05T12:00:00Z'
      }
    })

    const conflicts = detectConflicts(patientRecord, report)
    expect(conflicts.some((conflict) => conflict.field === 'allergies')).toBe(false)
  })

  it('does not flag a matching medication entry as a conflict', () => {
    const patientRecord = {
      id: 'p-4',
      name: 'Test Patient',
      age: 42,
      sex: 'Female',
      symptoms: ['fatigue'],
      conditions: ['anemia'],
      allergies: [],
      medications: ['Metformin 500 mg'],
      notes: 'Patient intake notes',
      sourceType: 'user-provided' as const,
      sourceLabel: 'Patient Intake'
    }

    const report = parseMedicalReport({
      id: 'r-4',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted',
        fileName: 'lab.pdf'
      },
      patientContext: {
        allergies: [],
        medications: ['Metformin 500 mg'],
        conditions: ['Anemia'],
        symptoms: ['Fatigue']
      },
      tests: [],
      observations: [],
      extractedNotes: [],
      extractionMetadata: {
        model: 'gemini-2.5-flash',
        extractedAt: '2026-09-05T12:00:00Z'
      }
    })

    const conflicts = detectConflicts(patientRecord, report)
    expect(conflicts.some((conflict) => conflict.field === 'medications')).toBe(false)
  })

  it('compares previous and current reports using deterministic trend logic', () => {
    const previousReport = parseMedicalReport({
      id: 'r-prev',
      reportDate: '2026-08-01',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted'
      },
      tests: [
        {
          id: 't-prev',
          parameter: 'Hb',
          originalParameter: 'Hb',
          value: 14.1,
          unit: 'g/dL',
          referenceRange: { low: 13, high: 17, text: '13 - 17 g/dL' },
          observation: 'Previous value.',
          status: 'normal',
          source: {
            type: 'ai-extracted',
            label: 'AI extracted'
          }
        }
      ]
    })

    const currentReport = parseMedicalReport({
      id: 'r-current',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted'
      },
      tests: [
        {
          id: 't-current',
          parameter: 'Hgb',
          originalParameter: 'Hgb',
          value: 12.4,
          unit: 'g/dL',
          referenceRange: { low: 13, high: 17, text: '13 - 17 g/dL' },
          observation: 'Current value.',
          status: 'low',
          source: {
            type: 'ai-extracted',
            label: 'AI extracted'
          }
        }
      ]
    })

    const trends = compareReports(previousReport, currentReport)
    expect(trends[0].direction).toBe('decreased')
  })

  it('must not compare a report against itself', () => {
    const report = parseMedicalReport({
      id: 'r-self',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted'
      },
      tests: [
        {
          id: 't-self',
          parameter: 'Hemoglobin',
          originalParameter: 'Hemoglobin',
          value: 13.2,
          unit: 'g/dL',
          referenceRange: { low: 12, high: 16, text: '12 - 16 g/dL' },
          observation: 'Self value.',
          status: 'normal',
          source: {
            type: 'ai-extracted',
            label: 'AI extracted'
          }
        }
      ]
    })

    expect(compareReports(report, report)).toEqual([])
  })

  it('returns no history comparison when there is no previous report', () => {
    const report = parseMedicalReport({
      id: 'r-no-previous',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted'
      },
      tests: []
    })

    expect(compareReports(null, report)).toEqual([])
  })

  it('preserves report allergies and medications in structured patientContext during extraction', () => {
    const patientContext = extractPatientContextFromText(
      'Allergies: No known allergies\nCurrent Medications: Metformin 500 mg\nHemoglobin: 13.2 g/dL\nReference Range: 12.0 - 16.0 g/dL'
    )

    expect(patientContext.allergies).toEqual(['No known allergies'])
    expect(patientContext.medications).toEqual(['Metformin 500 mg'])
  })

  it('does not create a symptom conflict when the report omits symptom details', () => {
    const patientRecord = {
      id: 'p-symptom-missing',
      name: 'Test Patient',
      age: 42,
      sex: 'Female',
      symptoms: ['Fatigue'],
      conditions: ['Anemia'],
      allergies: ['Penicillin'],
      medications: ['None'],
      notes: 'Patient intake notes',
      sourceType: 'user-provided' as const,
      sourceLabel: 'Patient Intake'
    }

    const report = parseMedicalReport({
      id: 'r-symptom-missing',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted',
        fileName: 'lab.pdf'
      },
      patientContext: {
        allergies: ['No known allergies'],
        medications: ['Metformin 500 mg'],
        conditions: ['Anemia'],
        symptoms: []
      },
      tests: [],
      observations: ['Current medications: Metformin 500 mg'],
      extractedNotes: ['No symptoms documented.'],
      extractionMetadata: {
        model: 'gemini-2.5-flash',
        extractedAt: '2026-09-05T12:00:00Z'
      }
    })

    const conflicts = detectConflicts(patientRecord, report)
    expect(conflicts.some((conflict) => conflict.field === 'symptoms')).toBe(false)
  })

  it('creates a conflict when a patient symptom is explicitly contradicted by an explicit no-symptoms report', () => {
    const patientRecord = {
      id: 'p-symptom-contradiction',
      name: 'Test Patient',
      age: 42,
      sex: 'Female',
      symptoms: ['Fatigue'],
      conditions: ['Anemia'],
      allergies: [],
      medications: [],
      notes: 'Patient intake notes',
      sourceType: 'user-provided' as const,
      sourceLabel: 'Patient Intake'
    }

    const report = parseMedicalReport({
      id: 'r-symptom-contradiction',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted',
        fileName: 'lab.pdf'
      },
      patientContext: {
        allergies: [],
        medications: [],
        conditions: ['Anemia'],
        symptoms: ['No known symptoms']
      },
      tests: [],
      observations: [],
      extractedNotes: ['No known symptoms.'],
      extractionMetadata: {
        model: 'gemini-2.5-flash',
        extractedAt: '2026-09-05T12:00:00Z'
      }
    })

    const conflicts = detectConflicts(patientRecord, report)
    expect(conflicts.some((conflict) => conflict.field === 'symptoms')).toBe(true)
  })

  it('does not create a conflict when both sides explicitly match', () => {
    const patientRecord = {
      id: 'p-symptom-match',
      name: 'Test Patient',
      age: 42,
      sex: 'Female',
      symptoms: ['Fatigue'],
      conditions: ['Anemia'],
      allergies: [],
      medications: [],
      notes: 'Patient intake notes',
      sourceType: 'user-provided' as const,
      sourceLabel: 'Patient Intake'
    }

    const report = parseMedicalReport({
      id: 'r-symptom-match',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted'
      },
      patientContext: {
        allergies: [],
        medications: [],
        conditions: ['Anemia'],
        symptoms: ['Fatigue']
      },
      tests: [],
      observations: [],
      extractedNotes: [],
      extractionMetadata: {
        model: 'gemini-2.5-flash',
        extractedAt: '2026-09-05T12:00:00Z'
      }
    })

    const conflicts = detectConflicts(patientRecord, report)
    expect(conflicts.some((conflict) => conflict.field === 'symptoms')).toBe(false)
  })

  it('creates a conflict when both sides explicitly differ', () => {
    const patientRecord = {
      id: 'p-symptom-differ',
      name: 'Test Patient',
      age: 42,
      sex: 'Female',
      symptoms: ['Fatigue'],
      conditions: ['Anemia'],
      allergies: [],
      medications: [],
      notes: 'Patient intake notes',
      sourceType: 'user-provided' as const,
      sourceLabel: 'Patient Intake'
    }

    const report = parseMedicalReport({
      id: 'r-symptom-differ',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted'
      },
      patientContext: {
        allergies: [],
        medications: [],
        conditions: ['Anemia'],
        symptoms: ['Chest pain']
      },
      tests: [],
      observations: [],
      extractedNotes: [],
      extractionMetadata: {
        model: 'gemini-2.5-flash',
        extractedAt: '2026-09-05T12:00:00Z'
      }
    })

    const conflicts = detectConflicts(patientRecord, report)
    expect(conflicts.some((conflict) => conflict.field === 'symptoms')).toBe(true)
  })

  it('builds normalized report analysis without inventing data', () => {
    const report = parseMedicalReport({
      id: 'r-analysis',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted'
      },
      tests: [
        {
          id: 't-a',
          parameter: 'WBC',
          originalParameter: 'WBC',
          value: 7.4,
          unit: 'x10^3/uL',
          referenceRange: { low: 4, high: 11, text: '4.0 - 11.0 x10^3/uL' },
          observation: 'Within range.',
          status: 'normal',
          source: {
            type: 'ai-extracted',
            label: 'AI extracted'
          }
        }
      ]
    })

    const analysis = buildReportAnalysis(null, report, null)
    expect(analysis.normalizedTests[0].normalizedParameter).toBe('White Blood Cell Count')
    expect(analysis.normalizedTests[0].referenceRangeStatus).toBe('normal')
  })
})
