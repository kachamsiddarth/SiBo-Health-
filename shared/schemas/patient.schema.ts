import { z } from 'zod'

const stringListField = z
  .union([
    z.array(z.string().trim().min(1).max(120)).default([]),
    z
      .string()
      .trim()
      .transform((value) =>
        value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      )
  ])
  .default([])

export const patientRecordSchema = z.object({
  id: z.string().min(1, 'Record ID is required.').max(100).optional().or(z.literal('')),
  name: z.preprocess(
    (value) => (typeof value === 'string' ? value : ''),
    z.string().trim().min(1, 'Name is required.').max(120, 'Name is too long.')
  ),
  age: z
    .number({ error: 'Please enter a valid age.' })
    .int('Please enter a valid age.')
    .min(0, 'Age must be zero or greater.')
    .max(150, 'Age must be realistic.')
    .optional(),
  sex: z.string().trim().max(40, 'Sex is too long.').optional().or(z.literal('')).default(''),
  symptoms: stringListField,
  conditions: stringListField,
  allergies: stringListField,
  medications: stringListField,
  notes: z.string().trim().max(2000, 'Notes are too long.').default('').optional(),
  sourceType: z.literal('user-provided').default('user-provided'),
  sourceLabel: z.string().default('Patient Intake')
})

export type PatientRecord = z.infer<typeof patientRecordSchema>

export const emptyPatientRecord = (): PatientRecord => ({
  id: '',
  name: '',
  age: undefined,
  sex: '',
  symptoms: [],
  conditions: [],
  allergies: [],
  medications: [],
  notes: '',
  sourceType: 'user-provided',
  sourceLabel: 'Patient Intake'
})

export function parsePatientRecord(input: unknown): PatientRecord {
  return patientRecordSchema.parse(input)
}
