import { randomUUID } from 'crypto'

import { GoogleGenAI } from '@google/genai'

import { env } from '../../config/env.js'
import { googleAiConfig } from '../../config/google.js'
import { medicalReportSchema, type MedicalReport, type MedicalReportInput } from '../../schemas/report.schema.js'

const REPORT_TEXT_LIMIT = 20000

const promptTemplate = `You are extracting structured information from a medical report.

You are NOT diagnosing the patient.
You are NOT providing treatment advice.
Extract only information supported by the supplied report.
Preserve the original wording of test and parameter names.
Where possible, normalize obvious equivalent terminology while preserving the original term separately.

Return ONLY valid JSON in this exact shape:
{
  "id": "unique-id",
  "reportDate": "YYYY-MM-DD or null",
  "source": {
    "type": "user-provided",
    "label": "Current Report",
    "fileName": "optional-file-name"
  },
  "tests": [
    {
      "parameter": "Test Name",
      "originalParameter": "Original Test Name",
      "value": 13.2,
      "unit": "g/dL",
      "referenceRange": { "low": 12, "high": 16, "text": "12.0 - 16.0" },
      "observation": "Any relevant note",
      "status": "normal"
    }
  ],
  "observations": ["short observation text"],
  "extractedNotes": ["short note"],
  "extractionMetadata": { "model": "gemini-2.5-flash", "extractedAt": "ISO-8601 timestamp" }
}

Do not invent missing values.
Do not invent reference ranges.
Do not infer a diagnosis.
If information is absent, leave the value as null or an empty string.
Return JSON only.`

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

function parseReferenceRange(rawValue: string | undefined): { low?: number; high?: number; text?: string } | undefined {
  if (!rawValue) {
    return undefined
  }

  const cleaned = rawValue.replace(/\s+/g, ' ').trim()
  const match = cleaned.match(/(-?\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(-?\d+(?:\.\d+)?)/)

  if (!match) {
    return { text: cleaned }
  }

  const low = toNumber(match[1])
  const high = toNumber(match[2])

  return {
    low,
    high,
    text: cleaned
  }
}

function normalizeReferenceRange(value: unknown, unit?: string): { low?: number; high?: number; text?: string } | undefined {
  if (!value) {
    return undefined
  }

  if (typeof value === 'string') {
    return parseReferenceRange(value)
  }

  if (typeof value === 'object') {
    const range = value as Record<string, unknown>
    const low = toNumber(range.low ?? range.min)
    const high = toNumber(range.high ?? range.max)
    const textValue = typeof range.text === 'string'
      ? range.text
      : typeof range.range === 'string'
        ? range.range
        : typeof range.rangeText === 'string'
          ? range.rangeText
          : undefined

    if (low === undefined && high === undefined && !textValue) {
      return undefined
    }

    const text = textValue
      ? (unit && !textValue.toLowerCase().includes(unit.toLowerCase()) ? `${textValue} ${unit}` : textValue)
      : (low !== undefined && high !== undefined ? `${low} - ${high}${unit ? ` ${unit}` : ''}` : undefined)

    return {
      low,
      high,
      text
    }
  }

  return undefined
}

function buildFallbackExtraction(input: MedicalReportInput): MedicalReport {
  const text = input.text.replace(/\s+/g, ' ').trim()
  const observations = text.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 5)

  const segments = text.split(/(?=\b[A-Z][A-Za-z0-9/().-]+\s*[:\-]\s*-?\d)/)
  const entries = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) => {
      const match = segment.match(/^([A-Z][A-Za-z0-9/().-]+(?:\s+[A-Z][A-Za-z0-9/().-]+)*)\s*[:\-]\s*(-?\d+(?:\.\d+)?)\s*([A-Za-zµμ/°^0-9\-. ]+)?(?:\s*\(([^)]+)\))?$/)

      if (!match) {
        return []
      }

      const [, parameter, valueText, unit, rangeText] = match
      const cleanedUnit = unit?.replace(/\s*\([^)]*\).*$/, '').trim() || undefined

      return [{
        parameter: parameter.trim(),
        valueText,
        unit: cleanedUnit,
        rangeText
      }]
    })
    .slice(0, 8)

  const tests = entries.map((entry, index) => {
    const numericValue = toNumber(entry.valueText)

    return {
      id: `fallback-test-${index + 1}`,
      parameter: entry.parameter,
      originalParameter: entry.parameter,
      value: numericValue ?? entry.valueText,
      unit: entry.unit,
      referenceRange: parseReferenceRange(entry.rangeText),
      observation: entry.rangeText ? `Source reported range: ${entry.rangeText}` : undefined,
      status: 'unknown',
      source: {
        type: 'ai-extracted' as const,
        label: 'AI extracted'
      }
    }
  })

  if (tests.length === 0) {
    tests.push({
      id: `fallback-test-${randomUUID()}`,
      parameter: 'Clinical notes',
      originalParameter: 'Clinical notes',
      value: text.slice(0, 180),
      unit: undefined,
      referenceRange: undefined,
      observation: 'Report text was received but no structured numeric result could be confidently parsed in fallback mode.',
      status: 'unknown',
      source: {
        type: 'ai-extracted',
        label: 'AI extracted'
      }
    })
  }

  return medicalReportSchema.parse({
    id: randomUUID(),
    reportDate: input.reportDate,
    source: {
      type: 'user-provided',
      label: 'Current Report',
      fileName: input.fileName
    },
    tests,
    observations: observations.length > 0 ? observations : ['Report text captured for structured extraction.'],
    extractedNotes: ['Structured extraction completed in local fallback mode.'],
    extractionMetadata: {
      model: 'local-fallback',
      extractedAt: new Date().toISOString()
    }
  })
}

