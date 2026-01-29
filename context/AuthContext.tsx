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
