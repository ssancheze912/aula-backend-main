/**
 * Inicialización del Firebase Admin SDK. Lee las credenciales de la cuenta de
 * servicio desde variables de entorno y expone los clientes de Auth y Firestore
 * usados por toda la API. Las credenciales son obligatorias: si faltan, el
 * arranque falla de forma explícita en lugar de degradarse silenciosamente.
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

if (!getApps().length) {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error(
      'Faltan credenciales de Firebase Admin. Define FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY en las variables de entorno.'
    )
  }

  try {
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        // En las variables de entorno los saltos de línea van escapados como \n
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  } catch (err) {
    throw new Error(
      `No se pudo inicializar Firebase Admin SDK: ${(err as Error).message}`
    )
  }
}

/** Cliente de Firebase Authentication (verificación de ID tokens, gestión de usuarios). */
export const adminAuth = getAuth()
/** Cliente de Firestore para lectura/escritura de perfiles y salas. */
export const adminDb = getFirestore()
