import { useCustomisation } from '../lib/stores/customisation';
import type { ConversationSummary } from '@threadmerge/shared';

interface Props {
  threadA: ConversationSummary;
  threadB: ConversationSummary;
  onContinue: () => void;
  onBack: () => void;
}

export function CustomiseStep({ threadA, threadB, onContinue, onBack }: Props) {
  const messages = useCustomisation((s) => s.messages);
  const toggleInclude = useCustomisation((s) => s.toggleInclude);
  const setIncludeAll = useCustomisation((s) => s.setIncludeAll);
  const includedCount = useCustomisation((s) => s.getIncludedCount());
  const redactionCount = useCustomisation((s) => s.getRedactionCount());

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">Customise merge</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Choose which messages to include in the merged email.
        </p>
      </div>

      {/* Summary bar */}
      <div className="mb-3 p-2.5 bg-gray-50 border border-gray-200 rounded">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-gray-900">{includedCount}</span>
            <span className="text-gray-500"> of {messages.length} messages included</span>
            {redactionCount > 0 && (
              <span className="text-gray-500">
                {' '}• {redactionCount} redaction{redactionCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setIncludeAll(true)}
              className="text-brand-700 hover:underline"
            >
              All
            </button>
            <button
              onClick={() => setIncludeAll(false)}
              className="text-gray-600 hover:underline"
            >
              None
            </button>
          </div>
        </div>
      </div>

      {/* Message list (will be enhanced in chunk 2) */}
      <div className="space-y-2 max-h-[55vh] overflow-y-auto mb-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2.5 border rounded text-xs transition-colors ${
              msg.included
                ? 'border-gray-200 bg-white'
                : 'border-gray-200 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={msg.included}
                onChange={() => toggleInclude(msg.id)}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium truncate text-gray-900">
                    {msg.from.emailAddress.name || msg.from.emailAddress.address}
                  </div>
                  <div className="text-gray-400 whitespace-nowrap text-[10px]">
                    {new Date(msg.receivedDateTime).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-gray-500 truncate">
                  {msg.subject}
                </div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      msg.sourceThread === 'A'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    Thread {msg.sourceThread}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
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
          onClick={onContinue}
          disabled={includedCount === 0}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue to preview ({includedCount} message{includedCount !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}