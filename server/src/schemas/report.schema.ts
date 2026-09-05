import { z } from 'zod'

export const medicalReportInputSchema = z.object({
  text: z.string().trim().min(1, 'Report text is required.').max(20000, 'Report text is too large.'),
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

export const extractedTestSchema = z.object({
  id: z.string().min(1),
  parameter: z.string().trim().min(1),
  originalParameter: z.string().trim().min(1).optional(),
  value: z.union([z.number(), z.string()]).optional(),
  unit: z.string().trim().max(100).optional(),
  referenceRange: referenceRangeSchema,
  observation: z.string().trim().max(500).optional(),
  status: z.enum(['low', 'normal', 'high', 'unknown']).default('unknown'),
  source: z.object({
    type: z.literal('ai-extracted'),
    label: z.string().trim().min(1).default('AI extracted')
  })
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
