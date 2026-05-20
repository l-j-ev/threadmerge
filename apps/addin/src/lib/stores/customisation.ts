import { create } from 'zustand';
import type { Message, Redaction } from '@threadmerge/shared';

export const REDACTION_MARKER = '[EMAIL REDACTED BY SENDER]';

export interface UIRedaction {
  id: string;
  messageId: string;
  startOffset: number;
  endOffset: number;
  originalText: string;
}

export interface MessageWithMeta extends Message {
  included: boolean;
  order: number;
  sourceThread: 'A' | 'B';
  plainText: string;
}

interface CustomisationState {
  messages: MessageWithMeta[];
  redactions: Record<string, UIRedaction[]>;

  initialize: (msgsA: Message[], msgsB: Message[]) => void;
  toggleInclude: (messageId: string) => void;
  setIncludeAll: (included: boolean) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  addRedaction: (messageId: string, startOffset: number, endOffset: number, originalText: string) => void;
  removeRedaction: (messageId: string, redactionId: string) => void;
  reset: () => void;

  getIncludedCount: () => number;
  getRedactionCount: () => number;
  /** Convert UI redactions to the backend's Redaction[] shape for submit. */
  serializeRedactions: () => Redaction[];
}

/**
 * Strip HTML to plain text. Conservative — preserves line breaks at block boundaries
 * and converts common HTML entities.
 */
function htmlToPlainText(html: string): string {
  let text = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  text = text.replace(/[ \t]+/g, ' ').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export const useCustomisation = create<CustomisationState>((set, get) => ({
  messages: [],
  redactions: {},

  initialize: (msgsA, msgsB) => {
    const enrich = (m: Message, sourceThread: 'A' | 'B', i: number): MessageWithMeta => {
      const plain =
        m.body.contentType === 'html'
          ? htmlToPlainText(m.body.content)
          : m.body.content;
      return {
        ...m,
        included: true,
        order: i,
        sourceThread,
        plainText: plain,
      };
    };

    const all: MessageWithMeta[] = [
      ...msgsA.map((m, i) => enrich(m, 'A', i)),
      ...msgsB.map((m, i) => enrich(m, 'B', msgsA.length + i)),
    ];

    all.sort(
      (a, b) =>
        new Date(a.receivedDateTime).getTime() -
        new Date(b.receivedDateTime).getTime()
    );
    all.forEach((m, i) => {
      m.order = i;
    });
    set({ messages: all, redactions: {} });
  },

  toggleInclude: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, included: !m.included } : m
      ),
    })),

  setIncludeAll: (included) =>
    set((state) => ({
      messages: state.messages.map((m) => ({ ...m, included })),
    })),

  reorder: (oldIndex, newIndex) =>
    set((state) => {
      const next = [...state.messages];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      next.forEach((m, i) => {
        m.order = i;
      });
      return { messages: next };
    }),

  addRedaction: (messageId, startOffset, endOffset, originalText) =>
    set((state) => {
      const id = Math.random().toString(36).substring(2, 9);
      const existing = state.redactions[messageId] || [];

      // Skip if this range overlaps an existing redaction
      const overlaps = existing.some(
        (r) => !(endOffset <= r.startOffset || startOffset >= r.endOffset)
      );
      if (overlaps) return state;

      return {
        redactions: {
          ...state.redactions,
          [messageId]: [
            ...existing,
            { id, messageId, startOffset, endOffset, originalText },
          ].sort((a, b) => a.startOffset - b.startOffset),
        },
      };
    }),

  removeRedaction: (messageId, redactionId) =>
    set((state) => {
      const existing = state.redactions[messageId] || [];
      return {
        redactions: {
          ...state.redactions,
          [messageId]: existing.filter((r) => r.id !== redactionId),
        },
      };
    }),

  reset: () => set({ messages: [], redactions: {} }),

  getIncludedCount: () => get().messages.filter((m) => m.included).length,
  getRedactionCount: () =>
    Object.values(get().redactions).reduce((sum, arr) => sum + arr.length, 0),

  serializeRedactions: () => {
    const all: Redaction[] = [];
    for (const [messageId, ranges] of Object.entries(get().redactions)) {
      for (const r of ranges) {
        all.push({
          messageId,
          startOffset: r.startOffset,
          endOffset: r.endOffset,
          originalLength: r.endOffset - r.startOffset,
          replacement: REDACTION_MARKER,
        });
      }
    }
    return all;
  },
}));
