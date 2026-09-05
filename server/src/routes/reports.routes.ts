import { Router } from 'express'

import { extractMedicalReport, generateReportSummary } from '../services/ai/reportExtractor.js'
import { medicalReportInputSchema } from '../schemas/report.schema.js'

const router = Router()

router.post('/extract', async (req, res, next) => {
  try {
    const payload = req.body ?? {}

    if (typeof payload.text !== 'string' && payload.text !== undefined) {
      const error = new Error('Invalid request body.') as Error & { statusCode?: number; code?: string }
      error.statusCode = 400
      error.code = 'INVALID_REQUEST'
      throw error
    }

    if (typeof payload.text === 'string' && payload.text.length > 20000) {
      const error = new Error('Report text is too large.') as Error & { statusCode?: number; code?: string }
      error.statusCode = 413
      error.code = 'REPORT_TOO_LARGE'
      throw error
    }

    const parsed = medicalReportInputSchema.safeParse(payload)

    if (!parsed.success) {
      const error = new Error(parsed.error.issues[0]?.message ?? 'Invalid report input.') as Error & {
        statusCode?: number
        code?: string
      }
      error.statusCode = 400
      error.code = 'INVALID_REPORT_INPUT'
      throw error
    }

    const result = await extractMedicalReport(parsed.data)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
})

router.post('/summary', async (req, res, next) => {
  try {
    const payload = req.body ?? {}
    const report = payload.report
    const patient = payload.patient ?? null
    const previousReport = payload.previousReport ?? null

    if (!report || typeof report !== 'object' || !Array.isArray(report.tests)) {
      const error = new Error('A valid report is required for summary generation.') as Error & {
        statusCode?: number
        code?: string
      }
      error.statusCode = 400
      error.code = 'INVALID_SUMMARY_REQUEST'
      throw error
    }

    const result = await generateReportSummary({ patient, report, previousReport })
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
})

export default router
