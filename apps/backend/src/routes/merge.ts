import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { getGraphClient, getConversationMessages, sendMail } from '../lib/graph';
import {
  buildMergedBody,
  collectRecipients,
  classifyRecipients,
  detectWarnings,
} from '../lib/merge';
import { captureMessages, buildVerifyUrl } from '../lib/hashing';
import { prisma } from '../lib/db';
import { MergePreviewRequest, MergeSendRequest, Message } from '@threadmerge/shared';

export const mergeRouter = Router();

/**
 * Builds a preview of the merged email without actually sending it.
 */
mergeRouter.post('/preview', requireAuth, async (req: AuthedRequest, res: Response) => {
  const body = req.body as MergePreviewRequest;
  const client = getGraphClient(req.graphToken!);

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
            new Date(a.receivedDateTime).getTime() -
            new Date(b.receivedDateTime).getTime()
        );

  const mergedBody = buildMergedBody(orderedMessages, body.redactions);
  const recipients = collectRecipients(orderedMessages, body.recipients);
  const userEmail = req.user!.email;
  const { internal, external } = classifyRecipients(recipients, userEmail);
  const warnings = detectWarnings(orderedMessages, recipients, userEmail);

  res.json({
    mergedBody,
    recipients,
    internalRecipients: internal,
    externalRecipients: external,
    warnings,
    messages: orderedMessages,
  });
});

/**
 * Sends the merged email, captures hashes of all included source messages,
 * and writes an audit log entry with linked CapturedMessage rows.
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
            new Date(a.receivedDateTime).getTime() -
            new Date(b.receivedDateTime).getTime()
        );

  // Capture hashes FIRST so we can embed verify links into the rendered body
  console.log(`[merge/send] Capturing ${orderedMessages.length} message hash(es)...`);
  const capturedRecords = await captureMessages(
    client,
    orderedMessages.map((m) => m.id)
  );
  console.log(`[merge/send] Captured ${capturedRecords.length} hash(es).`);

  // Build a map of messageId -> verify URL for the body builder to embed
  const verifyUrlByMessageId = new Map<string, string>();
  for (const r of capturedRecords) {
    verifyUrlByMessageId.set(r.graphMessageId, buildVerifyUrl(r.contentHash));
  }

  const mergedBody = buildMergedBody(orderedMessages, body.redactions, verifyUrlByMessageId);
  const userEmail = req.user!.email;
  const { internal, external } = classifyRecipients(body.recipients, userEmail);

  // Send via Graph (body now includes verify badges per quoted message)
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
      capturedMessages: {
        create: capturedRecords.map((r) => ({
          graphMessageId: r.graphMessageId,
          conversationId: r.conversationId,
          contentHash: r.contentHash,
          hashAlgorithm: r.hashAlgorithm,
          fromAddress: r.fromAddress,
          fromDomain: r.fromDomain,
          originalSentAt: r.originalSentAt,
          recipientCount: r.recipientCount,
          hadAttachments: r.hadAttachments,
          attachmentCount: r.attachmentCount,
        })),
      },
    },
  });

  res.json({
    success: true,
    auditLogId: auditLog.id,
    sentAt: auditLog.timestamp.toISOString(),
  });
});
