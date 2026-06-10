import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiFetch } from '@/lib/api';

interface CapturedMessage {
  id: string;
  graphMessageId: string;
  conversationId: string | null;
  contentHash: string;
  hashAlgorithm: string;
  capturedAt: string;
  fromAddress: string | null;
  fromDomain: string | null;
  originalSentAt: string | null;
  recipientCount: number | null;
  hadAttachments: boolean;
  attachmentCount: number;
  verifyUrl: string;
}

interface AuditDetail {
  id: string;
  timestamp: string;
  mode: string;
  subject: string;
  note: string | null;
  includedMessageCount: number;
  excludedMessageCount: number;
  redactionCount: number;
  recipientCount: number;
  internalRecipientCount: number;
  externalRecipientCount: number;
  recipientAddresses: unknown;
  user?: { email: string | null; displayName: string | null } | null;
  capturedMessages: CapturedMessage[];
}

function normalizeRecipients(raw: unknown): { address: string; type?: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    if (typeof r === 'string') return { address: r };
    if (r && typeof r === 'object') {
      const o = r as Record<string, unknown>;
      return {
        address: String(o.address ?? o.email ?? o.emailAddress ?? o.smtpAddress ?? JSON.stringify(o)),
        type: o.type ? String(o.type) : o.recipientType ? String(o.recipientType) : undefined,
      };
    }
    return { address: String(r) };
  });
}

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : '\u2014';

const shortHash = (h: string) => (h.length > 28 ? `${h.slice(0, 16)}\u2026${h.slice(-8)}` : h);

export const dynamic = 'force-dynamic';

export default async function AuditDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  let entry: AuditDetail | null = null;
  let error: string | null = null;
  try {
    entry = await apiFetch<AuditDetail>(`/api/audit/${params.id}`);
  } catch (e: any) {
    if (String(e.message).includes('404')) notFound();
    error = e.message;
  }

  const recipients = entry ? normalizeRecipients(entry.recipientAddresses) : [];

  return (
    <main className="min-h-screen px-6 py-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-brand-700">Audit entry</h1>
        <a href="/dashboard/audit" className="text-sm text-brand-600 hover:underline">&larr; Audit log</a>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          <div className="font-semibold mb-1">Failed to load entry</div>
          <div className="font-mono text-xs">{error}</div>
        </div>
      ) : entry ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="p-5 bg-white border border-gray-200 rounded">
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                entry.mode === 'inject' ? 'bg-[rgba(255,176,46,0.12)] text-[#ffb02e] border border-[rgba(255,176,46,0.28)]' : 'bg-[rgba(82,255,82,0.10)] text-[#52ff52] border border-[rgba(82,255,82,0.28)]'
              }`}>{entry.mode}</span>
              <h2 className="text-lg font-medium text-gray-900">{entry.subject || '\u2014'}</h2>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-gray-500 text-xs">When</dt><dd className="text-gray-800">{fmt(entry.timestamp)}</dd></div>
              <div><dt className="text-gray-500 text-xs">User</dt><dd className="text-gray-800">{entry.user?.email ?? '\u2014'}</dd></div>
              <div><dt className="text-gray-500 text-xs">Messages included / excluded</dt><dd className="text-gray-800 tabular-nums">{entry.includedMessageCount} / {entry.excludedMessageCount}</dd></div>
              <div><dt className="text-gray-500 text-xs">Redactions</dt><dd className="text-gray-800 tabular-nums">{entry.redactionCount}</dd></div>
              <div><dt className="text-gray-500 text-xs">Recipients</dt><dd className="text-gray-800 tabular-nums">{entry.recipientCount} ({entry.internalRecipientCount} int / {entry.externalRecipientCount} ext)</dd></div>
              <div><dt className="text-gray-500 text-xs">Captured messages</dt><dd className="text-gray-800 tabular-nums">{entry.capturedMessages.length}</dd></div>
            </dl>
            {entry.note ? (
              <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
                <div className="text-gray-500 text-xs mb-1">Note</div>
                <div className="text-gray-800">{entry.note}</div>
              </div>
            ) : null}
          </div>

          {/* Recipients */}
          <div className="p-5 bg-white border border-gray-200 rounded">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recipients</h3>
            {recipients.length === 0 ? (
              <div className="text-sm text-gray-400">No recipient addresses recorded.</div>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {recipients.map((r, i) => (
                  <li key={i} className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                    {r.address}{r.type ? <span className="text-gray-400"> &middot; {r.type}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Captured messages */}
          <div className="bg-white border border-gray-200 rounded">
            <h3 className="text-sm font-semibold text-gray-900 px-5 pt-5 pb-3">Captured messages &amp; verification</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-5 py-2">From</th>
                    <th className="text-left font-medium px-3 py-2">Originally sent</th>
                    <th className="text-left font-medium px-3 py-2">Captured</th>
                    <th className="text-left font-medium px-3 py-2">Attach.</th>
                    <th className="text-left font-medium px-3 py-2">Hash ({entry.capturedMessages[0]?.hashAlgorithm ?? 'sha256'})</th>
                    <th className="text-right font-medium px-5 py-2">Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.capturedMessages.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">No captured messages on this entry.</td></tr>
                  ) : (
                    entry.capturedMessages.map((m) => (
                      <tr key={m.id} className="border-t border-gray-100">
                        <td className="px-5 py-2 text-gray-700">{m.fromAddress ?? m.fromDomain ?? '\u2014'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmt(m.originalSentAt)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmt(m.capturedAt)}</td>
                        <td className="px-3 py-2 tabular-nums text-gray-600">{m.hadAttachments ? m.attachmentCount : '\u2014'}</td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-700" title={m.contentHash}>{shortHash(m.contentHash)}</td>
                        <td className="px-5 py-2 text-right">
                          <a href={m.verifyUrl} target="_blank" rel="noopener noreferrer"
                            className="text-brand-600 hover:underline whitespace-nowrap">Verify &#8599;</a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