function stripMarkdownCodeFence(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
}

function classifyAiFailure(error: unknown): { statusCode: number; code: string; message: string } {
  const text = error instanceof Error ? error.message : String(error)
  const lower = text.toLowerCase()

  if (!googleAiConfig.apiKey) {
    return {
      statusCode: 401,
      code: 'AI_KEY_MISSING',
      message: 'AI configuration is missing.'
    }
  }

  if (/api key|authentication|unauthorized|forbidden|permission|invalid api|not authorized/i.test(lower)) {
    return {
      statusCode: 401,
      code: 'AI_AUTH_FAILED',
      message: 'AI authentication failed.'
    }
  }

  if (/model|unsupported|not found|invalid model|bad request/i.test(lower)) {
    return {
      statusCode: 400,
      code: 'AI_MODEL_ERROR',
      message: 'The requested AI model is unavailable.'
    }
  }

  if (/network|fetch failed|timeout|econnreset|socket|rate limit|429|temporar/i.test(lower)) {
    return {
      statusCode: 502,
      code: 'AI_NETWORK_ERROR',
      message: 'The AI service is unavailable right now.'
    }
  }

  return {
    statusCode: 502,
    code: 'AI_INVALID_RESPONSE',
    message: 'The AI returned an invalid response.'
  }
}

function deriveStatus(value: unknown, referenceRange?: unknown): 'low' | 'normal' | 'high' | 'unknown' {
  const numericValue = toNumber(value)
  const range = normalizeReferenceRange(referenceRange)

  if (numericValue === undefined || range?.low === undefined || range?.high === undefined) {
    return 'unknown'
  }

  if (numericValue < range.low) {
    return 'low'
  }

  if (numericValue > range.high) {
    return 'high'
  }

  return 'normal'
}

