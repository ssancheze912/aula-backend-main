import type { Express } from 'express'
import swaggerUi from 'swagger-ui-express'
import openApiSpec from '../docs/openapi'

export function setupSwagger(app: Express): void {
  app.get('/api/docs/openapi.json', (_req, res) => {
    res.json(openApiSpec)
  })

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customSiteTitle: 'aula API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    })
  )
}
