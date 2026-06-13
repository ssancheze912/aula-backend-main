import { Router } from 'express'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyToken, type AuthRequest } from '../middlewares/authMiddleware'
import { adminDb } from '../config/firebase'

const router = Router()

const NAME_MIN = 3
const NAME_MAX = 50

/**
 * @openapi
 * tags:
 *   - name: Rooms
 *     description: Creación y consulta de salas de estudio
 *
 * /api/rooms:
 *   post:
 *     tags: [Rooms]
 *     summary: Crea una sala de estudio (US-06)
 *     description: El creador queda como anfitrión (hostId tomado del token).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 example: Cálculo II — repaso parcial
 *     responses:
 *       201:
 *         description: Sala creada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Room' }
 *       400:
 *         description: Nombre inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: No autenticado.
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
  const hostId = req.userId!
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''

  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    res.status(400).json({ error: `El nombre debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres` })
    return
  }

  try {
    const userSnap = await adminDb.collection('users').doc(hostId).get()
    const hostUsername = (userSnap.data()?.username as string | undefined) ?? ''

    const roomRef = adminDb.collection('rooms').doc()
    await roomRef.set({
      name,
      hostId,
      hostUsername,
      createdAt: FieldValue.serverTimestamp(),
    })

    res.status(201).json({ id: roomRef.id, name, hostId, hostUsername })
  } catch {
    res.status(500).json({ error: 'Error al crear la sala' })
  }
})

/**
 * @openapi
 * /api/rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: Lista las salas del usuario autenticado (US-06)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Salas creadas por el usuario, de la más reciente a la más antigua.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Room' }
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error del servidor.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/', verifyToken, async (req: AuthRequest, res) => {
  try {
    // Filtro por hostId y orden por fecha en memoria: evita el índice compuesto
    // que Firestore exigiría al combinar where + orderBy sobre campos distintos.
    const snap = await adminDb.collection('rooms').where('hostId', '==', req.userId).get()

    const rooms = snap.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name as string,
          hostId: data.hostId as string,
          hostUsername: data.hostUsername as string,
          createdAtMs: (data.createdAt?.toMillis?.() as number | undefined) ?? 0,
        }
      })
      .sort((a, b) => b.createdAtMs - a.createdAtMs)
      .map(({ createdAtMs: _drop, ...room }) => room)

    res.json(rooms)
  } catch {
    res.status(500).json({ error: 'Error al obtener las salas' })
  }
})

/**
 * @openapi
 * /api/rooms/{id}:
 *   get:
 *     tags: [Rooms]
 *     summary: Detalle de una sala por ID (US-06 / US-08)
 *     description: Cualquier usuario autenticado puede consultarla por ID para unirse.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Datos de la sala.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Room' }
 *       404:
 *         description: Sala no encontrada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error del servidor.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const snap = await adminDb.collection('rooms').doc(req.params.id).get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Sala no encontrada' })
      return
    }
    const { name, hostId, hostUsername } = snap.data()!
    res.json({ id: snap.id, name, hostId, hostUsername })
  } catch {
    res.status(500).json({ error: 'Error al obtener la sala' })
  }
})

/**
 * @openapi
 * /api/rooms/{id}:
 *   patch:
 *     tags: [Rooms]
 *     summary: Renombra una sala (US-07, solo anfitrión)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *     responses:
 *       200:
 *         description: Sala actualizada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Room' }
 *       400:
 *         description: Nombre inválido.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Solo el anfitrión puede editar la sala.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Sala no encontrada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error del servidor.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.patch('/:id', verifyToken, async (req: AuthRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    res.status(400).json({ error: `El nombre debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres` })
    return
  }

  try {
    const roomRef = adminDb.collection('rooms').doc(req.params.id)
    const snap = await roomRef.get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Sala no encontrada' })
      return
    }
    const data = snap.data()!
    if (data.hostId !== req.userId) {
      res.status(403).json({ error: 'Solo el anfitrión puede editar la sala' })
      return
    }

    await roomRef.update({ name })
    res.json({ id: snap.id, name, hostId: data.hostId, hostUsername: data.hostUsername })
  } catch {
    res.status(500).json({ error: 'Error al actualizar la sala' })
  }
})

/**
 * @openapi
 * /api/rooms/{id}:
 *   delete:
 *     tags: [Rooms]
 *     summary: Elimina una sala y su historial de chat (US-07, solo anfitrión)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Sala eliminada.
 *       401:
 *         description: No autenticado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Solo el anfitrión puede eliminar la sala.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Sala no encontrada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Error del servidor.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:id', verifyToken, async (req: AuthRequest, res) => {
  try {
    const roomRef = adminDb.collection('rooms').doc(req.params.id)
    const snap = await roomRef.get()
    if (!snap.exists) {
      res.status(404).json({ error: 'Sala no encontrada' })
      return
    }
    if (snap.data()!.hostId !== req.userId) {
      res.status(403).json({ error: 'Solo el anfitrión puede eliminar la sala' })
      return
    }

    // Borrar la subcolección de mensajes antes de eliminar la sala, para no dejar
    // documentos huérfanos. Se trocea en lotes de 500 (límite de un batch de Firestore).
    const messages = await roomRef.collection('messages').get()
    for (let i = 0; i < messages.docs.length; i += 500) {
      const batch = adminDb.batch()
      messages.docs.slice(i, i + 500).forEach((doc) => batch.delete(doc.ref))
      await batch.commit()
    }

    await roomRef.delete()
    res.status(204).send()
  } catch {
    res.status(500).json({ error: 'Error al eliminar la sala' })
  }
})

export default router
