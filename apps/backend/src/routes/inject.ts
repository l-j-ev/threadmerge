import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import {
  getGraphClient,
  getMessageDetail,
  getConversationMessages,
  getAttachmentContent,
  replyToMessage as sendReply,
} from '../lib/graph';
import { classifyRecipients } from '../lib/merge';
import { escapeHtml } from '../lib/textExtraction';
import { captureMessage, generateRecipientTokens, buildVerifyUrl } from '../lib/hashing';
import { prisma } from '../lib/db';
import type {
  InjectPreviewRequest,
  InjectPreviewResponse,
  InjectSendRequest,
  InjectSendResponse,
  Redaction,
} from '@threadmerge/shared';

export const injectRouter = Router();

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
 * Builds the reply HTML body. Used by both preview and send.
 */
async function buildReplyBody(
  client: any,
  body: InjectPreviewRequest,
  sourceVerifyUrl?: string
): Promise<{
  replyBody: string;
  subject: string;
  source: any;
  replyTo: any;
  includedAttachments: any[];
}> {
  const source = await getMessageDetail(client, body.sourceMessageId);
  const destMessages = await getConversationMessages(client, body.destThreadId);
  const replyTo =
    destMessages.find((m: any) => m.id === body.replyToMessageId) ||
    destMessages[destMessages.length - 1];

  if (!replyTo) {
    throw new Error('Reply-to message not found');
  }

  const destSubject = replyTo.subject || '(no subject)';
  const subject = destSubject.startsWith('Re:') ? destSubject : `Re: ${destSubject}`;

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

  const allAttachments = source.attachments || [];
  const includedAttachments = allAttachments.filter((a: any) =>
    body.includedAttachmentIds.includes(a.id)
  );

  const noteHtml = body.note
    ? `<div style="font-family: Arial, sans-serif; color: #333; margin-bottom: 16px; padding: 12px; background: #f9f9f9; border-left: 3px solid #0078d4;">
        ${escapeHtml(body.note).replace(/\n/g, '<br>')}
      </div>`
    : '';

  const fromName = source.from?.emailAddress?.name || 'Unknown';
  const fromAddr = source.from?.emailAddress?.address || '';
  const sourceDate = new Date(source.receivedDateTime).toLocaleString('en-GB');

  const verifyBadge = sourceVerifyUrl
    ? `<div style="margin: 8px 0;"><a href="${escapeHtml(sourceVerifyUrl)}" style="display:inline-block; font-size:11px; color:#5b6cff; text-decoration:none; padding:3px 10px; border:1px solid #c5cdff; border-radius:4px; background:#f5f7ff;">🔒 Verified by Nootro · verify this message</a></div>`
    : '';

  const sourceQuote = `
    <div style="border-left: 3px solid #ccc; padding: 10px 14px; margin: 14px 0; background: #fafafa; font-family: Arial, sans-serif;">
      <div style="font-size: 13px; color: #666; margin-bottom: 10px; line-height: 1.5;">
        <strong>From:</strong> ${escapeHtml(fromName)} &lt;${escapeHtml(fromAddr)}&gt;<br>
        <strong>Sent:</strong> ${escapeHtml(sourceDate)}<br>
        <strong>Subject:</strong> ${escapeHtml(source.subject || '')}
      </div>
      ${verifyBadge}
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
        Sent with Nootro
      </div>
    </div>
  `;

  return { replyBody, subject, source, replyTo, includedAttachments };
}

/**
 * POST /api/inject/preview
 */
