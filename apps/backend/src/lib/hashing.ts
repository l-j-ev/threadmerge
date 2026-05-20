import { createHash } from 'crypto';

/**
 * Computes a SHA-256 hash of a message's canonical content.
 * 
 * Canonical content includes: headers (from, sent date, subject, recipients),
 * body content, and attachment binaries.
 * 
 * The output is a 64-character lowercase hex string.
 * 
 * IMPORTANT: This function defines the verifiability contract. If the canonical
 * format ever changes, all previously stored hashes become invalid. Do not
 * modify without a migration plan.
 */
export interface CanonicalAttachment {
  name: string;
  contentType: string;
  size: number;
  /** Base64-encoded content bytes from Graph. May be undefined if not yet fetched. */
  contentBytes?: string;
}

export interface HashableMessage {
  graphMessageId: string;
  conversationId?: string;
  subject: string;
  from: { name?: string; address: string };
  toRecipients: { name?: string; address: string }[];
  ccRecipients?: { name?: string; address: string }[];
  receivedDateTime: string;
  bodyContentType: 'html' | 'text';
  bodyContent: string;
  attachments: CanonicalAttachment[];
}

/**
 * Builds the canonical byte-stream representation of a message.
 * 
 * Format (UTF-8 text with explicit field markers):
 *   FROM: <address>
 *   SUBJECT: <subject>
 *   SENT: <iso timestamp>
 *   TO: <address>,<address>
 *   CC: <address>,<address>
 *   BODY_TYPE: <html|text>
 *   BODY:
 *   <body content>
 *   ATTACHMENTS: <count>
 *   ATTACHMENT_<n>_NAME: <name>
 *   ATTACHMENT_<n>_TYPE: <contentType>
 *   ATTACHMENT_<n>_SIZE: <bytes>
 *   ATTACHMENT_<n>_CONTENT:
 *   <base64 bytes>
 * 
 * Field markers ensure structural integrity - rearranging fields would produce
 * a different hash. Each section is terminated by a newline.
 */
export function buildCanonicalContent(message: HashableMessage): string {
  const lines: string[] = [];

  // Normalize: lowercase email addresses for consistent hashing
  const normalizeAddr = (addr: string) => addr.trim().toLowerCase();

  lines.push(`FROM: ${normalizeAddr(message.from.address)}`);
  lines.push(`SUBJECT: ${message.subject || ''}`);
  lines.push(`SENT: ${message.receivedDateTime}`);

  const to = (message.toRecipients || [])
    .map((r) => normalizeAddr(r.address))
    .sort()
    .join(',');
  lines.push(`TO: ${to}`);

  const cc = (message.ccRecipients || [])
    .map((r) => normalizeAddr(r.address))
    .sort()
    .join(',');
  lines.push(`CC: ${cc}`);

  lines.push(`BODY_TYPE: ${message.bodyContentType}`);
  lines.push(`BODY:`);
  lines.push(message.bodyContent || '');

  // Attachments - sorted by name for deterministic ordering
  const sortedAttachments = [...message.attachments].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  lines.push(`ATTACHMENTS: ${sortedAttachments.length}`);

  sortedAttachments.forEach((att, idx) => {
    lines.push(`ATTACHMENT_${idx}_NAME: ${att.name}`);
    lines.push(`ATTACHMENT_${idx}_TYPE: ${att.contentType}`);
    lines.push(`ATTACHMENT_${idx}_SIZE: ${att.size}`);
    lines.push(`ATTACHMENT_${idx}_CONTENT:`);
    lines.push(att.contentBytes || '');
  });

  return lines.join('\n');
}

/**
 * Computes the SHA-256 hash of a message's canonical content.
 * Returns 64-character lowercase hex.
 */
