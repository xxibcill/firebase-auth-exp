// app/(protected)/dashboard/page.tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center space-x-4 mb-6">
            {user?.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome, {user?.displayName || 'User'}!
              </h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="p-6 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                User ID
              </h3>
              <p className="text-blue-700 font-mono text-sm break-all">
                {user?.uid}
              </p>
            </div>

            <div className="p-6 bg-green-50 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Email Verified
              </h3>
              <p className="text-green-700">
                {user?.emailVerified ? 'Yes ✓' : 'No ✗'}
              </p>
            </div>

            <div className="p-6 bg-purple-50 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                Account Created
              </h3>
              <p className="text-purple-700">
                {user?.metadata?.creationTime || 'Unknown'}
              </p>
            </div>

            <div className="p-6 bg-orange-50 rounded-lg">
              <h3 className="text-lg font-semibold text-orange-900 mb-2">
                Last Sign In
              </h3>
              <p className="text-orange-700">
                {user?.metadata?.lastSignInTime || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What's Next?
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Authentication is fully configured</li>
              <li>✓ User session is managed automatically</li>
              <li>✓ Token refresh happens every 10 minutes</li>
              <li>
                → Check the protected API route at{' '}
                <code className="bg-gray-200 px-2 py-1 rounded text-sm">
                  /api/protected
                </code>
              </li>
              <li>
                → Build your own features using{' '}
                <code className="bg-gray-200 px-2 py-1 rounded text-sm">
                  useAuth()
                </code>{' '}
                hook
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
