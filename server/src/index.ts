import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import { requestIdMiddleware } from './middleware/request-id.js'
import healthRoutes from './routes/health.routes.js'
import reportsRoutes from './routes/reports.routes.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
  })
)
app.use(express.json({ limit: '1mb' }))
app.use(requestIdMiddleware)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.'
      }
    }
  })
)

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'sibo-api' })
})

app.use('/api/health', healthRoutes)
app.use('/api/reports', reportsRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`Sibo API running on http://localhost:${env.PORT}`)
})
