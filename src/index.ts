import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import userRoutes from './routes/userRoutes'

const app = express()
const PORT = process.env.PORT || 3001

app.use(helmet())
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(express.json({ limit: '10kb' }))

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

app.use('/api/users', userRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend-main' })
})

app.listen(PORT, () => {
  console.log(`backend-main corriendo en puerto ${PORT}`)
})

export default app
