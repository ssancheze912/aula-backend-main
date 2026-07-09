import { Request, Response, NextFunction } from 'express'

// Errores que express.json() adjunta con un status HTTP (type) ya definido.
interface HttpError extends Error {
  status?: number
  statusCode?: number
  type?: string
}

/**
 * Manejo de errores transversal (último middleware de la cadena). Traduce los
 * errores conocidos a respuestas JSON con el status adecuado:
 * CORS → 403, JSON malformado → 400, payload demasiado grande → 413, y cualquier
 * error con status explícito se respeta; el resto es 500. En producción los 5xx
 * no filtran el mensaje interno ni el stack.
 *
 * @param err   Error capturado (puede traer `status`/`statusCode`/`type`).
 * @param _req  Petición Express (no usada).
 * @param res   Respuesta Express donde se escribe el error en JSON.
 * @param _next Firma requerida por Express para reconocerlo como error handler.
 */
export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err.stack)

  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Origen no permitido' })
    return
  }

  // JSON malformado en el body (express.json() lanza SyntaxError, status 400).
  if (err.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido en el cuerpo de la petición' })
    return
  }

  // Payload mayor al límite configurado (1mb).
  if (err.type === 'entity.too.large') {
    res.status(413).json({ error: 'El cuerpo de la petición es demasiado grande' })
    return
  }

  // Cualquier otro error con status explícito (4xx) se respeta; el resto es 500.
  const status = err.status ?? err.statusCode ?? 500
  const message =
    status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message

  res.status(status).json({ error: message })
}
