import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { getGraphClient, getMessageDetail, getConversationMessages } from '../lib/graph';
import { classifyRecipients } from '../lib/merge';
import { escapeHtml } from '../lib/textExtraction';
import type {
  InjectPreviewRequest,
  InjectPreviewResponse,
  InjectSendRequest,
  InjectSendResponse,
  Redaction,
} from '@threadmerge/shared';

export const injectRouter = Router();

/**
 * Applies redactions to a content string by character offsets.
 * Mirrors the function in merge.ts.
 */
function applyRedactions(content: string, redactions: Redaction[]): string {
  if (redactions.length === 0) return content;
  const sorted = [...redactions].sort((a, b) => b.startOffset - a.startOffset);
  let result = content;
  for (const r of sorted) {
    result =
      result.slice(0, r.startOffset) +
      r.replacement +
      result.slice(r.startOffset + r.originalLength);
  }
  return result;
}

/**
 * POST /api/inject/preview
 * Builds the reply body that would be sent: user's note above quoted source email.
 */
injectRouter.post('/preview', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const body = req.body as InjectPreviewRequest;
    const client = getGraphClient(req.graphToken!);

    // Fetch the source message with full body
    const source = await getMessageDetail(client, body.sourceMessageId);

    // Fetch destination thread to derive subject + recipients
    const destMessages = await getConversationMessages(client, body.destThreadId);
    const replyToMessage =
      destMessages.find((m: any) => m.id === body.replyToMessageId) ||
      destMessages[destMessages.length - 1];

    if (!replyToMessage) {
      res.status(400).json({ error: 'Reply-to message not found' });
      return;
    }

    // Derive subject from destination thread (use the reply-to message's subject)
    const destSubject = replyToMessage.subject || '(no subject)';
    const subject = destSubject.startsWith('Re:') ? destSubject : `Re: ${destSubject}`;

    // Apply redactions to source body
    const sourceRedactions = body.redactions.filter(
      (r) => r.messageId === body.sourceMessageId
    );
    const sourceContent =
      source.body?.contentType?.toLowerCase() === 'html'
        ? source.body.content
        : `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(
            source.body?.content || ''
          )}</pre>`;
    const redactedSourceBody = applyRedactions(sourceContent, sourceRedactions);

    // Filter attachments to only included ones
    const allAttachments = source.attachments || [];
    const includedAttachments = allAttachments.filter((a: any) =>
      body.includedAttachmentIds.includes(a.id)
    );

    // Build the reply body
    const noteHtml = body.note
      ? `<div style="font-family: Arial, sans-serif; color: #333; margin-bottom: 16px; padding: 12px; background: #f9f9f9; border-left: 3px solid #0078d4;">
          ${escapeHtml(body.note).replace(/\n/g, '<br>')}
        </div>`
      : '';

    const fromName = source.from?.emailAddress?.name || 'Unknown';
    const fromAddr = source.from?.emailAddress?.address || '';
    const sourceDate = new Date(source.receivedDateTime).toLocaleString('en-GB');

    const sourceQuote = `
      <div style="border-left: 3px solid #ccc; padding: 10px 14px; margin: 14px 0; background: #fafafa; font-family: Arial, sans-serif;">
        <div style="font-size: 13px; color: #666; margin-bottom: 10px; line-height: 1.5;">
          <strong>From:</strong> ${escapeHtml(fromName)} &lt;${escapeHtml(fromAddr)}&gt;<br>
          <strong>Sent:</strong> ${escapeHtml(sourceDate)}<br>
          <strong>Subject:</strong> ${escapeHtml(source.subject || '')}
        </div>
        <div style="font-size: 14px; color: #333;">
          ${redactedSourceBody}
        </div>
      </div>
    `;

    const replyBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 720px;">
        ${noteHtml}
        ${sourceQuote}
        <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 11px; color: #999;">
          Added with ThreadMerge
        </div>
      </div>
    `;

    // Classify recipients
    const userEmail = req.user!.email;
    const { internal, external } = classifyRecipients(body.recipients, userEmail);

    // Warnings
    const warnings: { code: string; message: string }[] = [];
    if (external.length > 0 && internal.length > 0) {
      warnings.push({
        code: 'mixed-recipients',
        message: `This reply will go to ${internal.length} internal and ${external.length} external recipient${external.length !== 1 ? 's' : ''}.`,
      });
    }
    if (includedAttachments.length > 0) {
      warnings.push({
        code: 'attachments-included',
        message: `${includedAttachments.length} attachment${includedAttachments.length !== 1 ? 's' : ''} will be carried over.`,
      });
    }

    const response: InjectPreviewResponse = {
      replyBody,
      subject,
      recipients: body.recipients,
      internalRecipients: internal,
      externalRecipients: external,
      warnings,
      attachments: includedAttachments,
    };

    res.json(response);
  } catch (err: any) {
    console.error('Inject preview error:', err);
    res.status(500).json({ error: 'Failed to build preview', detail: err.message });
  }
});

/**
 * POST /api/inject/send
 * STUB - real send in Chunk 4b.
 */
injectRouter.post('/send', requireAuth, async (_req: AuthedRequest, res: Response) => {
  const response: InjectSendResponse = {
    sentAt: new Date().toISOString(),
    auditLogId: 'pending',
  };
  res.json(response);
});
