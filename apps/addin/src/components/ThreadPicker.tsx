import { useState, useMemo } from 'react';
import type { ConversationSummary } from '@threadmerge/shared';

interface Props {
  title: string;
  subtitle?: string;
  conversations: ConversationSummary[];
  excludeId: string | null;
  onPick: (conv: ConversationSummary) => void;
  onBack?: () => void;
}

export function ThreadPicker({
  title,
  subtitle,
  conversations,
  excludeId,
  onPick,
  onBack,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return conversations
      .filter((c) => c.conversationId !== excludeId)
      .filter((c) => !term || c.subject.toLowerCase().includes(term));
  }, [conversations, excludeId, search]);

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
        placeholder="Search by subject..."
        className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
      />

      {filtered.length === 0 && (
        <div className="text-xs text-gray-500 py-4 text-center">
          {conversations.length === 0
            ? 'No conversations found in your mailbox.'
            : 'No conversations match your search.'}
        </div>
      )}

      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.map((conv) => {
          const fromName =
            conv.latestMessage?.from?.emailAddress?.name ||
            conv.latestMessage?.from?.emailAddress?.address ||
            'Unknown';
          const date = conv.latestMessage?.receivedDateTime
            ? new Date(conv.latestMessage.receivedDateTime).toLocaleDateString(
                'en-GB',
                { day: 'numeric', month: 'short' }
              )
            : '';

          return (
            <button
              key={conv.conversationId}
              onClick={() => onPick(conv)}
              className="w-full text-left p-2.5 border border-gray-200 rounded hover:border-brand-500 hover:bg-brand-50 transition-colors group"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="font-medium text-sm text-gray-900 truncate flex-1">
                  {conv.subject || '(no subject)'}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap">{date}</div>
              </div>
              <div className="flex justify-between items-center mt-0.5">
                <div className="text-xs text-gray-500 truncate">{fromName}</div>
                <div className="text-xs text-gray-400">
                  {conv.messageCount} msg{conv.messageCount !== 1 ? 's' : ''}
                </div>
              </div>
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