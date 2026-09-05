import type { NextFunction, Request, Response } from 'express'

export type AppError = Error & {
  statusCode?: number
  code?: string
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found.'
    }
  })
}

export function errorHandler(
  error: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = error.statusCode ?? 500
  const code = error.code ?? 'INTERNAL_ERROR'
  const message = statusCode >= 500 ? 'An unexpected error occurred.' : error.message

  console.error('[sibo-api]', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    message
  })

  res.status(statusCode).json({
    error: {
      code,
      message
    }
  })
}
