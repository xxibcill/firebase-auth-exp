// actions/auth-actions.ts
'use server'

import { cookies } from 'next/headers'
import { verifyIdToken } from '@/lib/firebase/admin'

export async function getAuthenticatedUser() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('__session')?.value

  if (!sessionCookie) {
    return { isAuthenticated: false, user: null }
  }

  const decodedToken = await verifyIdToken(sessionCookie)

  if (!decodedToken) {
    return { isAuthenticated: false, user: null }
  }

  return {
    isAuthenticated: true,
    user: {
      uid: decodedToken.uid,
      email: decodedToken.email,
    },
  }
}

export async function protectedServerAction(formData: FormData) {
  const { isAuthenticated, user } = await getAuthenticatedUser()

  if (!isAuthenticated) {
    throw new Error('Unauthorized')
  }

  // Perform protected operation
  const data = formData.get('data')
  // Process data...

  return { success: true, userId: user?.uid }
}
