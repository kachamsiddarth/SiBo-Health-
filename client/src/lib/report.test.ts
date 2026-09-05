import { describe, expect, it } from 'vitest'

import { parseMedicalReport, parseMedicalReportInput, medicalReportSchema } from '../../../shared/schemas/report.schema'

describe('medical report schema', () => {
  it('accepts valid report input', () => {
    const input = parseMedicalReportInput({
      text: 'Hemoglobin 13.2 g/dL (12.0 - 16.0)\nTSH 4.9 mIU/L (0.4 - 4.0)',
      reportDate: '2026-09-05',
      fileName: 'lab-report.pdf',
      sourceType: 'user-provided'
    })

    expect(input.text).toContain('Hemoglobin')
    expect(input.sourceType).toBe('user-provided')
  })

  it('rejects empty report text', () => {
    expect(() =>
      parseMedicalReportInput({
        text: '   ',
        sourceType: 'user-provided'
      })
    ).toThrow('Report text is required.')
  })

  it('rejects oversized report text', () => {
    expect(() =>
      parseMedicalReportInput({
        text: 'x'.repeat(20001),
        sourceType: 'user-provided'
      })
    ).toThrow('Report text is too large.')
  })

  it('accepts valid structured AI output', () => {
    const report = parseMedicalReport({
      id: 'r-1',
      reportDate: '2026-09-05',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted',
        fileName: 'lab-report.pdf'
      },
      tests: [
        {
          id: 't-1',
          parameter: 'Hemoglobin',
          originalParameter: 'Hgb',
          value: 13.2,
          unit: 'g/dL',
          referenceRange: { low: 12, high: 16, text: '12.0 - 16.0' },
          observation: 'Within source range.',
          status: 'normal',
          source: {
            type: 'ai-extracted',
            label: 'AI extracted'
          }
        }
      ],
      observations: ['No acute change noted.'],
      extractedNotes: ['Source range preserved.'],
      extractionMetadata: {
        model: 'gemini-2.0-flash',
        extractedAt: '2026-09-05T12:00:00Z'
      }
    })

    expect(report.tests[0].status).toBe('normal')
    expect(report.source.type).toBe('ai-extracted')
  })

  it('allows missing reference ranges and keeps status unknown', () => {
    const report = medicalReportSchema.parse({
      id: 'r-2',
      source: {
        type: 'user-provided',
        label: 'Current Report'
      },
      tests: [
        {
          id: 't-2',
          parameter: 'Vitamin D',
          originalParameter: 'Vitamin D',
          value: 30,
          unit: 'ng/mL',
          status: 'unknown',
          source: {
            type: 'ai-extracted',
            label: 'AI extracted'
          }
        }
      ]
    })

    expect(report.tests[0].referenceRange).toBeUndefined()
    expect(report.tests[0].status).toBe('unknown')
  })

  it('rejects invalid AI output', () => {
    expect(() =>
      medicalReportSchema.parse({
        id: 'r-3',
        source: {
          type: 'ai-extracted',
          label: 'AI extracted'
        },
        tests: [
          {
            id: 't-3',
            parameter: '',
            source: {
              type: 'ai-extracted',
              label: 'AI extracted'
            }
          }
        ]
      })
    ).toThrow()
  })

  it('preserves provenance metadata', () => {
    const report = parseMedicalReport({
      id: 'r-4',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted',
        fileName: 'report.pdf'
      },
      tests: [
        {
          id: 't-4',
          parameter: 'WBC',
          originalParameter: 'WBC',
          value: 7.4,
          unit: 'x10^9/L',
          status: 'unknown',
          source: {
            type: 'ai-extracted',
            label: 'AI extracted'
          }
        }
      ]
    })

    expect(report.source.type).toBe('ai-extracted')
    expect(report.tests[0].source.type).toBe('ai-extracted')
  })
})
