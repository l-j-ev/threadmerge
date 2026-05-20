import { useState } from 'react';
import type { InjectPreviewResponse, MessageDetail, ConversationSummary } from '@threadmerge/shared';

interface Props {
  sourceMessage: MessageDetail;
  destThread: ConversationSummary;
  preview: InjectPreviewResponse;
  onSend: () => void;
  onBack: () => void;
}

export function InjectPreview({ sourceMessage, destThread, preview, onSend, onBack }: Props) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">Review your reply</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Check before sending into the thread.
        </p>
      </div>

      {/* Subject (read-only - derived from destination) */}
      <div className="mb-3 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs">
        <div className="font-semibold text-gray-700 mb-1">Subject</div>
        <div className="text-gray-900">{preview.subject}</div>
      </div>

      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs">
          <div className="font-semibold text-amber-900 mb-1">
            {preview.warnings.length} note{preview.warnings.length !== 1 ? 's' : ''}
          </div>
          <ul className="space-y-1 text-amber-800">
            {preview.warnings.map((w, i) => (
              <li key={i}>• {w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Recipients */}
      <div className="mb-3 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs">
        <div className="font-semibold text-gray-700 mb-1">
          Recipients ({preview.recipients.length})
        </div>
        {preview.internalRecipients.length > 0 && (
          <div className="mb-1">
            <span className="text-gray-500">Internal: </span>
            <span className="text-gray-800">
              {preview.internalRecipients.map((r) => r.address).join(', ')}
            </span>
          </div>
        )}
        {preview.externalRecipients.length > 0 && (
          <div>
            <span className="text-gray-500">External: </span>
            <span className="text-gray-800">
              {preview.externalRecipients.map((r) => r.address).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Attachments */}
      {preview.attachments.length > 0 && (
        <div className="mb-3 p-2.5 bg-gray-50 border border-gray-200 rounded text-xs">
          <div className="font-semibold text-gray-700 mb-1">
            Attachments ({preview.attachments.length})
          </div>
          <div className="space-y-0.5">
            {preview.attachments.map((a) => (
              <div key={a.id} className="text-gray-700 truncate">📎 {a.name}</div>
            ))}
          </div>
        </div>
      )}

      {/* Preview body */}
      <div className="mb-3">
        <button
          onClick={() => setShowFullPreview(!showFullPreview)}
          className="text-xs font-medium text-brand-700 hover:text-brand-800 mb-2"
        >
          {showFullPreview ? '▾ Hide' : '▸ Show'} reply preview
        </button>
        {showFullPreview && (
          <div
            className="border border-gray-200 rounded p-3 max-h-[40vh] overflow-y-auto bg-white"
            dangerouslySetInnerHTML={{ __html: preview.replyBody }}
          />
        )}
      </div>

      {/* Actions */}
      {!confirmSend ? (
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-3 py-2 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            ← Back
          </button>
          <button
            onClick={() => setConfirmSend(true)}
            className="flex-1 px-3 py-2 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600"
          >
            Send reply
          </button>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
          <div className="text-xs font-semibold text-amber-900 mb-2">
            Send this reply to {preview.recipients.length} recipient
            {preview.recipients.length !== 1 ? 's' : ''}?
          </div>
          <div className="text-xs text-amber-800 mb-3">
            This will reply in the destination thread with the source email quoted below your note.
            {preview.attachments.length > 0 && (
              <> {preview.attachments.length} attachment{preview.attachments.length !== 1 ? 's' : ''} will be included.</>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmSend(false)}
              className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 bg-white"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-amber-700 rounded hover:bg-amber-800"
            >
              Yes, send now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
