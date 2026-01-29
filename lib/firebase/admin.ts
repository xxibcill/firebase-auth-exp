// lib/firebase/admin.ts
import 'server-only' // Prevents accidental client-side import

import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth, Auth } from 'firebase-admin/auth'

const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  }),
}

function initFirebaseAdmin(): App {
  if (getApps().length === 0) {
    return initializeApp(firebaseAdminConfig)
  }
  return getApps()[0]
}

export const adminApp = initFirebaseAdmin()
export const adminAuth: Auth = getAuth(adminApp)

// Token verification helper
export async function verifyIdToken(idToken: string) {
  try {
    return await adminAuth.verifyIdToken(idToken)
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

// Session cookie creation (valid up to 14 days)
export async function createSessionCookie(idToken: string, expiresIn: number) {
  return adminAuth.createSessionCookie(idToken, { expiresIn })
}

// Session cookie verification
export async function verifySessionCookie(sessionCookie: string, checkRevoked = true) {
  return adminAuth.verifySessionCookie(sessionCookie, checkRevoked)
}