injectRouter.post('/preview', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const body = req.body as InjectPreviewRequest;
    const client = getGraphClient(req.graphToken!);

    const { replyBody, subject, includedAttachments } = await buildReplyBody(client, body);

    const userEmail = req.user!.email;
    const { internal, external } = classifyRecipients(body.recipients, userEmail);

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
 * Sends the actual reply via Graph reply API, with attachments.
 */
injectRouter.post('/send', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const body = req.body as InjectSendRequest;
    const client = getGraphClient(req.graphToken!);

    // Capture source message hash FIRST so we can embed verify link into the body
    console.log('[inject/send] Capturing source message hash...');
    const capturedRecord = await captureMessage(client, body.sourceMessageId);
    console.log(`[inject/send] Captured hash: ${capturedRecord.contentHash.slice(0, 8)}...`);

    // Build the verify URL for the source message
    const sourceVerifyUrl = buildVerifyUrl(capturedRecord.contentHash);

    const { replyBody, source, replyTo, includedAttachments } = await buildReplyBody(
      client,
      body,
      sourceVerifyUrl
    );

    // Fetch attachment content for each included attachment
    console.log(`Fetching ${includedAttachments.length} attachment(s)...`);
    const attachmentsToAttach: any[] = [];
    for (const att of includedAttachments) {
      const full = await getAttachmentContent(client, source.id, att.id);
      attachmentsToAttach.push({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: full.name,
        contentType: full.contentType,
        contentBytes: full.contentBytes,
      });
    }

    // Send the reply (body now includes verify badge next to the source quote)
    console.log(
      `Sending reply on message ${replyTo.id} to ${body.recipients.length} recipient(s)...`
    );
    await sendReply(client, replyTo.id, {
      body: { contentType: 'HTML', content: replyBody },
      toRecipients: body.recipients.map((r) => ({
        emailAddress: { address: r.address },
      })),
      attachments: attachmentsToAttach,
    });

    // Generate per-recipient tokens for the authenticated verify tier
    const recipientTokens = generateRecipientTokens(body.recipients);
    console.log(`[inject/send] Generated ${recipientTokens.length} recipient token(s).`);

    // Audit log
    const userEmail = req.user!.email;
    const { internal, external } = classifyRecipients(body.recipients, userEmail);

    const tenant = await prisma.tenant.findUniqueOrThrow({
      where: { azureTenantId: req.user!.azureTenantId },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: { azureUserId: req.user!.azureUserId },
    });

    const auditLog = await prisma.auditLogEntry.create({
      data: {
        mode: 'inject',
        sourceThreadId: source.conversationId || source.id,
        destinationThreadId: body.destThreadId,
        note: body.note || null,
        userId: user.id,
        tenantId: tenant.id,
        threadAId: source.conversationId || source.id,
        threadBId: body.destThreadId,
        threadASubject: source.subject || null,
        threadBSubject: replyTo.subject || null,
        includedMessageCount: 1,
        excludedMessageCount: 0,
        redactionCount: body.redactions.length,
        recipientCount: body.recipients.length,
        internalRecipientCount: internal.length,
        externalRecipientCount: external.length,
        subject: body.subject,
        recipientAddresses: body.recipients.map((r) => r.address),
        capturedMessages: {
          create: [{
            graphMessageId: capturedRecord.graphMessageId,
            conversationId: capturedRecord.conversationId,
            contentHash: capturedRecord.contentHash,
            hashAlgorithm: capturedRecord.hashAlgorithm,
            fromAddress: capturedRecord.fromAddress,
            fromDomain: capturedRecord.fromDomain,
            originalSentAt: capturedRecord.originalSentAt,
            recipientCount: capturedRecord.recipientCount,
            hadAttachments: capturedRecord.hadAttachments,
            attachmentCount: capturedRecord.attachmentCount,
          }],
        },
        recipientTokens: {
          create: recipientTokens.map((rt) => ({
            token: rt.token,
            recipientAddress: rt.recipientAddress,
          })),
        },
      },
    });

    const response: InjectSendResponse = {
      sentAt: new Date().toISOString(),
      auditLogId: auditLog.id,
    };
    res.json(response);
  } catch (err: any) {
    console.error('Inject send error:', err);
    res.status(500).json({ error: 'Failed to send', detail: err.message });
  }
});
