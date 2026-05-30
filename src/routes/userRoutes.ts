import { Router } from 'express'
import { verifyToken, type AuthRequest } from '../middlewares/authMiddleware'
import {
  createUserProfile,
  deleteUserProfile,
  getUserProfile,
  InvalidUsernameError,
  isUsernameAvailable,
  ProfileAlreadyExistsError,
  ProfileNotFoundError,
  updateUserProfile,
  UsernameTakenError,
} from '../services/userService'
import { isValidProvider, isValidUsername } from '../utils/validation'

const router = Router()

router.get('/username/:username/available', async (req, res) => {
  const { username } = req.params

  if (!isValidUsername(username)) {
    res.status(400).json({ error: 'Username inválido' })
    return
  }

  try {
    const available = await isUsernameAvailable(username)
    res.json({ available })
  } catch {
    res.status(500).json({ error: 'Error al verificar el username' })
  }
})

router.get('/profile', verifyToken, async (req: AuthRequest, res) => {
  try {
    const profile = await getUserProfile(req.userId!)
    if (!profile) {
      res.status(404).json({ error: 'Perfil no encontrado' })
      return
    }
    res.json(profile)
  } catch {
    res.status(500).json({ error: 'Error al obtener el perfil' })
  }
})

router.post('/profile', verifyToken, async (req: AuthRequest, res) => {
  const { firstName, lastName, username, email, avatarUrl, provider } = req.body

  if (username == null || email == null || provider == null) {
    res.status(400).json({ error: 'Faltan campos requeridos' })
    return
  }

  if (!isValidUsername(username)) {
    res.status(400).json({ error: 'Username inválido' })
    return
  }

  if (!isValidProvider(provider)) {
    res.status(400).json({ error: 'Provider inválido' })
    return
  }

  try {
    const profile = await createUserProfile({
      uid: req.userId!,
      firstName: typeof firstName === 'string' ? firstName : '',
      lastName: typeof lastName === 'string' ? lastName : '',
      username,
      email,
      avatarUrl,
      provider,
    })
    res.status(201).json(profile)
  } catch (err) {
    if (err instanceof ProfileAlreadyExistsError) {
      res.status(409).json({ error: err.message })
      return
    }
    if (err instanceof UsernameTakenError) {
      res.status(409).json({ error: err.message })
      return
    }
    res.status(500).json({ error: 'Error al crear el perfil' })
  }
})

router.put('/profile', verifyToken, async (req: AuthRequest, res) => {
  const { firstName, lastName, username, avatarUrl } = req.body

  if (
    firstName == null &&
    lastName == null &&
    username == null &&
    avatarUrl == null
  ) {
    res.status(400).json({ error: 'Debe enviar al menos un campo para actualizar' })
    return
  }

  if (username != null && typeof username !== 'string') {
    res.status(400).json({ error: 'Username inválido' })
    return
  }

  try {
    const profile = await updateUserProfile(req.userId!, {
      firstName: typeof firstName === 'string' ? firstName : undefined,
      lastName: typeof lastName === 'string' ? lastName : undefined,
      username: typeof username === 'string' ? username : undefined,
      avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined,
    })
    res.json(profile)
  } catch (err) {
    if (err instanceof ProfileNotFoundError) {
      res.status(404).json({ error: err.message })
      return
    }
    if (err instanceof InvalidUsernameError) {
      res.status(400).json({ error: err.message })
      return
    }
    if (err instanceof UsernameTakenError) {
      res.status(409).json({ error: err.message })
      return
    }
    res.status(500).json({ error: 'Error al actualizar el perfil' })
  }
})

router.delete('/profile', verifyToken, async (req: AuthRequest, res) => {
  try {
    await deleteUserProfile(req.userId!)
    res.status(204).send()
  } catch (err) {
    if (err instanceof ProfileNotFoundError) {
      res.status(404).json({ error: err.message })
      return
    }
    res.status(500).json({ error: 'Error al eliminar el perfil' })
  }
})

export default router
