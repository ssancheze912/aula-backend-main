import { Router } from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyToken, type AuthRequest } from '../middlewares/authMiddleware'
import { adminDb } from '../config/firebase'

const router = Router()

router.get('/profile', verifyToken, async (req: AuthRequest, res) => {
  try {
    const snap = await adminDb.collection('users').doc(req.userId!).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Perfil no encontrado' })
      return
    }
    res.json(snap.data())
  } catch {
    res.status(500).json({ error: 'Error al obtener el perfil' })
  }
})

router.post('/profile', verifyToken, async (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, username, email, avatarUrl, provider } = req.body

    if (!firstName || !lastName || !username || !email || !provider) {
      res.status(400).json({ error: 'Faltan campos requeridos' })
      return
    }

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      res.status(400).json({ error: 'Username inválido' })
      return
    }

    const usernameKey = (username as string).toLowerCase()
    const usernameRef = adminDb.collection('usernames').doc(usernameKey)
    const usernameSnap = await usernameRef.get()

    if (usernameSnap.exists && usernameSnap.data()?.uid !== req.userId) {
      res.status(409).json({ error: 'Username ya está en uso' })
      return
    }

    const batch = adminDb.batch()
    batch.set(adminDb.collection('users').doc(req.userId!), {
      uid: req.userId,
      firstName,
      lastName,
      username: usernameKey,
      email,
      avatarUrl:
        avatarUrl ??
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firstName)}`,
      provider,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    batch.set(usernameRef, { uid: req.userId })
    await batch.commit()

    res.status(201).json({ message: 'Perfil creado exitosamente' })
  } catch {
    res.status(500).json({ error: 'Error al crear el perfil' })
  }
})

export default router
