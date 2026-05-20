import { useState, useMemo } from 'react';
import type { Message } from '@threadmerge/shared';

interface Props {
  title: string;
  subtitle?: string;
  messages: Message[];
  onPick: (message: Message) => void;
  onBack?: () => void;
}

export function MessageInThreadPicker({
  title,
  subtitle,
  messages,
  onPick,
  onBack,
}: Props) {
  // Default to the latest message (highest index after chronological sort)
  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date(b.receivedDateTime).getTime() -
          new Date(a.receivedDateTime).getTime()
      ),
    [messages]
  );

  const [selectedId, setSelectedId] = useState<string | null>(
    sortedMessages[0]?.id || null
  );

  function handleContinue() {
    const selected = messages.find((m) => m.id === selectedId);
    if (selected) onPick(selected);
  }

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        <p className="text-xs text-gray-400 mt-1">
          The reply will thread off whichever message you pick. Latest is usually right.
        </p>
      </div>

      <div className="space-y-1 max-h-[55vh] overflow-y-auto mb-3">
        {sortedMessages.map((msg) => {
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
          const isSelected = msg.id === selectedId;

          return (
            <button
              key={msg.id}
              onClick={() => setSelectedId(msg.id)}
              className={`w-full text-left p-2.5 border rounded transition-colors ${
                isSelected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => setSelectedId(msg.id)}
                  className="mt-1 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="font-medium text-xs text-gray-900 truncate">
                      {fromName}
                    </div>
                    <div className="text-xs text-gray-400 whitespace-nowrap">
                      {date}
                    </div>
                  </div>
                  {msg.bodyPreview && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {msg.bodyPreview.substring(0, 100)}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-2 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            ← Back
          </button>
        )}
        <button
          onClick={handleContinue}
          disabled={!selectedId}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
