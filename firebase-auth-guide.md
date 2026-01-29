# Firebase Authentication in Next.js 15 App Router: Complete Implementation Guide

Firebase Auth with Next.js 15 requires careful architecture decisions around client vs. server boundaries. The recommended approach uses **firebase v12.8.0** and **firebase-admin v13.6.0** with cookie-based session management. For production apps, the **next-firebase-auth-edge** library provides Edge Runtime support for middleware-based authentication—the most robust pattern for App Router.

## SDK versions and compatibility

| Package                 | Latest Version | Notes                                                 |
| ----------------------- | -------------- | ----------------------------------------------------- |
| firebase                | **12.8.0**     | Client SDK, requires "use client" for auth operations |
| firebase-admin          | **13.6.0**     | Server SDK, Node.js 18+ required                      |
| next-firebase-auth-edge | **1.11.1**     | Edge-compatible, fully supports Next.js 15            |

Firebase Auth methods like `signInWithPopup` and `onAuthStateChanged` only work in Client Components due to browser API dependencies. Token verification via Admin SDK works only server-side. This fundamental split drives the entire architecture.

---

## Directory structure for Next.js 15 App Router

```
src/
├── app/
│   ├── layout.tsx                    # Root layout with AuthProvider
│   ├── page.tsx
│   ├── (auth)/                       # Route group for public auth pages
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (protected)/                  # Route group for authenticated pages
│   │   ├── layout.tsx                # Protected layout with auth check
│   │   └── dashboard/page.tsx
│   └── api/
│       ├── login/route.ts
│       └── logout/route.ts
├── components/
│   └── auth/
│       ├── SocialLoginButtons.tsx
│       ├── LoginForm.tsx
│       └── LogoutButton.tsx
├── context/
│   └── AuthContext.tsx
├── lib/
│   └── firebase/
│       ├── config.ts                 # Client SDK initialization
│       ├── admin.ts                  # Admin SDK (server-only)
│       └── auth.ts                   # Auth helper functions
├── types/
│   └── auth.ts
└── utils/
    └── errorMessages.ts
```

---

## Environment variables configuration

Create `.env.local` with these variables:

```bash
# Client-side (NEXT_PUBLIC_ prefix required - bundled into browser JS)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Server-only (NO NEXT_PUBLIC_ prefix - never exposed to browser)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

The private key must be wrapped in quotes to preserve newline characters. Never prefix Admin SDK credentials with `NEXT_PUBLIC_`.

---

## Firebase client SDK initialization

```typescript
// lib/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Singleton pattern prevents multiple initializations during hot reload
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export { app, auth, db, firebaseConfig }
```

---

## Firebase Admin SDK initialization

```typescript
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
```

---

## Social OAuth provider setup

### Google OAuth configuration

**Firebase Console steps:**

1. Navigate to Authentication → Sign-in method → Enable Google
2. Set public-facing name and support email
3. Save (credentials auto-provisioned since Firebase is a Google product)

**Code implementation:**

```typescript
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
```

### GitHub OAuth configuration

**GitHub Developer Settings:**

1. Go to github.com/settings/developers → New OAuth App
2. Set Authorization callback URL: `https://your-project.firebaseapp.com/__/auth/handler`
3. Copy Client ID and generate Client Secret
4. Paste both into Firebase Console → Authentication → GitHub provider

### X/Twitter OAuth configuration

**Twitter Developer Portal:**

1. Create project and app at developer.twitter.com
2. Enable OAuth 1.0a (Firebase uses 1.0a, not 2.0)
3. Set callback URL to Firebase callback URL
4. Copy API Key and API Secret to Firebase Console

**Important:** Twitter OAuth 1.0a returns both `accessToken` AND `secret`. Email access requires enabling "Request email from users" in Twitter Developer Portal settings.

---

## Auth Context provider implementation

