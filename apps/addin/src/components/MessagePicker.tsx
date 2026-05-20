import { useState, useMemo } from 'react';
import type { MessageSummary } from '@threadmerge/shared';

interface Props {
  title: string;
  subtitle?: string;
  messages: MessageSummary[];
  onPick: (message: MessageSummary) => void;
  onBack?: () => void;
}

export function MessagePicker({
  title,
  subtitle,
  messages,
  onPick,
  onBack,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return messages;
    return messages.filter(
      (m) =>
        m.subject.toLowerCase().includes(term) ||
        m.from.emailAddress.name?.toLowerCase().includes(term) ||
        m.from.emailAddress.address.toLowerCase().includes(term) ||
        m.bodyPreview.toLowerCase().includes(term)
    );
  }, [messages, search]);

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by subject, sender, or preview..."
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
      />

      {filtered.length === 0 && (
        <div className="text-xs text-gray-500 py-4 text-center">
          {messages.length === 0
            ? 'No recent messages found.'
            : 'No messages match your search.'}
        </div>
      )}

      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.map((msg) => {
          const fromName =
            msg.from?.emailAddress?.name ||
            msg.from?.emailAddress?.address ||
            'Unknown';
          const date = new Date(msg.receivedDateTime).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <button
              key={msg.id}
              onClick={() => onPick(msg)}
              className="w-full text-left p-2.5 border border-gray-200 rounded hover:border-brand-500 hover:bg-brand-50 transition-colors"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="font-medium text-sm text-gray-900 truncate flex-1">
                  {msg.subject || '(no subject)'}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">{date}</div>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <div className="text-xs text-gray-500 truncate flex-1">{fromName}</div>
                {msg.hasAttachments && (
                  <div className="text-xs text-gray-400 flex-shrink-0 ml-2" title="Has attachments">
                    📎
                  </div>
                )}
              </div>
              {msg.bodyPreview && (
                <div className="text-xs text-gray-400 truncate mt-1">
                  {msg.bodyPreview.substring(0, 80)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="mt-4 text-xs text-gray-500 hover:text-gray-700"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
