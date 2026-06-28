import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import swaggerUi from 'swagger-ui-express'
import userRoutes from './routes/userRoutes'
import roomRoutes from './routes/roomRoutes'
import { swaggerSpec } from './config/swagger'
import { errorHandler } from './middlewares/errorHandler'

const app = express()
const PORT = process.env.PORT || 3001

// Documentación Swagger en /api/docs (antes de helmet para no chocar con la CSP).
app.get('/api/docs.json', (_req, res) => {
  res.json(swaggerSpec)
})
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
// 1mb deja holgura para el avatar del perfil (imagen subida desde el equipo,
// recortada a 256px y embebida como data URL ~20-40 KB). El resto de payloads son pequeños.
app.use(express.json({ limit: '1mb' }))

// Log de cada petición: método, ruta, código de estado y duración.
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`
    )
  })
  next()
})

// Rate limiting: 120 peticiones/min por IP sobre la API. Frena fuerza bruta y
// abuso sin estorbar el uso normal (la app hace pocas llamadas por interacción).
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, inténtalo de nuevo en un momento.' },
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend-main' })
})

app.use('/api/users', apiLimiter, userRoutes)
app.use('/api/rooms', apiLimiter, roomRoutes)

// Recurso no encontrado (404) para cualquier ruta no manejada arriba.
app.use((_req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' })
})

// Manejador de errores transversal: captura JSON malformado (SyntaxError del body
// parser) y cualquier excepción no atrapada en las rutas, sin filtrar el stack.
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`backend-main corriendo en puerto ${PORT}`)
})

export default app
