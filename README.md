# backend-main — API REST (StudyRoom)

Backend principal del [Salón de Estudio Colaborativo](https://github.com/ssancheze912/aula-frontend). Expone una API REST
de **autenticación, perfiles de usuario y salas**, respaldada por Firebase Auth y Firestore.
El frontend nunca escribe en Firestore directamente: toda escritura pasa por esta API
usando el Admin SDK (`Frontend ↔ API ↔ Base de datos`).

- **Stack:** Node.js + TypeScript + Express + Firebase Admin SDK
- **Despliegue:** Render — https://aula-backend-main-6uoz.onrender.com
- **Docs API (Swagger):** `/api/docs` · espec JSON en `/api/docs.json`

## Endpoints

Todas las rutas van bajo `/api`. Salvo las marcadas como *públicas*, requieren el header
`Authorization: Bearer <Firebase ID token>`.

### Usuarios (`/api/users`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET`    | `/check-username/:username` | Disponibilidad de un username | Pública |
| `POST`   | `/`        | Crea el perfil del usuario autenticado (US-01/02). El `uid` se toma del token | Sí |
| `GET`    | `/:uid`    | Obtiene el perfil (solo el propietario) (US-04) | Sí |
| `PATCH`  | `/:uid`    | Edita el perfil; cambio de username atómico (US-04) | Sí |
| `DELETE` | `/:uid`    | Elimina la cuenta (perfil + username + Firebase Auth) (US-05) | Sí |

### Salas (`/api/rooms`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST`   | `/`     | Crea una sala; el creador queda como anfitrión (US-06) | Sí |
| `GET`    | `/`     | Lista las salas del usuario autenticado (US-06) | Sí |
| `GET`    | `/:id`  | Detalle de una sala por ID, para unirse (US-08) | Sí |
| `PATCH`  | `/:id`  | Renombra una sala (solo anfitrión) (US-07) | Sí |
| `DELETE` | `/:id`  | Elimina la sala y su historial de chat (solo anfitrión) (US-07) | Sí |

### Operación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Health check: `{ "status": "ok", "service": "backend-main" }` |
| `GET` | `/api/docs` | Swagger UI |

## Seguridad y hardening

- **Auth:** `verifyToken` valida el ID token de Firebase en cada ruta protegida; el `uid`
  se deriva del token, nunca del body. Comprobaciones de propietario/anfitrión en lectura y escritura.
- **Helmet** para cabeceras HTTP seguras y **CORS** restringido a `FRONTEND_URL`.
- **Rate limiting:** 120 req/min por IP sobre `/api`.
- **Validación de entradas:** username (`/^[a-zA-Z0-9_]{3,20}$/`), correo institucional
  (`.edu`), longitudes máximas de campos de perfil y nombre de sala (3–50).
- **Límite de body** de 1 MB (holgura para el avatar embebido como data URL).
- **Manejo de errores transversal** (`errorHandler`): JSON malformado → 400, payload
  grande → 413, CORS → 403; en producción no se filtra el stack ni el detalle de errores 5xx.
- **404** JSON para rutas no encontradas.
- **Reglas de Firestore** (`firestore.rules`): defensa en profundidad — niegan toda
  escritura desde clientes y limitan la lectura al propietario / usuarios autenticados.

## Variables de entorno

Copia `.env.example` a `.env`:

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto HTTP (default 3001) |
| `NODE_ENV` | `development` / `production` (oculta detalles de error en prod) |
| `FRONTEND_URL` | Origen permitido por CORS (ej. la URL de Vercel) |
| `API_URL` | URL pública de esta API; Swagger la usa como "server" |
| `FIREBASE_PROJECT_ID` | Proyecto de Firebase |
| `FIREBASE_CLIENT_EMAIL` | Cuenta de servicio (Admin SDK) |
| `FIREBASE_PRIVATE_KEY` | Clave privada de la cuenta de servicio |

## Desarrollo

```bash
npm install
npm run dev      # hot-reload en http://localhost:3001
npm run build    # compila TypeScript a dist/
npm start        # ejecuta la versión compilada
```

## Despliegue (Render)

Se despliega como *Web Service* en Render desde este repositorio:

| Ajuste | Valor |
|--------|-------|
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

Variables de entorno en el dashboard de Render (**Environment**) — las mismas de la tabla
de arriba. `PORT` la inyecta Render automáticamente; define `NODE_ENV=production`,
`FRONTEND_URL` con la URL de Vercel (`https://aula-weld.vercel.app`), `API_URL` con la URL
pública de este servicio (`https://aula-backend-main-6uoz.onrender.com`; Swagger la usa como
*server*) y las tres `FIREBASE_*` (pega la clave con los `\n` escapados, tal cual vienen del
JSON de la cuenta de servicio).

Tras el deploy, verifica:
`curl https://aula-backend-main-6uoz.onrender.com/health` →
`{"status":"ok","service":"backend-main"}`. Las docs quedan en `/api/docs`.

**Reglas de Firestore:** publica `firestore.rules` con la Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

## Estructura

```
src/
├── index.ts                  # app Express, middlewares, montaje de rutas
├── config/
│   ├── firebase.ts           # init del Admin SDK (Auth + Firestore)
│   └── swagger.ts            # definición OpenAPI 3.0
├── middlewares/
│   ├── authMiddleware.ts     # verifyToken (Firebase ID token)
│   └── errorHandler.ts       # manejo de errores transversal
├── routes/
│   ├── userRoutes.ts         # perfiles (anotados con @openapi)
│   └── roomRoutes.ts         # salas (anotados con @openapi)
└── types/index.ts
firestore.rules               # reglas de seguridad de Firestore
```
