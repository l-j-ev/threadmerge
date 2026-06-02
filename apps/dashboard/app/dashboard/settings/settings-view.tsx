'use client';

import { useState, useTransition } from 'react';
import { updateSettings } from './actions';

export interface TenantSettings {
  enforceAuditLogging: boolean;
  allowExternalMerge: boolean;
  defaultRedactions: unknown;
  updatedAt: string;
}

export function SettingsView({ settings }: { settings: TenantSettings }) {
  const [enforceAuditLogging, setEnforce] = useState(settings.enforceAuditLogging);
  const [allowExternalMerge, setAllowExternal] = useState(settings.allowExternalMerge);
  const [rulesText, setRulesText] = useState(
    JSON.stringify(settings.defaultRedactions ?? [], null, 2),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    setFormError(null);
    setSaved(false);
    let rules: unknown;
    try {
      rules = JSON.parse(rulesText || '[]');
    } catch {
      setFormError('Default redactions must be valid JSON.');
      return;
    }
    startTransition(async () => {
      try {
        await updateSettings({ enforceAuditLogging, allowExternalMerge, defaultRedactions: rules });
        setSaved(true);
      } catch (e: any) {
        setFormError(e.message ?? 'Save failed');
      }
    });
  }

  return (
    <div className="p-5 bg-white border border-gray-200 rounded space-y-5">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={enforceAuditLogging} className="mt-0.5"
          onChange={(e) => { setEnforce(e.target.checked); setSaved(false); }} />
        <span>
          <span className="font-medium text-gray-900">Enforce audit logging</span>
          <span className="block text-gray-500 text-xs">Every merge and inject is recorded. Recommended on.</span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={allowExternalMerge} className="mt-0.5"
          onChange={(e) => { setAllowExternal(e.target.checked); setSaved(false); }} />
        <span>
          <span className="font-medium text-gray-900">Allow external merge</span>
          <span className="block text-gray-500 text-xs">Permit sends that include recipients outside your tenant.</span>
        </span>
      </label>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Default redaction rules (JSON)</label>
        <textarea value={rulesText} rows={8} spellCheck={false}
          onChange={(e) => { setRulesText(e.target.value); setSaved(false); }}
          className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono" />
        <p className="text-xs text-gray-500 mt-1">Applied as defaults to new sends. Same shape as a template's rules.</p>
      </div>

      {formError ? <div className="text-sm text-red-700">{formError}</div> : null}
      {saved ? <div className="text-sm text-green-700">Saved.</div> : null}

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={isPending}
          className="px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600 disabled:opacity-50">
          {isPending ? 'Saving\u2026' : 'Save settings'}
        </button>
        <span className="text-xs text-gray-400">Last updated {new Date(settings.updatedAt).toLocaleString('en-GB', { timeZone: 'Europe/London' })}</span>
      </div>
    </div>
  );
}
