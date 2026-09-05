import { z } from 'zod'

export const medicalReportInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Report text is required.')
    .max(20000, 'Report text is too large.'),
  reportDate: z.string().trim().max(50).optional(),
  fileName: z.string().trim().max(200).optional(),
  sourceType: z.literal('user-provided').default('user-provided')
})

export const referenceRangeSchema = z
  .object({
    low: z.number().optional(),
    high: z.number().optional(),
    text: z.string().trim().max(200).optional()
  })
  .strict()
  .optional()

export const referenceRangeStatusSchema = z.enum(['low', 'normal', 'high', 'unknown'])

export const provenanceSchema = z
  .object({
    sourceType: z.enum(['user-provided', 'ai-extracted', 'ai-generated']).optional(),
    sourceLabel: z.string().trim().min(1).max(200).optional(),
    originalText: z.string().trim().max(1000).optional(),
    reportId: z.string().trim().min(1).max(100).optional()
  })
  .optional()

export const extractedTestSchema = z.object({
  id: z.string().min(1),
  parameter: z.string().trim().min(1),
  originalParameter: z.string().trim().min(1).optional(),
  normalizedParameter: z.string().trim().min(1).optional(),
  value: z.union([z.number(), z.string()]).optional(),
  unit: z.string().trim().max(100).optional(),
  referenceRange: referenceRangeSchema,
  observation: z.string().trim().max(500).optional(),
  status: z.enum(['low', 'normal', 'high', 'unknown']).default('unknown'),
  referenceRangeStatus: referenceRangeStatusSchema.optional(),
  needsReview: z.boolean().default(false),
  provenance: provenanceSchema,
  source: z.object({
    type: z.literal('ai-extracted'),
    label: z.string().trim().min(1).default('AI extracted')
  })
})

export const reportPatientContextSchema = z.object({
  allergies: z.array(z.string().trim().min(1).max(200)).optional(),
  medications: z.array(z.string().trim().min(1).max(200)).optional(),
  conditions: z.array(z.string().trim().min(1).max(200)).optional(),
  symptoms: z.array(z.string().trim().min(1).max(200)).optional(),
  demographics: z
    .object({
      age: z.union([z.number(), z.string()]).optional(),
      sex: z.string().trim().max(100).optional()
    })
    .optional()
})

export const medicalReportSchema = z.object({
  id: z.string().min(1),
  reportDate: z.string().trim().max(50).optional(),
  source: z.object({
    type: z.enum(['user-provided', 'ai-extracted']),
    label: z.string().trim().min(1),
    fileName: z.string().trim().max(200).optional()
  }),
  tests: z.array(extractedTestSchema),
  observations: z.array(z.string().trim().min(1).max(500)).optional(),
  extractedNotes: z.array(z.string().trim().min(1).max(500)).optional(),
  patientContext: reportPatientContextSchema.optional(),
  extractionMetadata: z
    .object({
      model: z.string().trim().max(200).optional(),
      extractedAt: z.string().trim().max(50).optional()
    })
    .optional()
})

export type MedicalReportInput = z.infer<typeof medicalReportInputSchema>
export type MedicalReport = z.infer<typeof medicalReportSchema>
export type ExtractedTest = z.infer<typeof extractedTestSchema>
export type ReferenceRange = z.infer<typeof referenceRangeSchema>

export function parseMedicalReportInput(input: unknown): MedicalReportInput {
  return medicalReportInputSchema.parse(input)
}

export function parseMedicalReport(input: unknown): MedicalReport {
  return medicalReportSchema.parse(input)
}
