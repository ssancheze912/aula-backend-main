const IDENTITY_BASE = 'https://identitytoolkit.googleapis.com/v1'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: 'Este correo ya está registrado',
  INVALID_PASSWORD: 'Contraseña incorrecta',
  INVALID_LOGIN_CREDENTIALS: 'Credenciales inválidas',
  USER_DISABLED: 'Esta cuenta fue deshabilitada',
  WEAK_PASSWORD: 'La contraseña es muy débil',
  INVALID_EMAIL: 'Formato de correo inválido',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Demasiados intentos. Intenta más tarde',
  OPERATION_NOT_ALLOWED: 'Método de autenticación no habilitado',
  CONFIGURATION_NOT_FOUND:
    'Firebase Authentication no está habilitado o Email/Password no está activo en la consola',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'Sesión expirada. Inicia sesión de nuevo',
}

export interface AuthTokens {
  idToken: string
  refreshToken: string
  localId: string
  email: string
  displayName?: string
  photoUrl?: string
}

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

function getWebApiKey(): string {
  const key = process.env.FIREBASE_WEB_API_KEY
  if (!key) {
    throw new Error('FIREBASE_WEB_API_KEY no configurada')
  }
  return key
}

async function identityRequest<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${IDENTITY_BASE}/accounts:${endpoint}?key=${getWebApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json()) as {
    error?: { message?: string }
  } & T

  if (!res.ok) {
    const code = data.error?.message ?? 'UNKNOWN'
    throw new AuthError(code, AUTH_ERROR_MESSAGES[code] ?? 'Error de autenticación')
  }

  return data
}

export async function registerWithEmail(email: string, password: string): Promise<AuthTokens> {
  const data = await identityRequest<{
    idToken: string
    refreshToken: string
    localId: string
    email: string
  }>('signUp', { email, password, returnSecureToken: true })

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
    email: data.email,
  }
}

export async function loginWithEmail(email: string, password: string): Promise<AuthTokens> {
  const data = await identityRequest<{
    idToken: string
    refreshToken: string
    localId: string
    email: string
    displayName?: string
    photoUrl?: string
  }>('signInWithPassword', { email, password, returnSecureToken: true })

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
  }
}

export async function loginWithGoogle(idToken: string): Promise<AuthTokens> {
  const requestUri = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  const data = await identityRequest<{
    idToken: string
    refreshToken: string
    localId: string
    email: string
    displayName?: string
    photoUrl?: string
  }>('signInWithIdp', {
    postBody: `id_token=${encodeURIComponent(idToken)}&providerId=google.com`,
    requestUri,
    returnIdpCredential: true,
    returnSecureToken: true,
  })

  return {
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    localId: data.localId,
    email: data.email,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
  }
}

export function toAuthResponse(tokens: AuthTokens) {
  return {
    token: tokens.idToken,
    refreshToken: tokens.refreshToken,
    user: {
      uid: tokens.localId,
      email: tokens.email,
      displayName: tokens.displayName ?? null,
      photoUrl: tokens.photoUrl ?? null,
    },
  }
}
