import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

declare global {
  namespace Express {
    interface Request {
      requestId: string
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const incomingRequestId = req.get('x-request-id')
  const requestId = incomingRequestId && incomingRequestId.trim().length > 0
    ? incomingRequestId.trim()
    : randomUUID()

  req.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  next()
}
