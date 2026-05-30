import { Router } from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyToken, type AuthRequest } from '../middlewares/authMiddleware'
import { adminAuth, adminDb } from '../config/firebase'

const router = Router()

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

function isOwner(req: AuthRequest, uid: string): boolean {
  return req.userId === uid
}

/**
 * @openapi
 * tags:
 *   - name: Users
 *     description: Gestión de perfiles de usuario
 *
 * /api/users/check-username/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Verifica la disponibilidad de un username
 *     description: Público — se usa durante el registro, cuando aún no hay sesión.
 *     security: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *         description: Username a verificar (3-20 caracteres alfanuméricos o _).
 *     responses:
 *       200:
 *         description: Resultado de la verificación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 available: { type: boolean, example: true }
 *       400:
 *         description: Username inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error del servidor.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/check-username/:username', async (req, res) => {
  const username = req.params.username
  if (!USERNAME_RE.test(username)) {
    res.status(400).json({ error: 'Username inválido', available: false })
    return
  }
  try {
    const snap = await adminDb.collection('usernames').doc(username.toLowerCase()).get()
    res.json({ available: !snap.exists })
  } catch {
    res.status(500).json({ error: 'Error al verificar el username' })
  }
})

/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: Crea el perfil del usuario autenticado (US-01/US-02)
 *     description: El uid se toma del token, nunca del body. Reserva el username de forma atómica.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, username, email, provider]
 *             properties:
 *               firstName: { type: string, example: Ada }
 *               lastName: { type: string, example: Lovelace }
 *               username: { type: string, example: ada_l }
 *               email: { type: string, format: email, example: ada@example.com }
 *               avatarUrl: { type: string, format: uri }
 *               provider: { type: string, enum: [email, google] }
 *     responses:
 *       201:
 *         description: Perfil creado exitosamente.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Message' }
 *       400:
 *         description: Faltan campos requeridos o username inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: El perfil ya existe o el username está en uso.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error del servidor.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/', verifyToken, async (req: AuthRequest, res) => {
  const { firstName, lastName, username, email, avatarUrl, provider } = req.body
  const uid = req.userId!

  if (!firstName || !lastName || !username || !email || !provider) {
    res.status(400).json({ error: 'Faltan campos requeridos' })
    return
  }
  if (!USERNAME_RE.test(username)) {
    res.status(400).json({ error: 'Username inválido (3-20 caracteres: letras, números o _)' })
    return
  }

  const usernameKey = (username as string).toLowerCase()
  try {
    await adminDb.runTransaction(async (tx) => {
      const userRef = adminDb.collection('users').doc(uid)
      const userSnap = await tx.get(userRef)
      if (userSnap.exists) {
        const err = new Error('El perfil ya existe') as Error & { code?: string }
        err.code = 'profile-exists'
        throw err
      }

      const usernameRef = adminDb.collection('usernames').doc(usernameKey)
      const usernameSnap = await tx.get(usernameRef)
      if (usernameSnap.exists) {
        const err = new Error('Username ya está en uso') as Error & { code?: string }
        err.code = 'username-taken'
        throw err
      }

      tx.set(userRef, {
        uid,
        firstName,
        lastName,
        username: usernameKey,
        email,
        avatarUrl:
          avatarUrl ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(firstName)}`,
        provider,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      tx.set(usernameRef, { uid })
    })

    res.status(201).json({ message: 'Perfil creado exitosamente' })
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === 'username-taken') {
      res.status(409).json({ error: 'Username ya está en uso' })
      return
    }
    if (e.code === 'profile-exists') {
      res.status(409).json({ error: 'El perfil ya existe' })
      return
    }
    res.status(500).json({ error: 'Error al crear el perfil' })
  }
})

/**
 * @openapi
 * /api/users/{uid}:
 *   get:
 *     tags: [Users]
 *     summary: Obtiene el perfil del propietario (US-04)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Perfil del usuario.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserProfile' }
 *       403:
 *         description: No autorizado (no es el propietario).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Perfil no encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error del servidor.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:uid', verifyToken, async (req: AuthRequest, res) => {
  if (!isOwner(req, req.params.uid)) {
    res.status(403).json({ error: 'No autorizado' })
    return
  }
  try {
    const snap = await adminDb.collection('users').doc(req.params.uid).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Perfil no encontrado' })
      return
    }
    res.json(snap.data())
  } catch {
    res.status(500).json({ error: 'Error al obtener el perfil' })
  }
})

/**
 * @openapi
 * /api/users/{uid}:
 *   patch:
 *     tags: [Users]
 *     summary: Edita el perfil (US-04)
 *     description: Maneja el cambio de username de forma atómica.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               avatarUrl: { type: string, format: uri }
 *               username: { type: string }
 *     responses:
 *       200:
 *         description: Perfil actualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/UserProfile' }
 *       400:
 *         description: Username inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: No autorizado (no es el propietario).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Perfil no encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Username ya está en uso.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error del servidor.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/:uid', verifyToken, async (req: AuthRequest, res) => {
  const { uid } = req.params
  if (!isOwner(req, uid)) {
    res.status(403).json({ error: 'No autorizado' })
    return
  }

  const { firstName, lastName, avatarUrl, username } = req.body
  const updates: Record<string, unknown> = {}
  if (firstName !== undefined) updates.firstName = firstName
  if (lastName !== undefined) updates.lastName = lastName
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl

  if (username !== undefined && !USERNAME_RE.test(username)) {
    res.status(400).json({ error: 'Username inválido (3-20 caracteres: letras, números o _)' })
    return
  }

  try {
    const userRef = adminDb.collection('users').doc(uid)
    await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef)
      if (!userSnap.exists) {
        const err = new Error('Perfil no encontrado') as Error & { code?: string }
        err.code = 'not-found'
        throw err
      }

      if (username !== undefined) {
        const newKey = (username as string).toLowerCase()
        const currentKey = userSnap.data()?.username as string | undefined
        if (newKey !== currentKey) {
          const newRef = adminDb.collection('usernames').doc(newKey)
          const newSnap = await tx.get(newRef)
          if (newSnap.exists) {
            const err = new Error('Username ya está en uso') as Error & { code?: string }
            err.code = 'username-taken'
            throw err
          }
          tx.set(newRef, { uid })
          if (currentKey) tx.delete(adminDb.collection('usernames').doc(currentKey))
          updates.username = newKey
        }
      }

      tx.update(userRef, { ...updates, updatedAt: FieldValue.serverTimestamp() })
    })

    const fresh = await userRef.get()
    res.json(fresh.data())
  } catch (err) {
    const e = err as Error & { code?: string }
    if (e.code === 'not-found') {
      res.status(404).json({ error: 'Perfil no encontrado' })
      return
    }
    if (e.code === 'username-taken') {
      res.status(409).json({ error: 'Username ya está en uso' })
      return
    }
    res.status(500).json({ error: 'Error al actualizar el perfil' })
  }
})

/**
 * @openapi
 * /api/users/{uid}:
 *   delete:
 *     tags: [Users]
 *     summary: Elimina la cuenta (US-05)
 *     description: Borra el perfil, libera el username y elimina el usuario de Firebase Auth.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cuenta eliminada exitosamente.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Message' }
 *       403:
 *         description: No autorizado (no es el propietario).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error del servidor.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:uid', verifyToken, async (req: AuthRequest, res) => {
  const { uid } = req.params
  if (!isOwner(req, uid)) {
    res.status(403).json({ error: 'No autorizado' })
    return
  }

  try {
    const userRef = adminDb.collection('users').doc(uid)
    const snap = await userRef.get()

    const batch = adminDb.batch()
    batch.delete(userRef)
    const username = snap.data()?.username as string | undefined
    if (username) batch.delete(adminDb.collection('usernames').doc(username))
    await batch.commit()

    await adminAuth.deleteUser(uid)

    res.json({ message: 'Cuenta eliminada exitosamente' })
  } catch {
    res.status(500).json({ error: 'Error al eliminar la cuenta' })
  }
})

export default router