function normalizeGeminiOutput(parsed: unknown, input: MedicalReportInput): MedicalReport {
  const effectiveReportDate = input.reportDate ?? (parsed && typeof parsed === 'object' && 'reportDate' in parsed && typeof (parsed as Record<string, unknown>).reportDate === 'string' ? String((parsed as Record<string, unknown>).reportDate) : undefined)

  if (Array.isArray(parsed)) {
    const tests = parsed.map((entry, index) => {
      const candidate = entry as Record<string, unknown>
      const parameter = String(candidate.parameter_name ?? candidate.parameter ?? `Test ${index + 1}`)
      const unit = typeof candidate.unit === 'string' ? candidate.unit : undefined
      const referenceRange = normalizeReferenceRange(candidate.referenceRange ?? candidate.reference_range, unit)
      const rawValue = candidate.observed_value ?? candidate.value
      const numericValue = toNumber(rawValue)

      return {
        id: `gemini-test-${index + 1}`,
        parameter,
        originalParameter: String(candidate.originalParameter ?? candidate.parameter_name ?? parameter),
        value: numericValue ?? String(rawValue ?? ''),
        unit,
        referenceRange,
        observation: typeof candidate.observation === 'string' ? candidate.observation : typeof candidate.observations === 'string' ? candidate.observations : undefined,
        status: deriveStatus(rawValue, referenceRange),
        source: {
          type: 'ai-extracted' as const,
          label: 'AI extracted'
        }
      }
    })

    return medicalReportSchema.parse({
      id: randomUUID(),
      reportDate: effectiveReportDate,
      source: {
        type: 'user-provided',
        label: 'Current Report',
        fileName: input.fileName
      },
      tests,
      observations: tests
        .map((test) => test.observation)
        .filter((obs): obs is string => Boolean(obs))
        .slice(0, 5),
      extractedNotes: ['Structured extraction completed with live Gemini output.'],
      extractionMetadata: {
        model: googleAiConfig.model,
        extractedAt: new Date().toISOString()
      }
    })
  }

  if (parsed && typeof parsed === 'object') {
    const candidate = parsed as Record<string, unknown>
    const tests = Array.isArray(candidate.tests) ? candidate.tests : []

    if (tests.length > 0) {
      const normalizedTests = tests.map((entry, index) => {
        const item = entry as Record<string, unknown>
        const parameter = String(item.parameter ?? item.parameter_name ?? `Test ${index + 1}`)
        const unit = typeof item.unit === 'string' ? item.unit : undefined
        const referenceRange = normalizeReferenceRange(item.referenceRange ?? item.reference_range, unit)
        const rawValue = item.value ?? item.observed_value
        const numericValue = toNumber(rawValue)

        return {
          id: `gemini-test-${index + 1}`,
          parameter,
          originalParameter: String(item.originalParameter ?? item.parameter_name ?? parameter),
          value: numericValue ?? String(rawValue ?? ''),
          unit,
          referenceRange,
          observation: typeof item.observation === 'string' ? item.observation : typeof item.observations === 'string' ? item.observations : undefined,
          status: deriveStatus(rawValue, referenceRange),
          source: {
            type: 'ai-extracted' as const,
            label: 'AI extracted'
          }
        }
      })

      return medicalReportSchema.parse({
        id: typeof candidate.id === 'string' ? candidate.id : randomUUID(),
        reportDate: effectiveReportDate,
        source: {
          type: 'user-provided',
          label: 'Current Report',
          fileName: input.fileName
        },
        tests: normalizedTests,
        observations: Array.isArray(candidate.observations) ? candidate.observations.filter((value): value is string => typeof value === 'string') : undefined,
        extractedNotes: Array.isArray(candidate.extractedNotes) ? candidate.extractedNotes.filter((value): value is string => typeof value === 'string') : ['Structured extraction completed with live Gemini output.'],
        extractionMetadata: {
          model: typeof candidate.extractionMetadata === 'object' && candidate.extractionMetadata && 'model' in candidate.extractionMetadata ? String((candidate.extractionMetadata as Record<string, unknown>).model ?? googleAiConfig.model) : googleAiConfig.model,
          extractedAt: new Date().toISOString()
        }
      })
    }
  }

  return medicalReportSchema.parse({
    ...((parsed && typeof parsed === 'object') ? parsed : {}),
    reportDate: effectiveReportDate,
    source: {
      type: 'user-provided',
      label: 'Current Report',
      fileName: input.fileName
    }
  })
}

export async function extractMedicalReport(input: MedicalReportInput): Promise<MedicalReport> {
  if (input.text.length > REPORT_TEXT_LIMIT) {
    const error = new Error('Report text is too large.') as Error & { statusCode?: number; code?: string }
    error.statusCode = 413
    error.code = 'REPORT_TOO_LARGE'
    throw error
  }

  const hasGoogleConfig = googleAiConfig.enabled

  if (!hasGoogleConfig) {
    return buildFallbackExtraction(input)
  }

  try {
    const ai = googleAiConfig.apiKey
      ? new GoogleGenAI({
          vertexai: true,
          apiKey: googleAiConfig.apiKey
        })
      : new GoogleGenAI({
          vertexai: true,
          project: googleAiConfig.project,
          location: googleAiConfig.location
        })

    const response = await ai.models.generateContent({
      model: googleAiConfig.model,
      contents: [{
        role: 'user',
        parts: [{
          text: `${promptTemplate}\n\nREPORT TEXT:\n${input.text}`
        }]
      }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    })

    const rawText = stripMarkdownCodeFence(String(response.text ?? ''))
    const parsed = JSON.parse(rawText)
    const report = normalizeGeminiOutput(parsed, input)

    return report
  } catch (error) {
    const classification = classifyAiFailure(error)
    const appError = new Error(classification.message) as Error & { statusCode?: number; code?: string }
    appError.statusCode = classification.statusCode
    appError.code = classification.code

    throw appError
  }
}
