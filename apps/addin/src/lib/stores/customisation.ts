import { create } from 'zustand';
import type { Message } from '@threadmerge/shared';

export interface RedactionRange {
  id: string;
  start: number;
  end: number;
  originalText: string;
}

export interface MessageWithMeta extends Message {
  included: boolean;
  order: number;
  sourceThread: 'A' | 'B';
}

interface CustomisationState {
  messages: MessageWithMeta[];
  redactions: Record<string, RedactionRange[]>;
  
  initialize: (msgsA: Message[], msgsB: Message[]) => void;
  toggleInclude: (messageId: string) => void;
  setIncludeAll: (included: boolean) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  addRedaction: (messageId: string, range: Omit<RedactionRange, 'id'>) => void;
  removeRedaction: (messageId: string, rangeId: string) => void;
  reset: () => void;
  
  getIncludedCount: () => number;
  getRedactionCount: () => number;
}

export const useCustomisation = create<CustomisationState>((set, get) => ({
  messages: [],
  redactions: {},

  initialize: (msgsA, msgsB) => {
    const all: MessageWithMeta[] = [
      ...msgsA.map((m, i) => ({
        ...m,
        included: true,
        order: i,
        sourceThread: 'A' as const,
      })),
      ...msgsB.map((m, i) => ({
        ...m,
        included: true,
        order: msgsA.length + i,
        sourceThread: 'B' as const,
      })),
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

  addRedaction: (messageId, range) =>
    set((state) => {
      const id = Math.random().toString(36).substring(2, 9);
      const existing = state.redactions[messageId] || [];
      return {
        redactions: {
          ...state.redactions,
          [messageId]: [...existing, { ...range, id }],
        },
      };
    }),

  removeRedaction: (messageId, rangeId) =>
    set((state) => {
      const existing = state.redactions[messageId] || [];
      return {
        redactions: {
          ...state.redactions,
          [messageId]: existing.filter((r) => r.id !== rangeId),
        },
      };
    }),

  reset: () => set({ messages: [], redactions: {} }),

  getIncludedCount: () => get().messages.filter((m) => m.included).length,
  getRedactionCount: () =>
    Object.values(get().redactions).reduce((sum, arr) => sum + arr.length, 0),
}));