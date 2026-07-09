import { Request, Response, NextFunction } from 'express'
import { adminAuth } from '../config/firebase'

export interface AuthRequest extends Request {
  userId?: string
}

/**
 * Middleware de autenticación: valida el ID token de Firebase enviado en el
 * header `Authorization: Bearer <token>`. Si es válido, expone el `uid` en
 * `req.userId` (fuente de identidad; nunca se confía en el `uid` del body) y
 * continúa; si falta o es inválido/expirado, responde 401 y corta la cadena.
 *
 * @param req  Petición Express extendida con `userId`.
 * @param res  Respuesta Express (401 en caso de fallo).
 * @param next Continúa al siguiente handler si el token es válido.
 */
export async function verifyToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token no proporcionado' })
    return
  }
  const token = authHeader.split('Bearer ')[1]
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    req.userId = decoded.uid
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
