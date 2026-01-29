// app/api/protected/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase/admin'

export async function GET(request: NextRequest) {
  // Extract token from cookie or Authorization header
  const sessionCookie = request.cookies.get('__session')?.value
  const authHeader = request.headers.get('Authorization')

  const token = sessionCookie || authHeader?.split('Bearer ')[1]

  if (!token) {
    return NextResponse.json({ error: 'Missing authentication token' }, { status: 401 })
  }

  const decodedToken = await verifyIdToken(token)

  if (!decodedToken) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  // Token is valid - proceed with protected operation
  return NextResponse.json({
    uid: decodedToken.uid,
    email: decodedToken.email,
    message: 'Authenticated successfully',
    timestamp: new Date().toISOString(),
  })
}
