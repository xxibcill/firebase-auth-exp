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
