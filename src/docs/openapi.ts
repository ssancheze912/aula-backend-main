const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'aula API',
    version: '1.0.0',
    description:
      'API REST del backend principal de **aula**. Autenticación vía Firebase Identity Toolkit (JWT) y gestión de perfiles en Firestore.\n\n' +
      '## Autenticación\n' +
      'Los endpoints protegidos requieren header `Authorization: Bearer <token>`, donde `token` es el Firebase ID token devuelto en login/registro.\n\n' +
      '## Errores\n' +
      'Las respuestas de error usan `{ error: string, code?: string }`. Los códigos `code` provienen de Firebase Auth cuando aplica.',
  },
  tags: [
    { name: 'Health', description: 'Estado del servicio' },
    { name: 'Auth', description: 'Registro, login y sesión' },
    { name: 'Users', description: 'Perfiles de usuario' },
    { name: 'Docs', description: 'Documentación OpenAPI' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Firebase ID token obtenido en `/api/auth/register`, `/login` o `/google`',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Mensaje de error legible',
            example: 'Credenciales inválidas',
          },
          code: {
            type: 'string',
            description: 'Código de error de Firebase Auth (solo en endpoints de autenticación)',
            example: 'INVALID_LOGIN_CREDENTIALS',
          },
        },
        required: ['error'],
      },
      AuthUser: {
        type: 'object',
        properties: {
          uid: { type: 'string', example: 'kR3abc123xyz' },
          email: { type: 'string', format: 'email', example: 'sofia@universidad.edu' },
          displayName: { type: 'string', nullable: true, example: 'Sofía Martínez' },
          photoUrl: {
            type: 'string',
            nullable: true,
            example: 'https://lh3.googleusercontent.com/a/example',
          },
        },
        required: ['uid', 'email', 'displayName', 'photoUrl'],
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            description: 'Firebase ID token (JWT). Usar en header Authorization.',
            example: 'eyJhbGciOiJSUzI1NiIs...',
          },
          refreshToken: {
            type: 'string',
            description: 'Token de refresco de Firebase',
            example: 'AMf-vBz...',
          },
          user: { $ref: '#/components/schemas/AuthUser' },
        },
        required: ['token', 'refreshToken', 'user'],
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'sofia@universidad.edu' },
          password: {
            type: 'string',
            format: 'password',
            minLength: 8,
            description: 'Mínimo 8 caracteres (validado también por Firebase)',
            example: 'MiClave123',
          },
        },
        required: ['email', 'password'],
      },
      LoginRequest: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email', example: 'sofia@universidad.edu' },
          password: { type: 'string', format: 'password', example: 'MiClave123' },
        },
        required: ['email', 'password'],
      },
      GoogleLoginRequest: {
        type: 'object',
        properties: {
          idToken: {
            type: 'string',
            description: 'Google ID token (credential JWT) obtenido del flujo OAuth en el frontend',
            example: 'eyJhbGciOiJSUzI1NiIs...',
          },
        },
        required: ['idToken'],
      },
      SessionResponse: {
        type: 'object',
        description:
          'Sesión del usuario autenticado. `profile` es `null` si aún no completó el registro o si Firestore no está disponible.',
        properties: {
          uid: { type: 'string', example: 'kR3abc123xyz' },
          email: { type: 'string', nullable: true, format: 'email', example: 'sofia@universidad.edu' },
          displayName: { type: 'string', nullable: true, example: 'Sofía Martínez' },
          photoUrl: { type: 'string', nullable: true, example: null },
          profile: { $ref: '#/components/schemas/UserProfile', nullable: true },
        },
        required: ['uid', 'email', 'displayName', 'photoUrl', 'profile'],
      },
      UserProfile: {
        type: 'object',
        properties: {
          uid: { type: 'string', example: 'kR3abc123xyz' },
          firstName: { type: 'string', example: 'Sofía' },
          lastName: { type: 'string', example: 'Martínez' },
          username: { type: 'string', example: 'sofia_m' },
          email: { type: 'string', format: 'email', example: 'sofia@universidad.edu' },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://api.dicebear.com/7.x/initials/svg?seed=Sof%C3%ADa',
          },
          provider: { type: 'string', enum: ['email', 'google'], example: 'email' },
        },
        required: ['uid', 'firstName', 'lastName', 'username', 'email', 'avatarUrl', 'provider'],
      },
      CreateProfileRequest: {
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            description: 'Opcional. Puede ser vacío para usuarios de Google sin displayName.',
            example: 'Sofía',
          },
          lastName: {
            type: 'string',
            description: 'Opcional. Puede ser vacío para usuarios de Google.',
            example: 'Martínez',
          },
          username: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_]{3,20}$',
            example: 'sofia_m',
          },
          email: { type: 'string', format: 'email', example: 'sofia@universidad.edu' },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            description: 'Opcional. Si se omite, se genera con Dicebear.',
            example: 'https://api.dicebear.com/7.x/initials/svg?seed=Sof%C3%ADa',
          },
          provider: { type: 'string', enum: ['email', 'google'], example: 'email' },
        },
        required: ['username', 'email', 'provider'],
      },
      UpdateProfileRequest: {
        type: 'object',
        description: 'Al menos un campo es requerido. `email` y `provider` no son editables.',
        properties: {
          firstName: { type: 'string', example: 'Sofía' },
          lastName: { type: 'string', example: 'Martínez' },
          username: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_]{3,20}$',
            description: 'Si cambia, se actualiza la colección `usernames`',
            example: 'sofia_martinez',
          },
          avatarUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://api.dicebear.com/7.x/initials/svg?seed=Sof%C3%ADa',
          },
        },
        minProperties: 1,
      },
      UsernameAvailableResponse: {
        type: 'object',
        properties: {
          available: {
            type: 'boolean',
            description: 'true si el username está libre',
            example: true,
          },
        },
        required: ['available'],
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok'], example: 'ok' },
          service: { type: 'string', example: 'backend-main' },
        },
        required: ['status', 'service'],
      },
    },
    responses: {
      BadRequest: {
        description: 'Solicitud inválida o campos faltantes',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Email y contraseña son requeridos' },
          },
        },
      },
      Unauthorized: {
        description: 'Token ausente, inválido o credenciales incorrectas',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            examples: {
              noToken: {
                summary: 'Token no enviado',
                value: { error: 'Token no proporcionado' },
              },
              invalidToken: {
                summary: 'Token inválido o expirado',
                value: { error: 'Token inválido o expirado' },
              },
              badCredentials: {
                summary: 'Login fallido',
                value: { error: 'Credenciales inválidas', code: 'INVALID_LOGIN_CREDENTIALS' },
              },
            },
          },
        },
      },
      NotFound: {
        description: 'Recurso no encontrado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Perfil no encontrado' },
          },
        },
      },
      Conflict: {
        description: 'Conflicto con el estado actual del recurso',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            examples: {
              emailExists: {
                summary: 'Email ya registrado',
                value: { error: 'Este correo ya está registrado', code: 'EMAIL_EXISTS' },
              },
              profileExists: {
                summary: 'Perfil ya creado',
                value: { error: 'El usuario ya tiene un perfil' },
              },
              usernameTaken: {
                summary: 'Username en uso',
                value: { error: 'Username ya está en uso' },
              },
            },
          },
        },
      },
      InternalError: {
        description: 'Error interno del servidor',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: 'Error al iniciar sesión' },
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Verifica que el servicio esté en ejecución.',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Servicio operativo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
                example: { status: 'ok', service: 'backend-main' },
              },
            },
          },
        },
      },
    },
    '/api/docs/openapi.json': {
      get: {
        tags: ['Docs'],
        summary: 'Spec OpenAPI en JSON',
        description: 'Devuelve la especificación OpenAPI 3.0 completa de esta API.',
        operationId: 'getOpenApiSpec',
        responses: {
          '200': {
            description: 'Spec OpenAPI',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar cuenta con email',
        description: 'Crea un usuario en Firebase Auth con email y contraseña. Devuelve tokens JWT.',
        operationId: 'registerWithEmail',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              example: { email: 'sofia@universidad.edu', password: 'MiClave123' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Cuenta creada exitosamente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '400': {
            description: 'Datos inválidos o rechazados por Firebase',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  missingFields: {
                    value: { error: 'Email y contraseña son requeridos' },
                  },
                  weakPassword: {
                    value: { error: 'La contraseña es muy débil', code: 'WEAK_PASSWORD' },
                  },
                  invalidEmail: {
                    value: { error: 'Formato de correo inválido', code: 'INVALID_EMAIL' },
                  },
                  authNotConfigured: {
                    value: {
                      error:
                        'Firebase Authentication no está habilitado o Email/Password no está activo en la consola',
                      code: 'CONFIGURATION_NOT_FOUND',
                    },
                  },
                },
              },
            },
          },
          '409': {
            description: 'El email ya está registrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Este correo ya está registrado', code: 'EMAIL_EXISTS' },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión con email',
        description: 'Autentica con email y contraseña. Devuelve tokens JWT.',
        operationId: 'loginWithEmail',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: { email: 'sofia@universidad.edu', password: 'MiClave123' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sesión iniciada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': {
            description: 'Credenciales inválidas o cuenta deshabilitada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  invalidCredentials: {
                    value: { error: 'Credenciales inválidas', code: 'INVALID_LOGIN_CREDENTIALS' },
                  },
                  userDisabled: {
                    value: { error: 'Esta cuenta fue deshabilitada', code: 'USER_DISABLED' },
                  },
                  tooManyAttempts: {
                    value: {
                      error: 'Demasiados intentos. Intenta más tarde',
                      code: 'TOO_MANY_ATTEMPTS_TRY_LATER',
                    },
                  },
                },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/api/auth/google': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión con Google',
        description:
          'Recibe el Google ID token (credential JWT del frontend) y devuelve tokens de Firebase vía signInWithIdp.',
        operationId: 'loginWithGoogle',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/GoogleLoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sesión iniciada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          '400': {
            description: 'Token de Google faltante o inválido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Token de Google requerido' },
              },
            },
          },
          '401': {
            description: 'Google token rechazado por Firebase',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Error de autenticación', code: 'INVALID_IDP_RESPONSE' },
              },
            },
          },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Obtener sesión actual',
        description:
          'Verifica el JWT y devuelve datos del usuario. `profile` es `null` si no existe o si Firestore no responde.',
        operationId: 'getCurrentSession',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Sesión válida',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SessionResponse' },
                examples: {
                  withProfile: {
                    summary: 'Usuario con perfil completo',
                    value: {
                      uid: 'kR3abc123xyz',
                      email: 'sofia@universidad.edu',
                      displayName: 'Sofía Martínez',
                      photoUrl: null,
                      profile: {
                        uid: 'kR3abc123xyz',
                        firstName: 'Sofía',
                        lastName: 'Martínez',
                        username: 'sofia_m',
                        email: 'sofia@universidad.edu',
                        avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Sof%C3%ADa',
                        provider: 'email',
                      },
                    },
                  },
                  withoutProfile: {
                    summary: 'Usuario sin perfil (p. ej. Google recién autenticado)',
                    value: {
                      uid: 'kR3abc123xyz',
                      email: 'sofia@gmail.com',
                      displayName: 'Sofía Martínez',
                      photoUrl: 'https://lh3.googleusercontent.com/a/example',
                      profile: null,
                    },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/users/username/{username}/available': {
      get: {
        tags: ['Users'],
        summary: 'Verificar disponibilidad de username',
        description: 'Endpoint público. Valida formato (3–20 chars, alfanumérico + `_`) y consulta Firestore.',
        operationId: 'checkUsernameAvailable',
        parameters: [
          {
            name: 'username',
            in: 'path',
            required: true,
            description: 'Username a verificar (case-insensitive en backend)',
            schema: { type: 'string', pattern: '^[a-zA-Z0-9_]{3,20}$' },
            example: 'sofia_m',
          },
        ],
        responses: {
          '200': {
            description: 'Resultado de la verificación',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UsernameAvailableResponse' },
                examples: {
                  available: { value: { available: true } },
                  taken: { value: { available: false } },
                },
              },
            },
          },
          '400': {
            description: 'Formato de username inválido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Username inválido' },
              },
            },
          },
          '500': {
            description: 'Error al consultar Firestore',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Error al verificar el username' },
              },
            },
          },
        },
      },
    },
    '/api/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Obtener perfil del usuario autenticado',
        operationId: 'getUserProfile',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Perfil encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfile' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': {
            description: 'Error al leer Firestore',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Error al obtener el perfil' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Crear perfil de usuario',
        description:
          'Crea el documento en Firestore (`users/{uid}` + `usernames/{username}`). Requiere autenticación previa.',
        operationId: 'createUserProfile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProfileRequest' },
              example: {
                firstName: 'Sofía',
                lastName: 'Martínez',
                username: 'sofia_m',
                email: 'sofia@universidad.edu',
                provider: 'email',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Perfil creado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfile' },
              },
            },
          },
          '400': {
            description: 'Datos inválidos o campos faltantes',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  missingFields: {
                    value: { error: 'Faltan campos requeridos' },
                  },
                  invalidUsername: {
                    value: { error: 'Username inválido' },
                  },
                  invalidProvider: {
                    value: { error: 'Provider inválido' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': { $ref: '#/components/responses/Conflict' },
          '500': {
            description: 'Error al escribir en Firestore',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Error al crear el perfil' },
              },
            },
          },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Actualizar perfil del usuario autenticado',
        description:
          'Actualiza campos del perfil en Firestore. Si cambia `username`, libera el anterior y reserva el nuevo.',
        operationId: 'updateUserProfile',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileRequest' },
              example: { firstName: 'Sofía', lastName: 'Martínez López' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Perfil actualizado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserProfile' },
              },
            },
          },
          '400': {
            description: 'Body vacío o username inválido',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                examples: {
                  emptyBody: {
                    value: { error: 'Debe enviar al menos un campo para actualizar' },
                  },
                  invalidUsername: {
                    value: { error: 'Username inválido' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': {
            description: 'Username ya en uso por otro usuario',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Username ya está en uso' },
              },
            },
          },
          '500': {
            description: 'Error al escribir en Firestore',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Error al actualizar el perfil' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Eliminar perfil del usuario autenticado',
        description:
          'Elimina `users/{uid}` y `usernames/{username}`. No elimina la cuenta de Firebase Auth.',
        operationId: 'deleteUserProfile',
        security: [{ bearerAuth: [] }],
        responses: {
          '204': { description: 'Perfil eliminado' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '500': {
            description: 'Error al eliminar en Firestore',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { error: 'Error al eliminar el perfil' },
              },
            },
          },
        },
      },
    },
  },
} as const

export type OpenApiSpec = typeof openApiSpec

export function buildOpenApiSpec(serverUrl: string): OpenApiSpec & {
  servers: { url: string; description: string }[]
} {
  return {
    ...openApiSpec,
    servers: [{ url: serverUrl, description: 'Servidor actual' }],
  }
}

export default openApiSpec
