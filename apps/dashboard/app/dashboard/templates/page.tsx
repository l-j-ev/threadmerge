import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import { TemplatesView, type Template } from './templates-view';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  let templates: Template[] = [];
  let error: string | null = null;
  try {
    templates = await apiFetch<Template[]>('/api/templates');
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-brand-700">Templates</h1>
        <a href="/dashboard" className="text-sm text-brand-600 hover:underline">&larr; Dashboard</a>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          <div className="font-semibold mb-1">Failed to load templates</div>
          <div className="font-mono text-xs">{error}</div>
        </div>
      ) : (
        <TemplatesView templates={templates} />
      )}
    </main>
  );
}
