import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  let me: any = null;
  let error: string | null = null;
  try {
    me = await apiFetch<{ user: any; tenant: any }>('/api/auth/me');
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-brand-700 mb-6">Dashboard</h1>

      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          <div className="font-semibold mb-1">Backend call failed</div>
          <div className="font-mono text-xs">{error}</div>
        </div>
      ) : (
        <div className="p-4 bg-white border border-gray-200 rounded text-sm">
          <div className="font-semibold text-gray-900 mb-2">Authenticated end-to-end ✓</div>
          <div className="text-gray-600">Signed in as <span className="font-medium text-gray-900">{me?.user?.email}</span></div>
          <div className="text-gray-600">Tenant: <span className="font-mono text-xs">{me?.tenant?.azureTenantId}</span></div>
        </div>
      )}
    </main>
  );
}
