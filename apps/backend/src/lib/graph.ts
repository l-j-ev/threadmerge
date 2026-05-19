import fetch from 'node-fetch';
import { Client } from '@microsoft/microsoft-graph-client';
import { Message, ConversationSummary } from '@threadmerge/shared';

// Expose node-fetch globally for the Graph SDK (Node 20+ compatibility)
(global as any).fetch = fetch;
(global as any).Headers = fetch.Headers;
(global as any).Request = fetch.Request;
(global as any).Response = fetch.Response;

export function getGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
    
  });
}

/**
 * Lists recent conversations from the user's mailbox, grouped by conversationId.
 */
export async function listRecentConversations(
  client: Client,
  count = 20
): Promise<ConversationSummary[]> {
  const messages = await client
    .api('/me/messages')
    .top(100)
    .select('id,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,bodyPreview')
    .orderby('receivedDateTime desc')
    .get();

  const conversationMap = new Map<string, ConversationSummary>();
  for (const msg of messages.value) {
    if (!msg.conversationId) continue;
    if (!conversationMap.has(msg.conversationId)) {
      conversationMap.set(msg.conversationId, {
        conversationId: msg.conversationId,
        subject: msg.subject,
        latestMessage: msg,
        messageCount: 1,
      });
    } else {
      conversationMap.get(msg.conversationId)!.messageCount++;
    }
  }

  return Array.from(conversationMap.values()).slice(0, count);
}

/**
 * Fetches all messages for a specific conversation, sorted chronologically.
 * Uses client-side sort to avoid InefficientFilter errors on certain Graph endpoints.
 */
export async function getConversationMessages(
  client: Client,
  conversationId: string
): Promise<Message[]> {
  const messages = await client
    .api('/me/messages')
    .filter(`conversationId eq '${conversationId}'`)
    .select('id,subject,from,toRecipients,ccRecipients,receivedDateTime,body,bodyPreview')
    .top(100)
    .get();

  return messages.value.sort(
    (a: Message, b: Message) =>
      new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
  );
}

/**
 * Sends an email via the Graph API as the authenticated user.
 */
export async function sendMail(
  client: Client,
  message: {
    subject: string;
    body: { contentType: 'HTML' | 'Text'; content: string };
    toRecipients: { emailAddress: { address: string } }[];
  }
): Promise<void> {
  await client.api('/me/sendMail').post({
    message,
    saveToSentItems: true,
  });
}

export async function getMyProfile(client: Client): Promise<any> {
  return client.api('/me').get();
}