export function computeMessageHash(message: HashableMessage): string {
  const canonical = buildCanonicalContent(message);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/**
 * Extracts the domain portion from an email address.
 * "user@example.com" -> "example.com"
 */
export function extractDomain(address: string): string | null {
  const match = address.match(/@([^@]+)$/);
  return match ? match[1].toLowerCase() : null;
}

// =========================================================================
// Message capture - the entry point for hashing in production code paths
// =========================================================================

import { getMessageDetail, getAttachmentContent } from './graph';

export interface CapturedMessageRecord {
  graphMessageId: string;
  conversationId: string | null;
  contentHash: string;
  hashAlgorithm: 'sha256';
  fromAddress: string | null;
  fromDomain: string | null;
  originalSentAt: Date | null;
  recipientCount: number;
  hadAttachments: boolean;
  attachmentCount: number;
}

/**
 * Fetches a single message from Graph with all attachment binaries,
 * computes its canonical hash, and returns a record ready to be inserted
 * into the CapturedMessage table.
 *
 * NOTE: This downloads the full content of every attachment, even ones
 * the user is excluding from the outgoing email. The hash represents the
 * original message in its entirety.
 */
export async function captureMessage(
  client: any,
  graphMessageId: string
): Promise<CapturedMessageRecord> {
  const message = await getMessageDetail(client, graphMessageId);

  // Fetch all attachment binaries (needed for hashing, even if not all are included in send)
  const allAttachments = message.attachments || [];
  const hashableAttachments: CanonicalAttachment[] = [];

  for (const att of allAttachments) {
    if (att.isInline) {
      // Inline attachments (images embedded in body) - skip the binary fetch,
      // they're already part of the body content. Still record metadata.
      hashableAttachments.push({
        name: att.name,
        contentType: att.contentType,
        size: att.size,
        contentBytes: '',
      });
    } else {
      try {
        const full = await getAttachmentContent(client, graphMessageId, att.id);
        hashableAttachments.push({
          name: full.name,
          contentType: full.contentType,
          size: full.size,
          contentBytes: full.contentBytes || '',
        });
      } catch (err: any) {
        // If an attachment fails to fetch, we still hash with what we have
        // but flag it. Better than failing the entire send.
        console.warn(
          `[captureMessage] Failed to fetch attachment ${att.id} on message ${graphMessageId}: ${err.message}`
        );
        hashableAttachments.push({
          name: att.name,
          contentType: att.contentType,
          size: att.size,
          contentBytes: '',
        });
      }
    }
  }

  const hashable: HashableMessage = {
    graphMessageId: message.id,
    conversationId: message.conversationId,
    subject: message.subject || '',
    from: {
      name: message.from?.emailAddress?.name,
      address: message.from?.emailAddress?.address || '',
    },
    toRecipients: (message.toRecipients || []).map((r: any) => ({
      name: r.emailAddress?.name,
      address: r.emailAddress?.address || '',
    })),
    ccRecipients: (message.ccRecipients || []).map((r: any) => ({
      name: r.emailAddress?.name,
      address: r.emailAddress?.address || '',
    })),
    receivedDateTime: message.receivedDateTime,
    bodyContentType:
      message.body?.contentType?.toLowerCase() === 'html' ? 'html' : 'text',
    bodyContent: message.body?.content || '',
    attachments: hashableAttachments,
  };

  const contentHash = computeMessageHash(hashable);
  const fromAddress = hashable.from.address || null;
  const fromDomain = fromAddress ? extractDomain(fromAddress) : null;

  return {
    graphMessageId: message.id,
    conversationId: message.conversationId || null,
    contentHash,
    hashAlgorithm: 'sha256',
    fromAddress,
    fromDomain,
    originalSentAt: message.receivedDateTime ? new Date(message.receivedDateTime) : null,
    recipientCount:
      (message.toRecipients?.length || 0) + (message.ccRecipients?.length || 0),
    hadAttachments: allAttachments.length > 0,
    attachmentCount: allAttachments.length,
  };
}

/**
 * Captures hashes for multiple messages. Returns records in input order.
 * Failures for individual messages are logged but don't abort the batch.
 */
export async function captureMessages(
  client: any,
  graphMessageIds: string[]
): Promise<CapturedMessageRecord[]> {
  const records: CapturedMessageRecord[] = [];
  for (const id of graphMessageIds) {
    try {
      const record = await captureMessage(client, id);
      records.push(record);
    } catch (err: any) {
      console.error(
        `[captureMessages] Failed to capture message ${id}: ${err.message}`
      );
      // Continue with next - don't abort the whole batch
    }
  }
  return records;
}
