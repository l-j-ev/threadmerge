import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import type {
  InjectPreviewRequest,
  InjectPreviewResponse,
  InjectSendRequest,
  InjectSendResponse,
} from '@threadmerge/shared';

export const injectRouter = Router();

/**
 * POST /api/inject/preview
 * Builds a preview of the reply body containing the source email + user's note.
 * STUB - real logic in Chunk 4.
 */
injectRouter.post('/preview', requireAuth, async (req: AuthedRequest, res: Response) => {
  const body = req.body as InjectPreviewRequest;
  // For now, return a placeholder. Real preview-building comes in Chunk 4.
  const response: InjectPreviewResponse = {
    replyBody: `<p><em>Preview pending (Chunk 4 implementation)</em></p>`,
    subject: 'Re: (subject pending)',
    recipients: body.recipients || [],
    internalRecipients: [],
    externalRecipients: body.recipients || [],
    warnings: [],
    attachments: [],
  };
  res.json(response);
});

/**
 * POST /api/inject/send
 * Sends a reply on the destination thread with the source email injected.
 * STUB - real logic in Chunk 4.
 */
injectRouter.post('/send', requireAuth, async (_req: AuthedRequest, res: Response) => {
  const response: InjectSendResponse = {
    sentAt: new Date().toISOString(),
    auditLogId: 'pending',
  };
  res.json(response);
});
