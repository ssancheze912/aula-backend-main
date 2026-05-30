import { Router } from 'express'
import { verifyToken, type AuthRequest } from '../middlewares/authMiddleware'
import { getUserProfile } from '../services/userService'
import {
  AuthError,
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
  toAuthResponse,
} from '../services/authService'

const router = Router()

router.post('/register', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son requeridos' })
    return
  }

  try {
    const tokens = await registerWithEmail(email, password)
    res.status(201).json(toAuthResponse(tokens))
  } catch (err) {
    if (err instanceof AuthError) {
      const status = err.code === 'EMAIL_EXISTS' ? 409 : 400
      res.status(status).json({ error: err.message, code: err.code })
      return
    }
    res.status(500).json({ error: 'Error al registrar la cuenta' })
  }
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son requeridos' })
    return
  }

  try {
    const tokens = await loginWithEmail(email, password)
    res.json(toAuthResponse(tokens))
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message, code: err.code })
      return
    }
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
})

router.post('/google', async (req, res) => {
  const { idToken } = req.body

  if (!idToken || typeof idToken !== 'string') {
    res.status(400).json({ error: 'Token de Google requerido' })
    return
  }

  try {
    const tokens = await loginWithGoogle(idToken)
    res.json(toAuthResponse(tokens))
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(401).json({ error: err.message, code: err.code })
      return
    }
    res.status(500).json({ error: 'Error al iniciar sesión con Google' })
  }
})

router.get('/me', verifyToken, async (req: AuthRequest, res) => {
  let profile = null
  try {
    profile = await getUserProfile(req.userId!)
  } catch {
    // Firestore puede fallar sin credenciales Admin; la sesión del token sigue siendo válida
  }

  res.json({
    uid: req.userId,
    email: req.userEmail ?? null,
    displayName: req.userDisplayName ?? null,
    photoUrl: req.userPhotoUrl ?? null,
    profile,
  })
})

export default router
