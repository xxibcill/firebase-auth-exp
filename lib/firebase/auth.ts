// lib/firebase/auth.ts
'use client'

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { auth } from './config'

// Provider configurations
const googleProvider = new GoogleAuthProvider()
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email')
googleProvider.setCustomParameters({ prompt: 'select_account' })

const githubProvider = new GithubAuthProvider()
githubProvider.addScope('user:email')

const twitterProvider = new TwitterAuthProvider()

type AuthProvider = 'google' | 'github' | 'twitter'

const providers = {
  google: {
    provider: googleProvider,
    credentialFromResult: GoogleAuthProvider.credentialFromResult,
    credentialFromError: GoogleAuthProvider.credentialFromError,
  },
  github: {
    provider: githubProvider,
    credentialFromResult: GithubAuthProvider.credentialFromResult,
    credentialFromError: GithubAuthProvider.credentialFromError,
  },
  twitter: {
    provider: twitterProvider,
    credentialFromResult: TwitterAuthProvider.credentialFromResult,
    credentialFromError: TwitterAuthProvider.credentialFromError,
  },
}

// Popup-based sign-in
export async function signInWithProvider(providerName: AuthProvider): Promise<UserCredential> {
  const { provider } = providers[providerName]

  try {
    const result = await signInWithPopup(auth, provider)
    return result
  } catch (error: any) {
    if (error.code === 'auth/popup-blocked') {
      // Fallback to redirect
      signInWithRedirect(auth, provider)
    }
    throw error
  }
}

// Redirect-based sign-in (better for mobile)
export function signInWithProviderRedirect(providerName: AuthProvider): void {
  const { provider } = providers[providerName]
  signInWithRedirect(auth, provider)
}

// Handle redirect result (call on page load)
export async function handleRedirectResult(): Promise<UserCredential | null> {
  try {
    return await getRedirectResult(auth)
  } catch (error) {
    console.error('Redirect result error:', error)
    throw error
  }
}

// Sign out
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth)
}

// Auth state observer
export function onAuthStateChange(callback: (user: User | null) => void) {
  return onIdTokenChanged(auth, callback)
}
