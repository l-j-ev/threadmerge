import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { AuditView, type AuditRow } from './audit-view';

export const dynamic = 'force-dynamic';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; limit?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const p = new URLSearchParams();
  if (searchParams.from) p.set('from', searchParams.from);
  if (searchParams.to) p.set('to', searchParams.to);
  p.set('limit', searchParams.limit ?? '50');

  let rows: AuditRow[] = [];
  let error: string | null = null;
  try {
    rows = await apiFetch<AuditRow[]>(`/api/audit?${p.toString()}`);
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-brand-700">Audit log</h1>
        <a href="/dashboard" className="text-sm text-brand-600 hover:underline">&larr; Dashboard</a>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          <div className="font-semibold mb-1">Failed to load audit log</div>
          <div className="font-mono text-xs">{error}</div>
        </div>
      ) : (
        <AuditView
          rows={rows}
          initial={{
            from: searchParams.from ?? '',
            to: searchParams.to ?? '',
            limit: searchParams.limit ?? '50',
          }}
        />
      )}
    </main>
  );
}
