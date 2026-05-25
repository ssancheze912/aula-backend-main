import { Router } from 'express'
import { verifyToken } from '../middlewares/authMiddleware'

const router = Router()

// Placeholder — implementado en Sprint 2
router.get('/', verifyToken, (_req, res) => {
  res.json({ message: 'GET /rooms — Sprint 2' })
})

export default router
