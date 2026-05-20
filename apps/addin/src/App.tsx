import { useEffect, useState } from 'react';
import { getAuthToken } from './lib/auth';
import { api } from './lib/api';
import type { ConversationSummary, MergePreviewResponse } from '@threadmerge/shared';
import { ThreadPicker } from './components/ThreadPicker';
import { MergePreview } from './components/MergePreview';
import { SuccessScreen } from './components/SuccessScreen';
import { CustomiseStep } from './components/CustomiseStep';
import { useCustomisation } from './lib/stores/customisation';

type Step = 'auth' | 'pickA' | 'pickB' | 'customise' | 'preview' | 'success';

interface AppState {
  step: Step;
  user: any | null;
  token: string | null;
  conversations: ConversationSummary[];
  threadA: ConversationSummary | null;
  threadB: ConversationSummary | null;
  preview: MergePreviewResponse | null;
  sentAt: string | null;
  error: string | null;
  loading: boolean;
}

const initialState: AppState = {
  step: 'auth',
  user: null,
  token: null,
  conversations: [],
  threadA: null,
  threadB: null,
  preview: null,
  sentAt: null,
  error: null,
  loading: false,
};

interface CustomisationState {
  messages: MessageWithMeta[];        // All messages from both threads with included/order
  redactions: Record<string, RedactionRange[]>;  // Per-message redactions
  toggleInclude: (id: string) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  addRedaction: (messageId: string, range: RedactionRange) => void;
  removeRedaction: (messageId: string, rangeId: string) => void;
}

interface MessageWithMeta extends Message {
  included: boolean;
  order: number;
  sourceThread: 'A' | 'B';
}

interface RedactionRange {
  id: string;
  start: number;
  end: number;
  text: string;  // The original text being redacted, for audit purposes
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState);

  function update(patch: Partial<AppState>) {
    setState((s) => ({ ...s, ...patch }));
  }

 // === Initial state on mount ===
