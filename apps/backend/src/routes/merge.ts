import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { getGraphClient, getConversationMessages, sendMail } from '../lib/graph';
import {
  buildMergedBody,
  collectRecipients,
  classifyRecipients,
  detectWarnings,
} from '../lib/merge';
import { prisma } from '../lib/db';
import { MergePreviewRequest, MergeSendRequest, Message } from '@threadmerge/shared';

export const mergeRouter = Router();

/**
 * Builds a preview of the merged email without actually sending it.
 * Returns the merged HTML body, deduplicated recipient list, and any warnings.
 */
mergeRouter.post('/preview', requireAuth, async (req: AuthedRequest, res: Response) => {
  const body = req.body as MergePreviewRequest;
  const client = getGraphClient(req.graphToken!);

  const [threadA, threadB] = await Promise.all([
    getConversationMessages(client, body.threadAId),
    getConversationMessages(client, body.threadBId),
  ]);

  const allMessages = [...threadA, ...threadB];

  // Filter to only included messages
  const includedSet = new Set(body.includedMessageIds);
  const includedMessages = allMessages.filter((m) => includedSet.has(m.id));

  // Sort by user-specified order if provided, else chronologically
  const orderMap = new Map<string, number>();
  body.messageOrder.forEach((id, idx) => orderMap.set(id, idx));

  const orderedMessages: Message[] =
    body.messageOrder.length > 0
      ? [...includedMessages].sort(
          (a, b) =>
            (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        )
      : [...includedMessages].sort(
          (a, b) =>
            new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
        );

  const mergedBody = buildMergedBody(orderedMessages, body.redactions);
  const recipients = collectRecipients(orderedMessages, req.user!.email);
  const userEmail = req.user!.email;
  const { internal, external } = classifyRecipients(recipients, userEmail);
  const warnings = detectWarnings(orderedMessages, recipients, userEmail);

  res.json({
    mergedBody,
    recipients,
    internalRecipients: internal,
    externalRecipients: external,
    warnings,
  });
});

/**
 * Executes the merge: builds the email, sends it, writes the audit log.
 */
mergeRouter.post('/send', requireAuth, async (req: AuthedRequest, res: Response) => {
  const body = req.body as MergeSendRequest;
  const client = getGraphClient(req.graphToken!);

  // Fetch fresh thread data for the send (don't trust client-side caches for safety)
  const [threadA, threadB] = await Promise.all([
    getConversationMessages(client, body.threadAId),
    getConversationMessages(client, body.threadBId),
  ]);

  const allMessages = [...threadA, ...threadB];
  const includedSet = new Set(body.includedMessageIds);
  const includedMessages = allMessages.filter((m) => includedSet.has(m.id));

  const orderMap = new Map<string, number>();
  body.messageOrder.forEach((id, idx) => orderMap.set(id, idx));

  const orderedMessages: Message[] =
    body.messageOrder.length > 0
      ? [...includedMessages].sort(
          (a, b) =>
            (orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        )
      : [...includedMessages].sort(
          (a, b) =>
            new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
        );

  const mergedBody = buildMergedBody(orderedMessages, body.redactions);
  const userEmail = req.user!.email;
  const { internal, external } = classifyRecipients(body.recipients, userEmail);

  // Send via Graph
  await sendMail(client, {
    subject: body.subject,
    body: { contentType: 'HTML', content: mergedBody },
    toRecipients: body.recipients.map((r) => ({ emailAddress: { address: r.address } })),
  });

  // Find the database tenant + user
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { azureTenantId: req.user!.azureTenantId },
  });
  const user = await prisma.user.findUniqueOrThrow({
    where: { azureUserId: req.user!.azureUserId },
  });

  // Determine thread subjects for the log
  const threadASubject = threadA[0]?.subject || null;
  const threadBSubject = threadB[0]?.subject || null;

  const auditLog = await prisma.auditLogEntry.create({
    data: {
      userId: user.id,
      mode: 'merge',
      tenantId: tenant.id,
      threadAId: body.threadAId,
      threadBId: body.threadBId,
      threadASubject,
      threadBSubject,
      includedMessageCount: includedMessages.length,
      excludedMessageCount: allMessages.length - includedMessages.length,
      redactionCount: body.redactions.length,
      recipientCount: body.recipients.length,
      internalRecipientCount: internal.length,
      externalRecipientCount: external.length,
      recipientAddresses: body.recipients.map((r) => r.address),
      subject: body.subject,
    },
  });

  res.json({
    success: true,
    auditLogId: auditLog.id,
    sentAt: auditLog.timestamp.toISOString(),
  });
});
