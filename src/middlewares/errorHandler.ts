import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err.stack)

  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Origen no permitido' })
    return
  }

  const message =
    process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message

  res.status(500).json({ error: message })
}
