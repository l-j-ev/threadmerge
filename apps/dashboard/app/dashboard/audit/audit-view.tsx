'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface AuditRow {
  id: string;
  timestamp: string;
  mode: string;
  threadASubject: string | null;
  threadBSubject: string | null;
  sourceThreadId: string | null;
  note: string | null;
  includedMessageCount: number;
  excludedMessageCount: number;
  redactionCount: number;
  recipientCount: number;
  internalRecipientCount: number;
  externalRecipientCount: number;
  user?: { email: string | null; displayName: string | null } | null;
}

export function AuditView({
  rows,
  initial,
}: {
  rows: AuditRow[];
  initial: { from: string; to: string; limit: string };
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [limit, setLimit] = useState(initial.limit);
  const [mode, setMode] = useState<'all' | 'merge' | 'inject'>('all');
  const [q, setQ] = useState('');

  // Date range + limit are honoured server-side, so push them to the URL to refetch.
  function applyServerFilters() {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to) p.set('to', `${to}T23:59:59.999Z`); // inclusive end-of-day
    p.set('limit', limit);
    router.push(`/dashboard/audit?${p.toString()}`);
  }

  // Mode + free-text are filtered client-side over the loaded set.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (mode !== 'all' && r.mode !== mode) return false;
      if (!needle) return true;
      const hay = [r.threadASubject, r.threadBSubject, r.note, r.user?.email, r.user?.displayName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, mode, q]);

  function exportCsv() {
    const cols = [
      'id', 'timestamp', 'mode', 'user', 'threadASubject', 'threadBSubject', 'note',
      'includedMessageCount', 'excludedMessageCount', 'redactionCount',
      'recipientCount', 'internalRecipientCount', 'externalRecipientCount',
    ];
    const esc = (v: unknown) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [cols.join(',')];
    for (const r of filtered) {
      lines.push([
        r.id, r.timestamp, r.mode, r.user?.email ?? '',
        r.threadASubject ?? '', r.threadBSubject ?? '', r.note ?? '',
        r.includedMessageCount, r.excludedMessageCount, r.redactionCount,
        r.recipientCount, r.internalRecipientCount, r.externalRecipientCount,
      ].map(esc).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nootro-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });

  const subjectOf = (r: AuditRow) =>
    r.mode === 'inject'
      ? r.threadASubject || r.sourceThreadId || '\u2014'
      : [r.threadASubject, r.threadBSubject].filter(Boolean).join('  +  ') || '\u2014';

  const limitReached = rows.length >= Number(limit);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4 p-4 bg-white border border-gray-200 rounded">
        <label className="text-xs text-gray-600">From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="block mt-1 px-2 py-1 border border-gray-300 rounded text-sm" />
        </label>
        <label className="text-xs text-gray-600">To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="block mt-1 px-2 py-1 border border-gray-300 rounded text-sm" />
        </label>
        <label className="text-xs text-gray-600">Limit
          <select value={limit} onChange={(e) => setLimit(e.target.value)}
            className="block mt-1 px-2 py-1 border border-gray-300 rounded text-sm">
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </label>
        <button onClick={applyServerFilters}
          className="px-3 py-1.5 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600">
          Apply
        </button>

        <div className="ml-auto flex items-end gap-3">
          <label className="text-xs text-gray-600">Mode
            <select value={mode} onChange={(e) => setMode(e.target.value as 'all' | 'merge' | 'inject')}
              className="block mt-1 px-2 py-1 border border-gray-300 rounded text-sm">
              <option value="all">All</option>
              <option value="merge">Merge</option>
              <option value="inject">Inject</option>
            </select>
          </label>
          <label className="text-xs text-gray-600">Search
            <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="subject, note, user"
              className="block mt-1 px-2 py-1 border border-gray-300 rounded text-sm" />
          </label>
          <button onClick={exportCsv}
            className="px-3 py-1.5 text-sm font-medium text-brand-700 border border-brand-300 rounded hover:bg-brand-50">
            Export CSV
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        Showing {filtered.length} of {rows.length} loaded {rows.length === 1 ? 'entry' : 'entries'}
        {limitReached ? ` \u00b7 limit ${limit} reached, narrow the date range or raise the limit to see more` : ''}
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-3 py-2">When</th>
              <th className="text-left font-medium px-3 py-2">Mode</th>
              <th className="text-left font-medium px-3 py-2">Subject</th>
              <th className="text-left font-medium px-3 py-2">User</th>
              <th className="text-right font-medium px-3 py-2">Msgs in/ex</th>
              <th className="text-right font-medium px-3 py-2">Redactions</th>
              <th className="text-right font-medium px-3 py-2">Recip int/ext</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No entries match.</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} onClick={() => router.push(`/dashboard/audit/${r.id}`)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <td className="px-3 py-2 whitespace-nowrap text-gray-700">{fmt(r.timestamp)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      r.mode === 'inject' ? 'bg-[rgba(255,176,46,0.12)] text-[#ffb02e] border border-[rgba(255,176,46,0.28)]' : 'bg-[rgba(82,255,82,0.10)] text-[#52ff52] border border-[rgba(82,255,82,0.28)]'
                    }`}>{r.mode}</span>
                  </td>
                  <td className="px-3 py-2 max-w-xs truncate text-gray-800" title={subjectOf(r)}>{subjectOf(r)}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">{r.user?.email ?? '\u2014'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">{r.includedMessageCount}/{r.excludedMessageCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">{r.redactionCount}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">{r.recipientCount} ({r.internalRecipientCount}/{r.externalRecipientCount})</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
