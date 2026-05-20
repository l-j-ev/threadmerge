import type {
  ConversationSummary,
  Message,
  MergePreviewRequest,
  MergePreviewResponse,
  MergeSendRequest,
  MergeSendResponse,
  MessageSummary,
  MessageDetail,
  InjectPreviewRequest,
  InjectPreviewResponse,
  InjectSendRequest,
  InjectSendResponse,
} from '@threadmerge/shared';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function authedFetch<T>(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status}: ${errorText}`);
  }
  return response.json();
}

export const api = {
  me: (token: string) => authedFetch<{ user: any; tenant: any }>(token, '/api/auth/me'),
  listConversations: (token: string) =>
    authedFetch<ConversationSummary[]>(token, '/api/conversations'),
  getConversation: (token: string, conversationId: string) =>
    authedFetch<Message[]>(token, `/api/conversations/${encodeURIComponent(conversationId)}/messages`),
  mergePreview: (token: string, data: MergePreviewRequest) =>
    authedFetch<MergePreviewResponse>(token, '/api/merge/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  mergeSend: (token: string, data: MergeSendRequest) =>
    authedFetch<MergeSendResponse>(token, '/api/merge/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // Inject mode
  listRecentMessages: (token: string) =>
    authedFetch<MessageSummary[]>(token, '/api/messages/recent'),
  getMessageDetail: (token: string, messageId: string) =>
    authedFetch<MessageDetail>(token, `/api/messages/${encodeURIComponent(messageId)}`),
  injectPreview: (token: string, data: InjectPreviewRequest) =>
    authedFetch<InjectPreviewResponse>(token, '/api/inject/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  injectSend: (token: string, data: InjectSendRequest) =>
    authedFetch<InjectSendResponse>(token, '/api/inject/send', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