```typescript
// context/AuthContext.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { type User } from 'firebase/auth';
import {
  signInWithProvider,
  handleRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChange,
} from '@/lib/firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Handle redirect result on mount
    handleRedirectResult().catch(console.error);

    // Subscribe to auth state changes AND token refresh
    const unsubscribe = onAuthStateChange(async (user) => {
      setUser(user);

      if (user) {
        // Store token in cookie for server-side access
        const token = await user.getIdToken();
        document.cookie = `__session=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; ${
          process.env.NODE_ENV === 'production' ? 'Secure;' : ''
        }`;
      } else {
        // Clear cookie on sign out
        document.cookie = '__session=; path=/; max-age=0';
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Force token refresh every 10 minutes (tokens expire after 1 hour)
  useEffect(() => {
    const interval = setInterval(async () => {
      const currentUser = user;
      if (currentUser) {
        const token = await currentUser.getIdToken(true);
        document.cookie = `__session=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; ${
          process.env.NODE_ENV === 'production' ? 'Secure;' : ''
        }`;
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const signInWithGoogle = async () => {
    await signInWithProvider('google');
  };

  const signInWithGitHub = async () => {
    await signInWithProvider('github');
  };

  const signInWithTwitter = async () => {
    await signInWithProvider('twitter');
  };

  const signOut = async () => {
    await firebaseSignOut();
    document.cookie = '__session=; path=/; max-age=0';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithGitHub,
        signInWithTwitter,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

---

## Root layout with AuthProvider

```typescript
// app/layout.tsx
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

---

## Social login buttons component

```typescript
// components/auth/SocialLoginButtons.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAuthErrorMessage } from '@/utils/errorMessages';

interface SocialLoginButtonsProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function SocialLoginButtons({ onSuccess, onError }: SocialLoginButtonsProps) {
  const { signInWithGoogle, signInWithGitHub, signInWithTwitter } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = async (
    provider: 'google' | 'github' | 'twitter',
    signInFn: () => Promise<void>
  ) => {
    setLoading(provider);
    try {
      await signInFn();
      onSuccess?.();
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User cancelled - don't show error
        return;
      }
      const message = getAuthErrorMessage(error.code);
      onError?.(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => handleSignIn('google', signInWithGoogle)}
        disabled={loading !== null}
        className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'google' ? 'Signing in...' : 'Continue with Google'}
      </button>

      <button
        onClick={() => handleSignIn('github', signInWithGitHub)}
        disabled={loading !== null}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'github' ? 'Signing in...' : 'Continue with GitHub'}
      </button>

      <button
        onClick={() => handleSignIn('twitter', signInWithTwitter)}
        disabled={loading !== null}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading === 'twitter' ? 'Signing in...' : 'Continue with X'}
      </button>
    </div>
  );
}
```

---

## Server-side token verification in API routes

```typescript
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
  })
}
```

---

## Server Actions with token verification

```typescript
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
```

---

## Protected route patterns

### Client-side protection with useAuth hook

```typescript
// components/auth/ProtectedRoute.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      )
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

### Server-side protection in layouts

```typescript
// app/(protected)/layout.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyIdToken } from '@/lib/firebase/admin';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    redirect('/login');
  }

  const decodedToken = await verifyIdToken(sessionCookie);

  if (!decodedToken) {
    redirect('/login');
  }

  return <>{children}</>;
}
```

---

## Middleware-based protection with next-firebase-auth-edge

For production applications, **next-firebase-auth-edge** provides Edge Runtime compatible middleware:

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authMiddleware, redirectToLogin } from 'next-firebase-auth-edge'

const PUBLIC_PATHS = ['/login', '/signup', '/', '/api/public']

export async function middleware(request: NextRequest) {
  return authMiddleware(request, {
    loginPath: '/api/login',
    logoutPath: '/api/logout',
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    cookieName: 'AuthToken',
    cookieSignatureKeys: [process.env.COOKIE_SECRET_CURRENT!, process.env.COOKIE_SECRET_PREVIOUS!],
    cookieSerializeOptions: {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 12 * 60 * 60 * 24, // 12 days
    },
    serviceAccount: {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    },
    handleValidToken: async ({ token, decodedToken }, headers) => {
      // User is authenticated
      if (PUBLIC_PATHS.includes(request.nextUrl.pathname)) {
        // Optionally redirect authenticated users away from login
        if (request.nextUrl.pathname === '/login') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
      return NextResponse.next({ request: { headers } })
    },
    handleInvalidToken: async (reason) => {
      return redirectToLogin(request, {
        path: '/login',
        publicPaths: PUBLIC_PATHS,
      })
    },
    handleError: async (error) => {
      console.error('Auth middleware error:', error)
      return redirectToLogin(request, {
        path: '/login',
        publicPaths: PUBLIC_PATHS,
      })
    },
  })
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/api/((?!public).)*', '/login'],
}
```

