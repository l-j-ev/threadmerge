import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { getGraphClient, listRecentConversations, getConversationMessages } from '../lib/graph';

export const conversationsRouter = Router();

/**
 * Lists the user's 20 most recent conversations.
 */
conversationsRouter.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const client = getGraphClient(req.graphToken!);
  const conversations = await listRecentConversations(client, 20);
  res.json(conversations);
});

/**
 * Returns all messages for a given conversation, in chronological order.
 */
conversationsRouter.get('/:id/messages', requireAuth, async (req: AuthedRequest, res: Response) => {
  const client = getGraphClient(req.graphToken!);
  const messages = await getConversationMessages(client, req.params.id);
  res.json(messages);
});
