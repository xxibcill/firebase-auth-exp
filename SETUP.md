# Firebase Authentication Setup Guide

Complete Firebase Authentication system with Google, GitHub, and Twitter OAuth providers has been implemented! 🎉

## ✅ What's Been Installed

All dependencies are ready:
- `firebase@12.8.0` - Client SDK
- `firebase-admin@13.6.0` - Server SDK
- `server-only` - Prevents client-side Admin SDK imports

## 📁 Files Created

### Core Firebase Configuration
- ✅ `lib/firebase/config.ts` - Client SDK initialization
- ✅ `lib/firebase/admin.ts` - Admin SDK (server-only)
- ✅ `lib/firebase/auth.ts` - OAuth helper functions

### Auth Context & State Management
- ✅ `context/AuthContext.tsx` - Auth provider with automatic token refresh

### UI Components
- ✅ `components/auth/SocialLoginButtons.tsx` - OAuth buttons
- ✅ `components/auth/LogoutButton.tsx` - Logout component
- ✅ `components/auth/ProtectedRoute.tsx` - Client-side route protection

### Pages & Routes
- ✅ `app/(auth)/login/page.tsx` - Login page
- ✅ `app/(protected)/layout.tsx` - Server-side auth check
- ✅ `app/(protected)/dashboard/page.tsx` - Protected dashboard example

### API Routes
- ✅ `app/api/logout/route.ts` - Clear session endpoint
- ✅ `app/api/protected/route.ts` - Protected API example

### Utilities
- ✅ `types/auth.ts` - TypeScript type definitions
- ✅ `utils/errorMessages.ts` - Error handling
- ✅ `actions/auth-actions.ts` - Server actions

### Configuration
- ✅ `.env.local` - Environment variables template (needs your credentials!)
- ✅ `app/layout.tsx` - Updated with AuthProvider

## 🔧 Next Steps: Configure Firebase

### Step 1: Get Firebase Credentials

#### A. Client SDK Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project or create a new one
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll to "Your apps" section
5. If no web app exists, click "Add app" → Web (</>) icon
6. Register your app and copy the config object

You'll get values like:
```javascript
apiKey: "AIza..."
authDomain: "your-project.firebaseapp.com"
projectId: "your-project-id"
// etc.
```

#### B. Admin SDK Credentials

1. Still in **Project Settings** → **Service accounts** tab
2. Click **"Generate new private key"**
3. Download the JSON file
4. Keep it secure! This file contains sensitive credentials

### Step 2: Update `.env.local`

Open `.env.local` and replace the placeholder values:

```bash
# Client SDK (from Firebase Console → Project Settings → General)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...your_actual_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Admin SDK (from the downloaded service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...your_actual_key...\n-----END PRIVATE KEY-----\n"
```

**Important**: Keep the private key wrapped in quotes and include the `\n` newline characters!

### Step 3: Enable Authentication Providers

#### Google OAuth (Recommended - Easiest!)

1. Firebase Console → **Authentication** → **Sign-in method**
2. Click **Google**
3. Toggle **Enable**
4. Set project public-facing name and support email
5. Click **Save**

That's it! Google OAuth is now ready. ✅

#### GitHub OAuth (Optional)

1. Go to [GitHub Settings → Developer settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in:
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000` (for dev)
   - **Authorization callback URL**: `https://YOUR-PROJECT.firebaseapp.com/__/auth/handler`
     - Get YOUR-PROJECT from Firebase Console
4. Click **Register application**
5. Copy the **Client ID**
6. Click **Generate a new client secret** and copy it

**Back in Firebase Console:**
1. Authentication → Sign-in method → **GitHub**
2. Toggle **Enable**
3. Paste **Client ID** and **Client Secret**
4. Click **Save**

#### Twitter/X OAuth (Optional)

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a project and app (need Twitter Developer account)
3. In app settings → **User authentication settings**
4. Enable **OAuth 1.0a** (important: Firebase uses 1.0a, not 2.0!)
5. Set callback URL: `https://YOUR-PROJECT.firebaseapp.com/__/auth/handler`
6. Copy **API Key** and **API Secret**

**Back in Firebase Console:**
1. Authentication → Sign-in method → **Twitter**
2. Toggle **Enable**
3. Paste **API Key** and **API Secret Key**
4. Click **Save**

### Step 4: Add Authorized Domains

In Firebase Console → Authentication → **Settings** → **Authorized domains**:

Add:
- `localhost` (for development) - usually already there
- Your production domain when you deploy (e.g., `myapp.vercel.app`)

## 🚀 Run the App

```bash
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login)

## ✨ Test the Authentication Flow

1. **Visit** `http://localhost:3000/login`
2. **Click** "Continue with Google" (or your enabled provider)
3. **Sign in** with your account
4. **You should be redirected** to `/dashboard`
5. **Check** that your user info displays correctly
6. **Open DevTools** → Application → Cookies
   - You should see `__session` cookie with a token
7. **Test protected API**: Visit `http://localhost:3000/api/protected`
   - Should return your user info
8. **Click "Sign Out"** → Should redirect to `/login`
9. **Try accessing** `/dashboard` while signed out → Should redirect to `/login`

## 🎯 Quick Reference

### Available Routes

- `/login` - Login page with social auth buttons
- `/dashboard` - Protected dashboard (requires authentication)
- `/api/protected` - Example protected API endpoint
- `/api/logout` - Logout endpoint

### Using the Auth Context

```typescript
'use client';
import { useAuth } from '@/context/AuthContext';

function MyComponent() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  if (loading) return <div>Loading...</div>;

  return user ? (
    <button onClick={signOut}>Sign Out</button>
  ) : (
    <button onClick={signInWithGoogle}>Sign In</button>
  );
}
```

### Project Structure

```
firebase-auth/
├── lib/firebase/          # Firebase configuration
├── context/              # Auth context provider
├── components/auth/      # Auth UI components
├── app/(auth)/          # Public auth pages
├── app/(protected)/     # Protected pages
├── app/api/            # API routes
└── .env.local          # Your Firebase credentials ⚠️
```

## 🐛 Troubleshooting

### Build fails with "Invalid PEM formatted message"
✅ **Solution**: Update `.env.local` with real Firebase credentials

### "Missing authentication token" in protected routes
✅ **Solution**:
- Make sure you're signed in
- Check `__session` cookie exists in DevTools
- Try signing out and back in

### OAuth popup blocked
✅ **Solution**: Allow popups in browser or use redirect flow (automatic fallback)

### "This operation is not allowed"
✅ **Solution**: Enable the auth provider in Firebase Console

### Third-party cookies blocked
✅ **Solution**: Use the default `.firebaseapp.com` domain or set up a proxy

## 📚 Additional Resources

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [firebase-auth-guide.md](firebase-auth-guide.md) - Complete implementation reference
- [Next.js App Router](https://nextjs.org/docs/app)

---

**Need help?** Check the [firebase-auth-guide.md](firebase-auth-guide.md) for detailed explanations of every component!
