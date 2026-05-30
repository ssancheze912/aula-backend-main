import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import { errorHandler } from './middlewares/errorHandler'
import { setupSwagger } from './config/swagger'

const app = express()
const PORT = process.env.PORT || 3001

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(express.json({ limit: '10kb' }))

setupSwagger(app)

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend-main' })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`backend-main corriendo en puerto ${PORT}`)
  console.log(`Swagger UI: http://localhost:${PORT}/api/docs`)
})

export default app
