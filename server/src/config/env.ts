import path from 'node:path'

import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '../.env') })

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  GOOGLE_CLOUD_PROJECT: z.string().trim().optional(),
  GOOGLE_CLOUD_LOCATION: z.string().trim().optional(),
  GEMINI_MODEL: z.string().trim().default('gemini-2.5-flash'),
  GOOGLE_API_KEY: z.string().trim().optional()
})

export const env = envSchema.parse(process.env)
