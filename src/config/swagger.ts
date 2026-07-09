import swaggerJsdoc from 'swagger-jsdoc'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Backend Principal — Salón de Estudio Colaborativo',
      version: '1.0.0',
      description:
        'API REST de autenticación, perfiles de usuario y salas (Firebase Auth + Firestore).',
    },
    servers: [
      {
        url: process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`,
        description: 'Servidor actual',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token de ID de Firebase (header Authorization: Bearer <token>).',
        },
      },
      schemas: {
        UserProfile: {
          type: 'object',
          properties: {
            uid: { type: 'string', example: 'aBcD1234efGh' },
            firstName: { type: 'string', example: 'Ada' },
            lastName: { type: 'string', example: 'Lovelace' },
            username: { type: 'string', example: 'ada_l' },
            email: { type: 'string', format: 'email', example: 'ada@example.com' },
            avatarUrl: { type: 'string', format: 'uri' },
            provider: { type: 'string', enum: ['email', 'google'] },
            bio: { type: 'string', example: 'Estudiante de Ingeniería ✨' },
            link: { type: 'string', example: 'sofiagarcia.github.io' },
            university: { type: 'string', example: 'Universidad del Valle' },
            career: { type: 'string', example: 'Ingeniería de Sistemas' },
            year: { type: 'string', example: '3er año' },
            country: { type: 'string', example: 'Colombia' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Room: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'kZ3p9QwillsAbc12' },
            name: { type: 'string', example: 'Cálculo II — repaso parcial' },
            hostId: { type: 'string', example: 'aBcD1234efGh' },
            hostUsername: { type: 'string', example: 'ada_l' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Token no proporcionado' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Perfil creado exitosamente' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
}

/**
 * Especificación OpenAPI 3.0 generada a partir de las anotaciones `@openapi`
 * de los archivos de rutas. La sirve `swagger-ui-express` en `/api/docs` y se
 * expone en crudo en `/api/docs.json`.
 */
export const swaggerSpec = swaggerJsdoc(options)
