// types/auth.ts
import type { User, UserCredential } from 'firebase/auth'

export interface AuthUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  emailVerified: boolean
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  signInWithTwitter: () => Promise<void>
  signOut: () => Promise<void>
}

export interface DecodedIdToken {
  uid: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
  iat: number
  exp: number
  aud: string
  iss: string
  sub: string
  auth_time: number
}

export type AuthProvider = 'google' | 'github' | 'twitter'
