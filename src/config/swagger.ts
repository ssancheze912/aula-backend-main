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
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
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

export const swaggerSpec = swaggerJsdoc(options)
