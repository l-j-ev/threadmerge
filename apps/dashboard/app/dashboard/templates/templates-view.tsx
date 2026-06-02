'use client';

import { useState, useTransition } from 'react';
import { createTemplate, updateTemplate, deleteTemplate, type TemplateInput } from './actions';

export interface Template {
  id: string;
  name: string;
  description: string | null;
  isShared: boolean;
  redactionRules: unknown;
  createdAt: string;
  updatedAt: string;
}

type FormState = { name: string; description: string; isShared: boolean; rulesText: string };
const emptyForm: FormState = { name: '', description: '', isShared: false, rulesText: '[]' };

export function TemplatesView({ templates }: { templates: Template[] }) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setForm(emptyForm);
    setFormError(null);
    setActionError(null);
    setEditingId('new');
  }

  function openEdit(t: Template) {
    setForm({
      name: t.name,
      description: t.description ?? '',
      isShared: t.isShared,
      rulesText: JSON.stringify(t.redactionRules ?? [], null, 2),
    });
    setFormError(null);
    setActionError(null);
    setEditingId(t.id);
  }

  function save() {
    setFormError(null);
    setActionError(null);
    if (!form.name.trim()) {
      setFormError('Name is required.');
      return;
    }
    let rules: unknown;
    try {
      rules = JSON.parse(form.rulesText || '[]');
    } catch {
      setFormError('Redaction rules must be valid JSON.');
      return;
    }
    const input: TemplateInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      isShared: form.isShared,
      redactionRules: rules,
    };
    startTransition(async () => {
      try {
        if (editingId === 'new') await createTemplate(input);
        else if (editingId) await updateTemplate(editingId, input);
        setEditingId(null);
      } catch (e: any) {
        setActionError(e.message ?? 'Save failed');
      }
    });
  }

  function remove(t: Template) {
    if (!confirm(`Delete template "${t.name}"? This cannot be undone.`)) return;
    setActionError(null);
    startTransition(async () => {
      try {
        await deleteTemplate(t.id);
      } catch (e: any) {
        setActionError(e.message ?? 'Delete failed');
      }
    });
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      timeZone: 'Europe/London', year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  const ruleCount = (r: unknown) => (Array.isArray(r) ? r.length : 0);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={openNew} disabled={isPending}
          className="px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600 disabled:opacity-50">
          New template
        </button>
      </div>

      {actionError ? (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm font-mono">{actionError}</div>
      ) : null}

      {editingId ? (
        <div className="mb-6 p-5 bg-white border border-gray-200 rounded">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{editingId === 'new' ? 'New template' : 'Edit template'}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.isShared} onChange={(e) => setForm({ ...form, isShared: e.target.checked })} />
              Shared with tenant
            </label>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Redaction rules (JSON)</label>
              <textarea value={form.rulesText} onChange={(e) => setForm({ ...form, rulesText: e.target.value })}
                rows={8} spellCheck={false}
                className="w-full px-3 py-2 border border-gray-300 rounded text-xs font-mono" />
            </div>
            {formError ? <div className="text-sm text-red-700">{formError}</div> : null}
            <div className="flex gap-2">
              <button onClick={save} disabled={isPending}
                className="px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600 disabled:opacity-50">
                {isPending ? 'Saving\u2026' : 'Save'}
              </button>
              <button onClick={() => setEditingId(null)} disabled={isPending}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto border border-gray-200 rounded bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-2">Name</th>
              <th className="text-left font-medium px-3 py-2">Description</th>
              <th className="text-left font-medium px-3 py-2">Shared</th>
              <th className="text-right font-medium px-3 py-2">Rules</th>
              <th className="text-left font-medium px-3 py-2">Updated</th>
              <th className="text-right font-medium px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No templates yet.</td></tr>
            ) : (
              templates.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-800 font-medium">{t.name}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={t.description ?? ''}>{t.description ?? '\u2014'}</td>
                  <td className="px-3 py-2">{t.isShared
                    ? <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">shared</span>
                    : <span className="text-gray-400 text-xs">private</span>}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">{ruleCount(t.redactionRules)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmt(t.updatedAt)}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(t)} disabled={isPending} className="text-brand-600 hover:underline mr-3">Edit</button>
                    <button onClick={() => remove(t)} disabled={isPending} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
