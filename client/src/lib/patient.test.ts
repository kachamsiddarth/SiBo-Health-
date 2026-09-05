import { describe, expect, it } from 'vitest'

import { emptyPatientRecord, parsePatientRecord, patientRecordSchema } from '../../../shared/schemas/patient.schema'

describe('patient schema', () => {
  it('accepts valid patient data', () => {
    const patient = parsePatientRecord({
      id: 'p-100',
      name: 'Rahul Verma',
      age: 38,
      sex: 'Male',
      symptoms: ['Fatigue', 'Headache'],
      conditions: ['Anxiety'],
      allergies: ['None known'],
      medications: ['Vitamin D'],
      notes: 'Patient reports fatigue and headache.',
      sourceType: 'user-provided',
      sourceLabel: 'Patient Intake'
    })

    expect(patient.name).toBe('Rahul Verma')
    expect(patient.sourceType).toBe('user-provided')
  })

  it('requires a name', () => {
    expect(() =>
      patientRecordSchema.parse({
        id: 'p-101',
        age: 30,
        symptoms: [],
        conditions: [],
        allergies: [],
        medications: [],
        sourceType: 'user-provided',
        sourceLabel: 'Patient Intake'
      })
    ).toThrow('Name is required.')
  })

  it('rejects invalid age values', () => {
    expect(() =>
      patientRecordSchema.parse({
        id: 'p-102',
        name: 'Test User',
        age: -1,
        symptoms: [],
        conditions: [],
        allergies: [],
        medications: [],
        sourceType: 'user-provided',
        sourceLabel: 'Patient Intake'
      })
    ).toThrow()
  })

  it('handles empty optional fields gracefully', () => {
    const patient = parsePatientRecord({
      id: 'p-103',
      name: 'Test User',
      symptoms: [],
      conditions: [],
      allergies: [],
      medications: [],
      sourceType: 'user-provided',
      sourceLabel: 'Patient Intake'
    })

    expect(patient.age).toBeUndefined()
    expect(patient.notes).toBe('')
  })

  it('keeps provenance as user provided', () => {
    const patient = emptyPatientRecord()
    expect(patient.sourceType).toBe('user-provided')
    expect(patient.sourceLabel).toBe('Patient Intake')
  })
})
