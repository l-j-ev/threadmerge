import { useEffect, useState } from 'react';
import { getAuthToken } from './lib/auth';
import { api } from './lib/api';
import type {
  ConversationSummary,
  MergePreviewResponse,
  Message,
  MessageSummary,
  MessageDetail,
} from '@threadmerge/shared';
import { ThreadPicker } from './components/ThreadPicker';
import { MergePreview } from './components/MergePreview';
import { SuccessScreen } from './components/SuccessScreen';
import { CustomiseStep } from './components/CustomiseStep';
import { MessagePicker } from './components/MessagePicker';
import { MessageInThreadPicker } from './components/MessageInThreadPicker';
import { useCustomisation } from './lib/stores/customisation';

type Step =
  | 'auth'
  | 'mode'
  | 'pickA'
  | 'pickB'
  | 'customise'
  | 'preview'
  | 'success'
  | 'inject-pickSource'
  | 'inject-pickDest'
  | 'inject-pickReplyTo'
  | 'inject-customise'
  | 'inject-preview'
  | 'inject-success';

type Mode = 'merge' | 'inject';

interface AppState {
  step: Step;
  mode: Mode | null;
  user: any | null;
  token: string | null;
  conversations: ConversationSummary[];
  // merge mode
  threadA: ConversationSummary | null;
  threadB: ConversationSummary | null;
  preview: MergePreviewResponse | null;
  sentAt: string | null;
  // inject mode
  recentMessages: MessageSummary[];
  sourceMessage: MessageDetail | null;
  destThread: ConversationSummary | null;
  destThreadMessages: Message[];
  replyToMessage: Message | null;
  // shared
  error: string | null;
  loading: boolean;
}

const initialState: AppState = {
  step: 'auth',
  mode: null,
  user: null,
  token: null,
  conversations: [],
  threadA: null,
  threadB: null,
  preview: null,
  sentAt: null,
  recentMessages: [],
  sourceMessage: null,
  destThread: null,
  destThreadMessages: [],
  replyToMessage: null,
  error: null,
  loading: false,
};

