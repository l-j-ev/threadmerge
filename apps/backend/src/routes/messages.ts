import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { getGraphClient, listRecentMessages, getMessageDetail } from '../lib/graph';
import type { MessageSummary, MessageDetail } from '@threadmerge/shared';

export const messagesRouter = Router();

/**
 * GET /api/messages/recent
 * Returns the user's most recent messages across the inbox.
 * Used as the source picker for inject mode.
 */
messagesRouter.get('/recent', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const client = getGraphClient(req.graphToken!);
    const messages = await listRecentMessages(client, 50);
    const summaries: MessageSummary[] = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      subject: m.subject || '(no subject)',
      from: m.from || { emailAddress: { name: 'Unknown', address: '' } },
      receivedDateTime: m.receivedDateTime,
      bodyPreview: m.bodyPreview || '',
      hasAttachments: m.hasAttachments || false,
    }));
    res.json(summaries);
  } catch (err: any) {
    console.error('listRecentMessages error:', err.message);
    res.status(500).json({ error: 'Failed to list recent messages', detail: err.message });
  }
});

/**
 * GET /api/messages/:id
 * Returns a single message with its body and attachment metadata.
 */
messagesRouter.get('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const client = getGraphClient(req.graphToken!);
    const m = await getMessageDetail(client, req.params.id);

    const detail: MessageDetail = {
      id: m.id,
      conversationId: m.conversationId,
      subject: m.subject || '(no subject)',
      from: m.from,
      toRecipients: m.toRecipients || [],
      ccRecipients: m.ccRecipients || [],
      receivedDateTime: m.receivedDateTime,
      body: {
        contentType: m.body?.contentType?.toLowerCase() === 'html' ? 'html' : 'text',
        content: m.body?.content || '',
      },
      bodyPreview: m.bodyPreview,
      hasAttachments: m.hasAttachments || false,
      attachments: (m.attachments || []).map((a: any) => ({
        id: a.id,
        name: a.name,
        contentType: a.contentType,
        size: a.size,
        isInline: a.isInline || false,
      })),
    };
    res.json(detail);
  } catch (err: any) {
    console.error('getMessageDetail error:', err.message);
    res.status(500).json({ error: 'Failed to fetch message', detail: err.message });
  }
});
