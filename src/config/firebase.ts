import { initializeApp, applicationDefault, cert, getApps, type AppOptions } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function buildAppOptions(): AppOptions {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (clientEmail && privateKey) {
    return {
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    }
  }

  return {
    credential: applicationDefault(),
    projectId,
  }
}

if (!getApps().length) {
  initializeApp(buildAppOptions())
}

export const adminAuth = getAuth()
export const adminDb = getFirestore()