**Note:** Standard Firebase Admin SDK does **not** work in Edge Runtime due to Node.js crypto dependencies. Use next-firebase-auth-edge for middleware-based auth, or verify tokens in layouts/API routes instead.

---

## Token refresh mechanisms

Firebase ID tokens expire after **1 hour**. The SDK handles refresh automatically, but for cookie-based SSR you need to sync refreshed tokens:

```typescript
// In AuthContext.tsx - already included above
// Key patterns:

// 1. Use onIdTokenChanged (not onAuthStateChanged) to catch refreshes
const unsubscribe = onIdTokenChanged(auth, async (user) => {
  if (user) {
    const token = await user.getIdToken()
    // Update cookie with fresh token
  }
})

// 2. Proactive refresh every 10 minutes
useEffect(() => {
  const interval = setInterval(
    async () => {
      if (user) {
        await user.getIdToken(true) // Force refresh
      }
    },
    10 * 60 * 1000,
  )
  return () => clearInterval(interval)
}, [user])
```

---

## Error handling utilities

```typescript
// utils/errorMessages.ts
const firebaseErrorMessages: Record<string, string> = {
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters long.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/popup-blocked': 'Please allow popups to sign in.',
  'auth/popup-closed-by-user': 'Sign-in cancelled.',
  'auth/account-exists-with-different-credential':
    'An account exists with this email using a different sign-in method.',
  'auth/id-token-expired': 'Your session has expired. Please sign in again.',
  'auth/id-token-revoked': 'Your session was revoked. Please sign in again.',
}

export function getAuthErrorMessage(errorCode: string): string {
  return firebaseErrorMessages[errorCode] || 'An unexpected error occurred. Please try again.'
}
```

---

## TypeScript type definitions

```typescript
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
```

---

## Logout implementation

```typescript
// components/auth/LogoutButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function LogoutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      // Clear any server-side session
      await fetch('/api/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? 'Signing out...' : 'Sign Out'}
    </button>
  );
}
```

```typescript
// app/api/logout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('__session')

  return NextResponse.json({ success: true })
}
```

---

## Third-party library recommendations

| Library                     | Maintenance | Next.js 15 | App Router  | Edge Runtime | Recommendation      |
| --------------------------- | ----------- | ---------- | ----------- | ------------ | ------------------- |
| **next-firebase-auth-edge** | ✅ Active   | ✅ Yes     | ✅ Yes      | ✅ Yes       | **Production apps** |
| react-firebase-hooks        | ⚠️ Moderate | ✅ Yes     | Client only | N/A          | Client-side SPAs    |
| next-firebase-auth          | ⚠️ Limited  | ❌ Issues  | ❌ No       | ❌ No        | Legacy Pages Router |

**next-firebase-auth-edge** is the recommended choice for Next.js 15 with App Router. It supports middleware-based auth, Edge Runtime, and handles token refresh automatically.

---

## Common pitfalls to avoid

**Firebase re-initialization during hot reload:**

```typescript
// Always check before initializing
const app = getApps().length > 0 ? getApp() : initializeApp(config)
```

**SSR hydration mismatches:**

```typescript
// Wait for client-side mount before rendering auth-dependent UI
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <LoadingSkeleton />;
```

**Memory leaks from auth listeners:**

```typescript
// Always return cleanup function
useEffect(() => {
  const unsubscribe = onIdTokenChanged(auth, callback)
  return () => unsubscribe() // Critical!
}, [])
```

**OAuth popups blocked on mobile:** Use `signInWithRedirect` for mobile devices instead of `signInWithPopup`.

**Third-party cookie issues with redirects:** Since June 2024, browsers blocking third-party cookies require either using the default `.firebaseapp.com` domain or setting up a proxy on your custom domain.

---

## Security checklist

- ✅ Never prefix Admin SDK credentials with `NEXT_PUBLIC_`
- ✅ Use `httpOnly: true` for session cookies
- ✅ Set `secure: true` in production
- ✅ Use `sameSite: 'lax'` or `'strict'` for CSRF protection
- ✅ Implement token refresh every 10 minutes
- ✅ Verify tokens on every protected API request
- ✅ Add your domains to Firebase Console authorized domains list
- ✅ Use the `server-only` package to prevent Admin SDK client imports

This implementation provides a production-ready Firebase Authentication system for Next.js 15 App Router with proper separation of client and server concerns, automatic token refresh, and comprehensive error handling.
