import type { Express, Request, Response, NextFunction } from 'express'
import swaggerUi from 'swagger-ui-express'
import { buildOpenApiSpec } from '../docs/openapi'

function getRequestBaseUrl(req: Request): string {
  const proto = req.get('x-forwarded-proto')?.split(',')[0]?.trim() || req.protocol
  return `${proto}://${req.get('host')}`
}

export function setupSwagger(app: Express): void {
  const uiOptions = {
    customSiteTitle: 'aula API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }

  app.get('/api/docs/openapi.json', (req: Request, res: Response) => {
    res.json(buildOpenApiSpec(getRequestBaseUrl(req)))
  })

  app.use('/api/docs', swaggerUi.serve, (req: Request, res: Response, next: NextFunction) => {
    swaggerUi.setup(buildOpenApiSpec(getRequestBaseUrl(req)), uiOptions)(req, res, next)
  })
}
