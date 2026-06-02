import { apiFetch } from '@/lib/api';
import { SettingsView, type TenantSettings } from './settings-view';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  let settings: TenantSettings | null = null;
  let error: string | null = null;
  try {
    settings = await apiFetch<TenantSettings>('/api/settings');
  } catch (e: any) {
    error = e.message;
  }

  return (
    <main className="px-6 py-10 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-brand-700 mb-6">Settings</h1>
      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          <div className="font-semibold mb-1">Failed to load settings</div>
          <div className="font-mono text-xs">{error}</div>
        </div>
      ) : settings ? (
        <SettingsView settings={settings} />
      ) : null}
    </main>
  );
}
