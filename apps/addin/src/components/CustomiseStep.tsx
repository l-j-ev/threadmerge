import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCustomisation, MessageWithMeta } from '../lib/stores/customisation';
import type { ConversationSummary } from '@threadmerge/shared';
import { useState } from 'react';
import { MessageBody } from './MessageBody';
import type { UIRedaction } from '../lib/stores/customisation';

const EMPTY_REDACTIONS: UIRedaction[] = [];

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
  const reorder = useCustomisation((s) => s.reorder);
  const initialize = useCustomisation((s) => s.initialize);
  const includedCount = useCustomisation((s) => s.getIncludedCount());
  const redactionCount = useCustomisation((s) => s.getRedactionCount());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require slight movement to start drag — avoids triggering on small clicks
      activationConstraint: { distance: 4 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = messages.findIndex((m) => m.id === active.id);
    const newIndex = messages.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    reorder(oldIndex, newIndex);
  }

  function resetOrder() {
    // Re-initialise from current messages, sorted chronologically
    const msgsA = messages.filter((m) => m.sourceThread === 'A');
    const msgsB = messages.filter((m) => m.sourceThread === 'B');
    // Preserve included state across reset
    const includedIds = new Set(messages.filter((m) => m.included).map((m) => m.id));
    initialize(msgsA, msgsB);
    // Re-apply inclusion state
    const after = useCustomisation.getState().messages;
    after.forEach((m) => {
      if (!includedIds.has(m.id)) {
        useCustomisation.getState().toggleInclude(m.id);
      }
    });
  }

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-gray-900">Customise merge</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Reorder by dragging. Untick messages to exclude them.
        </p>
      </div>

      {/* Summary bar */}
      <div className="mb-3 p-2.5 bg-gray-50 border border-gray-200 rounded">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-gray-900">{includedCount}</span>
            <span className="text-gray-500"> of {messages.length} included</span>
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
            <button
              onClick={resetOrder}
              className="text-gray-600 hover:underline"
              title="Reset to chronological order"
            >
              Reset order
            </button>
          </div>
        </div>
      </div>

      {/* Sortable message list */}
      <div className="space-y-2 max-h-[55vh] overflow-y-auto mb-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={messages.map((m) => m.id)}
            strategy={verticalListSortingStrategy}
          >
            {messages.map((msg) => (
              <SortableMessage
                key={msg.id}
                message={msg}
                onToggleInclude={() => toggleInclude(msg.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
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

interface SortableMessageProps {
  message: MessageWithMeta;
  onToggleInclude: () => void;
}

function SortableMessage({ message, onToggleInclude }: SortableMessageProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: message.id });
const [expanded, setExpanded] = useState(false);
const allRedactions = useCustomisation((s) => s.redactions);
const messageRedactions = allRedactions[message.id] ?? EMPTY_REDACTIONS;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-2.5 border rounded text-xs transition-colors bg-white ${
        message.included
          ? 'border-gray-200'
          : 'border-gray-200 bg-gray-50 opacity-60'
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 mt-0.5 px-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
          title="Drag to reorder"
          aria-label="Drag to reorder"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </button>

        <input
          type="checkbox"
          checked={message.included}
          onChange={onToggleInclude}
          className="mt-0.5 flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate text-gray-900">
              {message.from.emailAddress.name || message.from.emailAddress.address}
            </div>
            <div className="text-gray-400 whitespace-nowrap text-[10px]">
              {new Date(message.receivedDateTime).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          <div className="text-gray-500 truncate">{message.subject}</div>
          <div className="mt-1 flex items-center justify-between">
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                message.sourceThread === 'A'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}
            >
              Thread {message.sourceThread}
            </span>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-[10px] text-brand-700 hover:underline"
            >
              {expanded ? '▾ Hide body' : '▸ Show body'}
              {messageRedactions.length > 0 &&
                ` (${messageRedactions.length} redaction${
                  messageRedactions.length !== 1 ? 's' : ''
                })`}
            </button>
          </div>
          {expanded && (
            <div className="mt-2">
              <MessageBody
                messageId={message.id}
                plainText={message.plainText}
                redactions={messageRedactions}
              />
              <div className="mt-1 text-[10px] text-gray-500">
                Select text and click "Redact selection" to mark it as redacted.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}