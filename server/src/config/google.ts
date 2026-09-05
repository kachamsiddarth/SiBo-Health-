import { env } from './env.js'

export const googleAiConfig = {
  project: env.GOOGLE_CLOUD_PROJECT,
  location: env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  model: env.GEMINI_MODEL || 'gemini-2.5-flash',
  apiKey: env.GOOGLE_API_KEY,
  enabled: Boolean(env.GOOGLE_API_KEY || (env.GOOGLE_CLOUD_PROJECT && env.GOOGLE_CLOUD_LOCATION))
} as const
