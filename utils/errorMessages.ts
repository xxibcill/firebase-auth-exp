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
