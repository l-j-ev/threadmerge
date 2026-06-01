'use client';
import { signIn } from 'next-auth/react';

export function SignInButton() {
  return (
    <button
      onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}
      className="px-5 py-2.5 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600"
    >
      Sign in with Microsoft
    </button>
  );
}
