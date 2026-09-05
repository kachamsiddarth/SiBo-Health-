import { randomUUID } from 'crypto'

import { GoogleGenAI } from '@google/genai'

import { googleAiConfig } from '../../config/google.js'
import { medicalReportSchema, type MedicalReport, type MedicalReportInput } from '../../schemas/report.schema.js'

type SummaryPatientContext = {
  allergies?: string[]
  medications?: string[]
  conditions?: string[]
  symptoms?: string[]
  age?: number | string
  sex?: string
}

const REPORT_TEXT_LIMIT = 20000

const promptTemplate = `You are extracting structured information from a medical report.

You are NOT diagnosing the patient.
You are NOT providing treatment advice.
Extract only information supported by the supplied report.
Preserve the original wording of test and parameter names.
Where possible, normalize obvious equivalent terminology while preserving the original term separately.
If the report includes patient-level context such as allergies, medications, conditions, symptoms, age, or sex, capture it in a top-level "patientContext" object.

Return ONLY valid JSON in this exact shape:
{
  "id": "unique-id",
  "reportDate": "YYYY-MM-DD or null",
  "source": {
    "type": "user-provided",
    "label": "Current Report",
    "fileName": "optional-file-name"
  },
  "patientContext": {
    "allergies": ["Penicillin"],
    "medications": ["Metformin 500 mg"],
    "conditions": ["Hypertension"],
    "symptoms": ["Fatigue"],
    "demographics": {
      "age": 42,
      "sex": "Female"
    }
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

function splitFieldList(value: string | undefined): string[] {
  if (!value) {
    return []
  }

  return value
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function extractPatientContextFromText(text: string): {
  allergies?: string[]
  medications?: string[]
  conditions?: string[]
  symptoms?: string[]
  demographics?: { age?: number | string; sex?: string }
} {
  const lines = text.split(/\r?\n/)
  const result: {
    allergies?: string[]
    medications?: string[]
    conditions?: string[]
    symptoms?: string[]
    demographics?: { age?: number | string; sex?: string }
  } = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const allergyMatch = trimmed.match(/^allerg(?:y|ies)\s*:\s*(.+)$/i)
    if (allergyMatch) {
      result.allergies = splitFieldList(allergyMatch[1])
      continue
    }

    const medicationMatch = trimmed.match(/^(?:current\s+)?medications?\s*:\s*(.+)$/i)
    if (medicationMatch) {
      result.medications = splitFieldList(medicationMatch[1])
      continue
    }

    const conditionMatch = trimmed.match(/^conditions?\s*:\s*(.+)$/i)
    if (conditionMatch) {
      result.conditions = splitFieldList(conditionMatch[1])
      continue
    }

    const symptomMatch = trimmed.match(/^symptoms?\s*:\s*(.+)$/i)
    if (symptomMatch) {
      result.symptoms = splitFieldList(symptomMatch[1])
      continue
    }

    const ageMatch = trimmed.match(/^age\s*[:\-]?\s*(\d{1,3})\b/i)
    if (ageMatch && !result.demographics) {
      result.demographics = { age: Number(ageMatch[1]) }
      continue
    }

    const sexMatch = trimmed.match(/^sex\s*[:\-]?\s*([a-z ]+)$/i)
    if (sexMatch && !result.demographics) {
      result.demographics = { sex: sexMatch[1].trim() }
    }
  }

  return Object.keys(result).length > 0 ? result : {}
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
    patientContext: extractPatientContextFromText(input.text),
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

function sanitizeNullishValues(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => sanitizeNullishValues(entry))
      .filter((entry) => entry !== undefined)
  }

  if (typeof value === 'object') {
    const cleaned: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = sanitizeNullishValues(nestedValue)
      if (sanitized !== undefined) {
        cleaned[key] = sanitized
      }
    }

    return cleaned
  }

  return value
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
  const cleanedParsed = sanitizeNullishValues(parsed) as Record<string, unknown>
  const effectiveReportDate = input.reportDate ?? (cleanedParsed && typeof cleanedParsed === 'object' && 'reportDate' in cleanedParsed && typeof cleanedParsed.reportDate === 'string' ? cleanedParsed.reportDate : undefined)
  const effectivePatientContext = (cleanedParsed && typeof cleanedParsed === 'object' && 'patientContext' in cleanedParsed && cleanedParsed.patientContext)
    ? cleanedParsed.patientContext
    : extractPatientContextFromText(input.text)

  if (Array.isArray(cleanedParsed)) {
    const tests = cleanedParsed.map((entry, index) => {
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
      patientContext: effectivePatientContext,
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

  if (cleanedParsed && typeof cleanedParsed === 'object') {
    const candidate = cleanedParsed as Record<string, unknown>
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
        patientContext: effectivePatientContext,
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
    ...((cleanedParsed && typeof cleanedParsed === 'object') ? cleanedParsed : {}),
    reportDate: effectiveReportDate,
    source: {
      type: 'user-provided',
      label: 'Current Report',
      fileName: input.fileName
    },
    patientContext: effectivePatientContext
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
    console.info('[sibo-ai]', {
      phase: 'extract-start',
      hasApiKey: Boolean(googleAiConfig.apiKey),
      model: googleAiConfig.model,
      textLength: input.text.length
    })

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
    console.info('[sibo-ai]', {
      phase: 'extract-response',
      model: googleAiConfig.model,
      responseReceived: Boolean(rawText),
      responseLength: rawText.length
    })

    let parsed: unknown
    try {
      parsed = JSON.parse(rawText)
      console.info('[sibo-ai]', { phase: 'extract-json-parse', success: true, responseLength: rawText.length })
    } catch (parseError) {
      console.error('[sibo-ai]', {
        phase: 'extract-json-parse',
        success: false,
        error: parseError instanceof Error ? parseError.message : String(parseError)
      })
      throw parseError
    }

    try {
      const report = normalizeGeminiOutput(parsed, input)
      console.info('[sibo-ai]', { phase: 'extract-zod-validate', success: true, tests: report.tests.length })
      return report
    } catch (schemaError) {
      console.error('[sibo-ai]', {
        phase: 'extract-zod-validate',
        success: false,
        error: schemaError instanceof Error ? schemaError.message : String(schemaError)
      })
      throw schemaError
    }
  } catch (error) {
    const classification = classifyAiFailure(error)
    const appError = new Error(classification.message) as Error & { statusCode?: number; code?: string }
    appError.statusCode = classification.statusCode
    appError.code = classification.code

    throw appError
  }
}

function buildDeterministicSummary(payload: { patient?: SummaryPatientContext | null; report: MedicalReport; previousReport?: MedicalReport | null }) {
  const { report, previousReport, patient } = payload
  const tests = report.tests ?? []
  const notableMeasurements = tests.slice(0, 3).map((test) => {
    const value = typeof test.value === 'number' ? test.value : String(test.value ?? 'not provided')
    const rangeText = test.referenceRange?.text ? ` (reference: ${test.referenceRange.text})` : ''
    return `${test.parameter}: ${value}${rangeText}`
  })

  const flags = []
  if (patient?.allergies?.length) flags.push(`Patient allergies: ${patient.allergies.join(', ')}`)
  if (patient?.medications?.length) flags.push(`Patient medications: ${patient.medications.join(', ')}`)
  if (report.patientContext?.allergies?.length) flags.push(`Current report allergies: ${report.patientContext.allergies.join(', ')}`)
  if (report.patientContext?.medications?.length) flags.push(`Current report medications: ${report.patientContext.medications.join(', ')}`)
  if (previousReport) flags.push(`Previous report compared: ${previousReport.tests.length} measurements available`)

  return [
    'The report contains extracted clinical information from the supplied report data.',
    notableMeasurements.length > 0 ? `Key measurements include: ${notableMeasurements.join('; ')}.` : 'No numeric measurements were extracted.',
    flags.length > 0 ? `Relevant context includes: ${flags.join('; ')}.` : 'No additional patient context was captured.',
    'Any values marked LOW, HIGH, or UNKNOWN reflect the source-provided range analysis and should be reviewed by a human when conflicts or missing information are present.'
  ].join(' ')
}

export async function generateReportSummary(payload: {
  patient?: SummaryPatientContext | null
  report: MedicalReport
  previousReport?: MedicalReport | null
}): Promise<{ summary: string }> {
  if (!payload.report) {
    throw new Error('A report is required to generate a summary.')
  }

  if (!googleAiConfig.enabled) {
    return { summary: buildDeterministicSummary(payload) }
  }

  try {
    console.info('[sibo-ai]', {
      phase: 'summary-start',
      hasApiKey: Boolean(googleAiConfig.apiKey),
      model: googleAiConfig.model
    })

    const ai = googleAiConfig.apiKey
      ? new GoogleGenAI({ vertexai: true, apiKey: googleAiConfig.apiKey })
      : new GoogleGenAI({ vertexai: true, project: googleAiConfig.project, location: googleAiConfig.location })

    const prompt = `You are summarizing a medical report using the already-extracted structured data below. Do not diagnose or provide treatment advice. Use careful neutral language. Return JSON only in the form {"summary":"..."}.\n\nINPUT:\n${JSON.stringify({ patient: payload.patient ?? null, report: payload.report, previousReport: payload.previousReport ?? null }, null, 2)}`

    const response = await ai.models.generateContent({
      model: googleAiConfig.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json', temperature: 0.2 }
    })

    const rawText = stripMarkdownCodeFence(String(response.text ?? ''))
    console.info('[sibo-ai]', {
      phase: 'summary-response',
      responseReceived: Boolean(rawText),
      responseLength: rawText.length
    })

    const parsed = JSON.parse(rawText)
    const sanitized = sanitizeNullishValues(parsed) as Record<string, unknown>
    const summary = typeof sanitized?.summary === 'string' && sanitized.summary.trim() ? sanitized.summary : buildDeterministicSummary(payload)

    return { summary }
  } catch (error) {
    console.warn('[sibo-ai]', {
      phase: 'summary-fallback',
      reason: error instanceof Error ? error.message : String(error)
    })
    return { summary: buildDeterministicSummary(payload) }
  }
}
