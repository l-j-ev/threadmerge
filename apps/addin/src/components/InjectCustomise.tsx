import { useState } from 'react';
import { useCustomisation } from '../lib/stores/customisation';
import { MessageBody } from './MessageBody';
import type { MessageDetail, EmailAddress, Message } from '@threadmerge/shared';

interface Props {
  sourceMessage: MessageDetail;
  destThreadSubject: string;
  destThreadMessages: Message[];
  replyToMessage: Message;
  onContinue: (data: {
    note: string;
    includedAttachmentIds: string[];
    recipients: EmailAddress[];
  }) => void;
  onBack: () => void;
}

export function InjectCustomise({
  sourceMessage,
  destThreadSubject,
  destThreadMessages,
  onContinue,
  onBack,
}: Props) {
  const [note, setNote] = useState('');
  const [showBody, setShowBody] = useState(false);

  // Default recipients: derive from destination thread (all unique addresses across messages)
  const defaultRecipients = (() => {
    const seen = new Map<string, EmailAddress>();
    for (const msg of destThreadMessages) {
      const all = [
        msg.from?.emailAddress,
        ...(msg.toRecipients || []).map((r) => r.emailAddress),
        ...(msg.ccRecipients || []).map((r) => r.emailAddress),
      ].filter(Boolean) as EmailAddress[];
      for (const addr of all) {
        const key = addr.address.toLowerCase();
        if (!seen.has(key)) seen.set(key, addr);
      }
    }
    return Array.from(seen.values());
  })();

  const [recipients, setRecipients] = useState<EmailAddress[]>(defaultRecipients);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');

  // Attachment selection - default to all included
  const [includedAttachmentIds, setIncludedAttachmentIds] = useState<Set<string>>(
    () => new Set(sourceMessage.attachments.filter((a) => !a.isInline).map((a) => a.id))
  );

  // Get redactions from the customisation store
  const redactions = useCustomisation((s) => s.redactions);
  const sourceRedactions = redactions[sourceMessage.id] || [];

  // Plain text version of source body for redaction UI
  // (the store should already have it; if not we derive it here)
  const allMessagesInStore = useCustomisation((s) => s.messages);
  const sourceInStore = allMessagesInStore.find((m) => m.id === sourceMessage.id);
  const plainText = sourceInStore?.plainText ?? htmlToPlainTextLocal(sourceMessage);

  function toggleAttachment(id: string) {
    setIncludedAttachmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeRecipient(address: string) {
    setRecipients((prev) => prev.filter((r) => r.address.toLowerCase() !== address.toLowerCase()));
  }

  function addRecipient() {
    const trimmed = newRecipientEmail.trim();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      // Not a valid email; do nothing for now (could surface inline error later)
      return;
    }
    if (recipients.some((r) => r.address.toLowerCase() === trimmed.toLowerCase())) {
      setNewRecipientEmail('');
      return;
    }
    setRecipients((prev) => [...prev, { name: trimmed, address: trimmed }]);
    setNewRecipientEmail('');
  }

  const nonInlineAttachments = sourceMessage.attachments.filter((a) => !a.isInline);

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">Customise</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Adding to: <span className="font-medium">{destThreadSubject}</span>
        </p>
      </div>

      {/* Note */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Your note <span className="text-gray-400">(optional, shown above the source email)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Forwarding the below — collection is delayed, here's what we're doing about it."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>

      {/* Source preview */}
      <div className="mb-3 p-2.5 border border-gray-200 rounded">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-medium text-gray-700">Source email</div>
          <button
            onClick={() => setShowBody((s) => !s)}
            className="text-[10px] text-brand-700 hover:underline"
          >
            {showBody ? '▾ Hide body' : '▸ Show body'}
            {sourceRedactions.length > 0 &&
              ` (${sourceRedactions.length} redaction${sourceRedactions.length !== 1 ? 's' : ''})`}
          </button>
        </div>
        <div className="text-xs text-gray-900 font-medium truncate">
          {sourceMessage.subject || '(no subject)'}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {sourceMessage.from.emailAddress.name || sourceMessage.from.emailAddress.address}
        </div>
        {showBody && (
          <div className="mt-2">
            <MessageBody
              messageId={sourceMessage.id}
              plainText={plainText}
              redactions={sourceRedactions}
            />
            <div className="mt-1 text-[10px] text-gray-500">
              Select text and click "Redact selection" to redact it.
            </div>
          </div>
        )}
      </div>

      {/* Attachments */}
      {nonInlineAttachments.length > 0 && (
        <div className="mb-3 p-2.5 border border-gray-200 rounded">
          <div className="text-xs font-medium text-gray-700 mb-2">
            Attachments ({includedAttachmentIds.size} of {nonInlineAttachments.length} included)
          </div>
          <div className="space-y-1">
            {nonInlineAttachments.map((att) => (
              <label
                key={att.id}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={includedAttachmentIds.has(att.id)}
                  onChange={() => toggleAttachment(att.id)}
                  className="flex-shrink-0"
                />
                <span className="flex-1 truncate">{att.name}</span>
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {formatSize(att.size)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Recipients */}
      <div className="mb-3 p-2.5 border border-gray-200 rounded">
        <div className="text-xs font-medium text-gray-700 mb-2">
          Recipients ({recipients.length})
        </div>
        <div className="space-y-1 mb-2">
          {recipients.map((r) => (
            <div
              key={r.address}
              className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded"
            >
              <span className="truncate flex-1">{r.name && r.name !== r.address ? `${r.name} <${r.address}>` : r.address}</span>
              <button
                onClick={() => removeRecipient(r.address)}
                className="text-gray-400 hover:text-red-600 ml-2 flex-shrink-0"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="email"
            value={newRecipientEmail}
            onChange={(e) => setNewRecipientEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRecipient();
              }
            }}
            placeholder="Add email..."
            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            onClick={addRecipient}
            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
          >
            Add
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className="px-3 py-2 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={() =>
            onContinue({
              note,
              includedAttachmentIds: Array.from(includedAttachmentIds),
              recipients,
            })
          }
          disabled={recipients.length === 0}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue to preview
        </button>
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function htmlToPlainTextLocal(message: MessageDetail): string {
  if (message.body.contentType !== 'html') return message.body.content;
  const text = message.body.content
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
