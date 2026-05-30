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

export const adminAuth = getAuth()
export const adminDb = getFirestore()
