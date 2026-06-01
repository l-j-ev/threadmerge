import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SignInButton } from './signin-button';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) redirect('/dashboard');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-semibold text-brand-700 mb-3">Nootro</h1>
        <p className="text-lg text-gray-600 mb-8">
          Templates, audit log, and settings. Audit-ready by design.
        </p>
        <SignInButton />
      </div>
    </main>
  );
}
