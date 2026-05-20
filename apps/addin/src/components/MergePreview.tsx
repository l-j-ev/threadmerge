import { useState } from 'react';
import type {
  ConversationSummary,
  MergePreviewResponse,
} from '@threadmerge/shared';

interface Props {
  threadA: ConversationSummary;
  threadB: ConversationSummary;
  preview: MergePreviewResponse;
  onSend: (subject: string) => void;
  onBack: () => void;
}

export function MergePreview({ threadA, threadB, preview, onSend, onBack }: Props) {
  const defaultSubject = `Merged: ${threadA.subject} + ${threadB.subject}`;
  const [subject, setSubject] = useState(defaultSubject);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">Review your merge</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Check the recipients and preview before sending.
        </p>
      </div>

      {/* Subject */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
      </div>

      {/* Warnings */}
      {preview.warnings.length > 0 && (
        <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs">
          <div className="font-semibold text-amber-900 mb-1">
            {preview.warnings.length} warning{preview.warnings.length !== 1 ? 's' : ''}
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

      {/* Preview body */}
      <div className="mb-3">
        <button
          onClick={() => setShowFullPreview(!showFullPreview)}
          className="text-xs font-medium text-brand-700 hover:text-brand-800 mb-2"
        >
          {showFullPreview ? '▾ Hide' : '▸ Show'} merged email preview
        </button>
        {showFullPreview && (
          <div
            className="border border-gray-200 rounded p-3 max-h-[40vh] overflow-y-auto bg-white"
            dangerouslySetInnerHTML={{ __html: preview.mergedBody }}
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
            Send merged thread
          </button>
        </div>
      ) : (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
          <div className="text-xs font-semibold text-amber-900 mb-2">
            Send this merged email to {preview.recipients.length} recipient
            {preview.recipients.length !== 1 ? 's' : ''}?
          </div>
          <div className="text-xs text-amber-800 mb-3">
            This will send a new email containing both threads. The original threads
            are not modified.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmSend(false)}
              className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50 bg-white"
            >
              Cancel
            </button>
            <button
              onClick={() => onSend(subject)}
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