useEffect(() => {
  // Don't auto-trigger auth - Office dialog API isn't ready during mount lifecycle.
  // User clicks the sign-in button to start the flow.
}, []);

  async function authenticate() {
    try {
      update({ loading: true, error: null });
      const token = await getAuthToken();
      const { user } = await api.me(token);
      // Pre-fetch conversations once we have a token
      const conversations = await api.listConversations(token);
      update({
        token,
        user,
        conversations,
        step: 'pickA',
        loading: false,
      });
    } catch (err: any) {
      console.error('Auth/init error:', err);
      update({
        error: err.message || 'Sign-in failed',
        loading: false,
      });
    }
  }

  // === Step handlers ===
  function pickThreadA(thread: ConversationSummary) {
    update({ threadA: thread, step: 'pickB' });
  }

  async function pickThreadB(thread: ConversationSummary) {
  if (!state.threadA || !state.token) return;
  try {
    update({ threadB: thread, loading: true, error: null });
    
    // Load messages from both threads into the customisation store
    const [msgsA, msgsB] = await Promise.all([
      api.getConversation(state.token, state.threadA.conversationId),
      api.getConversation(state.token, thread.conversationId),
    ]);
    
    useCustomisation.getState().initialize(msgsA, msgsB);
    
    update({ step: 'customise', loading: false });
  } catch (err: any) {
    console.error('Load messages error:', err);
    update({ error: err.message || 'Failed to load messages', loading: false });
  }
}

  async function buildPreview() {
  if (!state.threadA || !state.threadB || !state.token) return;
  try {
    update({ loading: true, error: null });

    const customisation = useCustomisation.getState();
    const includedMessages = customisation.messages.filter((m) => m.included);
    
    if (includedMessages.length === 0) {
      update({ error: 'Select at least one message to include', loading: false });
      return;
    }

    const includedMessageIds = includedMessages.map((m) => m.id);
    const messageOrder = includedMessages.map((m) => m.id);
    
    // Flatten redactions to backend format
    const redactions = Object.entries(customisation.redactions).flatMap(
      ([messageId, ranges]) =>
        ranges.map((r) => ({
          messageId,
          start: r.start,
          end: r.end,
        }))
    );

    const preview = await api.mergePreview(state.token, {
      threadAId: state.threadA.conversationId,
      threadBId: state.threadB.conversationId,
      includedMessageIds,
      messageOrder,
      redactions,
    });

    update({ preview, step: 'preview', loading: false });
  } catch (err: any) {
    console.error('Preview error:', err);
    update({ error: err.message || 'Failed to build preview', loading: false });
  }
}

  async function sendMerge(subject: string) {
  if (!state.threadA || !state.threadB || !state.token || !state.preview) return;
  try {
    update({ loading: true, error: null });

    const customisation = useCustomisation.getState();
    const includedMessages = customisation.messages.filter((m) => m.included);
    const includedMessageIds = includedMessages.map((m) => m.id);
    const messageOrder = includedMessages.map((m) => m.id);
    
    const redactions = Object.entries(customisation.redactions).flatMap(
      ([messageId, ranges]) =>
        ranges.map((r) => ({
          messageId,
          start: r.start,
          end: r.end,
        }))
    );

    const result = await api.mergeSend(state.token, {
      threadAId: state.threadA.conversationId,
      threadBId: state.threadB.conversationId,
      includedMessageIds,
      messageOrder,
      redactions,
      subject,
      recipients: state.preview.recipients,
    });

    update({ sentAt: result.sentAt, step: 'success', loading: false });
  } catch (err: any) {
    console.error('Send error:', err);
    update({ error: err.message || 'Failed to send', loading: false });
  }
}

  function reset() {
  if (!state.token || !state.user) return;
  useCustomisation.getState().reset();
  update({
    step: 'pickA',
    threadA: null,
    threadB: null,
    preview: null,
    sentAt: null,
    error: null,
  });
}

  // === Render ===
  return (
    <div className="p-4 min-h-screen">
      <header className="mb-4 pb-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-brand-700">ThreadMerge</h1>
        {state.user && (
          <p className="text-xs text-gray-500 mt-0.5">
            {state.user.email}
          </p>
        )}
      </header>

      {state.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
          <div className="font-semibold mb-1">Error</div>
          <div>{state.error}</div>
          <button
            onClick={authenticate}
            className="mt-2 text-red-700 underline text-xs"
          >
            Try again
          </button>
        </div>
      )}

      {state.loading && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-gray-700 text-xs">
          Loading...
        </div>
      )}

      {state.step === 'auth' && !state.loading && (
  <div>
    <p className="text-sm text-gray-600 mb-3">
      Sign in with your Microsoft account to get started.
    </p>
    <button
      onClick={authenticate}
      className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded hover:bg-brand-600"
    >
      Sign in with Microsoft
    </button>
  </div>
)}

      {state.step === 'pickA' && !state.loading && (
        <ThreadPicker
          title="Pick the first thread"
          subtitle="Choose the conversation you want to start with."
          conversations={state.conversations}
          excludeId={null}
          onPick={pickThreadA}
        />
      )}

      {state.step === 'pickB' && state.threadA && !state.loading && (
        <ThreadPicker
          title="Pick the second thread"
          subtitle={`Merging with: "${state.threadA.subject}"`}
          conversations={state.conversations}
          excludeId={state.threadA.conversationId}
          onPick={pickThreadB}
          onBack={() => update({ step: 'pickA', threadA: null })}
        />
      )}

      {state.step === 'customise' &&
  state.threadA &&
  state.threadB &&
  !state.loading && (
    <CustomiseStep
      threadA={state.threadA}
      threadB={state.threadB}
      onContinue={buildPreview}
      onBack={() => {
        useCustomisation.getState().reset();
        update({ step: 'pickB', threadB: null });
      }}
    />
  )}

      {state.step === 'preview' &&
        state.threadA &&
        state.threadB &&
        state.preview &&
        !state.loading && (
          <MergePreview
            threadA={state.threadA}
            threadB={state.threadB}
            preview={state.preview}
            onSend={sendMerge}
            onBack={() => update({ step: 'customise', preview: null })}
          />
        )}

      {state.step === 'success' && state.sentAt && (
        <SuccessScreen sentAt={state.sentAt} onMergeAnother={reset} />
      )}
    </div>
  );
}