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