export default function App() {
  const [state, setState] = useState<AppState>(initialState);

  function update(patch: Partial<AppState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  useEffect(() => {
    // Don't auto-trigger auth - Office dialog API isn't ready during mount lifecycle.
  }, []);

  async function authenticate() {
    try {
      update({ loading: true, error: null });
      const token = await getAuthToken();
      const { user } = await api.me(token);
      const conversations = await api.listConversations(token);
      update({
        token,
        user,
        conversations,
        step: 'mode',
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

  async function pickMode(mode: Mode) {
    if (mode === 'merge') {
      update({ mode, step: 'pickA' });
    } else {
      // Load recent messages for source picker
      if (!state.token) return;
      try {
        update({ mode, loading: true, error: null });
        const recentMessages = await api.listRecentMessages(state.token);
        update({ recentMessages, step: 'inject-pickSource', loading: false });
      } catch (err: any) {
        console.error('Load recent messages error:', err);
        update({ error: err.message || 'Failed to load messages', loading: false });
      }
    }
  }

  // === Merge mode handlers ===

  function pickThreadA(thread: ConversationSummary) {
    update({ threadA: thread, step: 'pickB' });
  }

  async function pickThreadB(thread: ConversationSummary) {
    if (!state.threadA || !state.token) return;
    try {
      update({ threadB: thread, loading: true, error: null });
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
      const redactions = customisation.serializeRedactions();
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
      const redactions = customisation.serializeRedactions();
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

  // === Inject mode handlers ===

  async function pickInjectSource(message: MessageSummary) {
    if (!state.token) return;
    try {
      update({ loading: true, error: null });
      const detail = await api.getMessageDetail(state.token, message.id);
      update({
        sourceMessage: detail,
        step: 'inject-pickDest',
        loading: false,
      });
    } catch (err: any) {
      console.error('Get message detail error:', err);
      update({ error: err.message || 'Failed to load message', loading: false });
    }
  }

  async function pickInjectDest(thread: ConversationSummary) {
    if (!state.token) return;
    try {
      update({ destThread: thread, loading: true, error: null });
      const messages = await api.getConversation(state.token, thread.conversationId);
      update({
        destThreadMessages: messages,
        step: 'inject-pickReplyTo',
        loading: false,
      });
    } catch (err: any) {
      console.error('Load dest thread error:', err);
      update({ error: err.message || 'Failed to load thread', loading: false });
    }
  }

  function pickReplyTo(message: Message) {
    update({ replyToMessage: message, step: 'inject-customise' });
  }

  // === Reset ===

  function reset() {
    if (!state.token || !state.user) return;
    useCustomisation.getState().reset();
    update({
      step: 'mode',
      mode: null,
      threadA: null,
      threadB: null,
      preview: null,
      sentAt: null,
      sourceMessage: null,
      destThread: null,
      destThreadMessages: [],
      replyToMessage: null,
      error: null,
    });
  }

  return (
    <div className="p-4 min-h-screen">
      <header className="mb-4 pb-3 border-b border-gray-200">
        <h1 className="text-lg font-semibold text-brand-700">ThreadMerge</h1>
        {state.user && (
          <p className="text-xs text-gray-500 mt-0.5">{state.user.email}</p>
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

      {state.step === 'mode' && !state.loading && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            What would you like to do?
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Choose how you want to combine email content.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => pickMode('merge')}
              className="w-full text-left p-3 border border-gray-200 rounded hover:border-brand-500 hover:bg-brand-50 transition-colors group"
            >
              <div className="font-medium text-sm text-gray-900 group-hover:text-brand-700">
                Merge two threads
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Combine two conversations into one new email with controlled disclosure.
              </div>
            </button>
            <button
              onClick={() => pickMode('inject')}
              className="w-full text-left p-3 border border-gray-200 rounded hover:border-brand-500 hover:bg-brand-50 transition-colors group"
            >
              <div className="font-medium text-sm text-gray-900 group-hover:text-brand-700">
                Add to thread
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Add an email into an existing running thread with a note.
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Merge mode steps */}
      {state.step === 'pickA' && !state.loading && (
        <ThreadPicker
          title="Pick the first thread"
          subtitle="Choose the conversation you want to start with."
          conversations={state.conversations}
          excludeId={null}
          onPick={pickThreadA}
          onBack={() => update({ step: 'mode', mode: null })}
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

      {/* Inject mode steps */}
      {state.step === 'inject-pickSource' && !state.loading && (
        <MessagePicker
          title="Pick the email to add"
          subtitle="Choose the email you want to add into another thread."
          messages={state.recentMessages}
          onPick={pickInjectSource}
          onBack={() => update({ step: 'mode', mode: null, recentMessages: [] })}
        />
      )}

      {state.step === 'inject-pickDest' && state.sourceMessage && !state.loading && (
        <ThreadPicker
          title="Pick the destination thread"
          subtitle={`Adding: "${state.sourceMessage.subject}"`}
          conversations={state.conversations}
          excludeId={state.sourceMessage.conversationId || null}
          onPick={pickInjectDest}
          onBack={() => update({ step: 'inject-pickSource', sourceMessage: null })}
        />
      )}

      {state.step === 'inject-pickReplyTo' &&
        state.destThread &&
        state.destThreadMessages.length > 0 &&
        !state.loading && (
          <MessageInThreadPicker
            title="Pick which message to reply to"
            subtitle={`Replying in: "${state.destThread.subject}"`}
            messages={state.destThreadMessages}
            onPick={pickReplyTo}
            onBack={() =>
              update({ step: 'inject-pickDest', destThread: null, destThreadMessages: [] })
            }
          />
        )}

      {state.step === 'inject-customise' &&
        state.sourceMessage &&
        state.destThread &&
        state.replyToMessage &&
        !state.loading && (
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Customise (placeholder)
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Source: {state.sourceMessage.subject}<br />
              Destination: {state.destThread.subject}<br />
              Replying to: {state.replyToMessage.from.emailAddress.name || state.replyToMessage.from.emailAddress.address}<br /><br />
              Note input, attachments, recipients, and preview come in Chunk 4.
            </p>
            <button
              onClick={() =>
                update({ step: 'inject-pickReplyTo', replyToMessage: null })
              }
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>
          </div>
        )}
    </div>
  );
}
