import { Request, Response, NextFunction } from 'express'
import { adminAuth } from '../config/firebase'

export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
  userDisplayName?: string
  userPhotoUrl?: string
}

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
    req.userEmail = decoded.email
    req.userDisplayName = decoded.name
    req.userPhotoUrl = decoded.picture
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
