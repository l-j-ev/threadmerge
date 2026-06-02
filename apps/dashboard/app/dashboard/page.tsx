import { apiFetch } from '@/lib/api';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  let me: any = null;
  let auditCount = 0;
  let templateCount = 0;
  let error: string | null = null;

  try {
    me = await apiFetch<{ user: any; tenant: any }>('/api/auth/me');
    const [audit, templates] = await Promise.all([
      apiFetch<any[]>('/api/audit?limit=200'),
      apiFetch<any[]>('/api/templates'),
    ]);
    auditCount = audit.length;
    templateCount = templates.length;
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="px-6 py-10 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-brand-700 mb-2">Overview</h1>
      {me ? <p className="text-sm text-gray-600 mb-6">Signed in as {me.user?.email}</p> : null}

      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          <div className="font-semibold mb-1">Failed to load</div>
          <div className="font-mono text-xs">{error}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/dashboard/audit" className="p-5 bg-white border border-gray-200 rounded hover:border-brand-300">
            <div className="text-3xl font-semibold text-gray-900 tabular-nums">{auditCount}{auditCount === 200 ? '+' : ''}</div>
            <div className="text-sm text-gray-600 mt-1">Audit entries (recent)</div>
          </Link>
          <Link href="/dashboard/templates" className="p-5 bg-white border border-gray-200 rounded hover:border-brand-300">
            <div className="text-3xl font-semibold text-gray-900 tabular-nums">{templateCount}</div>
            <div className="text-sm text-gray-600 mt-1">Templates</div>
          </Link>
        </div>
      )}
    </main>
  );
}
