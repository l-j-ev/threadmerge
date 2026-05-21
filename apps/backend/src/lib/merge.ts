import { Message, EmailAddress, Redaction, MergeWarning } from '@threadmerge/shared';

/**
 * HTML escapes a string for safe insertion into the merged email body.
 */
function escapeHtml(str: string | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Applies redactions to a message body. Redactions are stored as offsets
 * relative to the message body, with a replacement string.
 */
function applyRedactions(content: string, messageRedactions: Redaction[]): string {
  if (messageRedactions.length === 0) return content;

  // Sort by startOffset descending so we can apply right-to-left
  // (so earlier offsets aren't invalidated by edits)
  const sorted = [...messageRedactions].sort((a, b) => b.startOffset - a.startOffset);

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
 * Builds a single merged HTML email body from a curated set of messages.
 */
export function buildMergedBody(
  messagesInOrder: Message[],
  redactions: Redaction[],
  verifyUrlByMessageId?: Map<string, string>
): string {
  const redactionsByMessageId = new Map<string, Redaction[]>();
  for (const r of redactions) {
    if (!redactionsByMessageId.has(r.messageId)) {
      redactionsByMessageId.set(r.messageId, []);
    }
    redactionsByMessageId.get(r.messageId)!.push(r);
  }

  let html = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 720px;">
      <div style="background: #f0f0f0; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px;">
        <strong>Merged conversation history</strong><br>
        <span style="font-size: 12px; color: #666;">
          Combined from email threads on ${new Date().toLocaleString('en-GB')}
        </span>
      </div>
  `;

  for (const msg of messagesInOrder) {
    const fromName = msg.from?.emailAddress?.name || 'Unknown';
    const fromAddress = msg.from?.emailAddress?.address || '';
    const date = new Date(msg.receivedDateTime).toLocaleString('en-GB');
    const toList = (msg.toRecipients || [])
      .map(
        (r) =>
          `${escapeHtml(r.emailAddress.name)} &lt;${escapeHtml(r.emailAddress.address)}&gt;`
      )
      .join(', ');

    const msgRedactions = redactionsByMessageId.get(msg.id) || [];
    const rawContent =
      msg.body.contentType === 'html'
        ? msg.body.content
        : `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(msg.body.content)}</pre>`;
    const bodyContent = applyRedactions(rawContent, msgRedactions);

    const verifyUrl = verifyUrlByMessageId?.get(msg.id);
    const verifyBadge = verifyUrl
      ? `<div style="margin: 8px 0;"><a href="${escapeHtml(verifyUrl)}" style="display:inline-block; font-size:11px; color:#5b6cff; text-decoration:none; padding:3px 10px; border:1px solid #c5cdff; border-radius:4px; background:#f5f7ff;">🔒 Verified by Nootro · verify this message</a></div>`
      : '';

    html += `
      <div style="border-left: 3px solid #0078d4; padding: 10px 14px; margin: 14px 0; background: #fafafa;">
        <div style="font-size: 13px; color: #666; margin-bottom: 10px; line-height: 1.5;">
          <strong>From:</strong> ${escapeHtml(fromName)} &lt;${escapeHtml(fromAddress)}&gt;<br>
          <strong>To:</strong> ${toList}<br>
          <strong>Date:</strong> ${escapeHtml(date)}
        </div>
        ${verifyBadge}
        <div style="font-size: 14px;">
          ${bodyContent}
        </div>
      </div>
    `;
  }

  html += `
      <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 11px; color: #999; text-align: center;">
        Sent with Nootro
      </div>
    </div>
  `;

  return html;
}

/**
 * Builds a deduplicated list of all unique recipients across the given messages.
 * Includes To, Cc, and senders from the source threads.
 * Excludes the current user's own address (they're sending, not receiving).
 */
export function collectRecipients(
  messages: Message[],
  excludeAddress?: string
): EmailAddress[] {
  const seen = new Map<string, EmailAddress>();
  const exclude = excludeAddress?.toLowerCase();

  for (const msg of messages) {
    const recipients: EmailAddress[] = [
      ...(msg.toRecipients || []).map((r) => r.emailAddress),
      ...((msg.ccRecipients || []).map((r) => r.emailAddress)),
    ];
    if (msg.from) recipients.push(msg.from.emailAddress);

    for (const r of recipients) {
      const addr = r.address.toLowerCase();
      if (exclude && addr === exclude) continue;
      if (!seen.has(addr)) {
        seen.set(addr, r);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Splits recipients into internal vs external based on the user's email domain.
 */
export function classifyRecipients(
  recipients: EmailAddress[],
  userEmail: string
): { internal: EmailAddress[]; external: EmailAddress[] } {
  const userDomain = userEmail.split('@')[1]?.toLowerCase();
  if (!userDomain) {
    return { internal: [], external: recipients };
  }

  const internal: EmailAddress[] = [];
  const external: EmailAddress[] = [];

  for (const r of recipients) {
    const domain = r.address.split('@')[1]?.toLowerCase();
    if (domain === userDomain) {
      internal.push(r);
    } else {
      external.push(r);
    }
  }

  return { internal, external };
}

/**
 * Detects potentially risky merge configurations and returns warnings.
 */
export function detectWarnings(
  messagesInOrder: Message[],
  finalRecipients: EmailAddress[],
  userEmail: string
): MergeWarning[] {
  const warnings: MergeWarning[] = [];
  const { internal, external } = classifyRecipients(finalRecipients, userEmail);

  // Warning: all recipients are external (likely sharing internal content externally)
  if (internal.length === 0 && external.length > 0) {
    warnings.push({
      type: 'all_external_recipients',
      message:
        'All recipients are external. Make sure any internal context has been redacted or excluded.',
    });
  }

  // Warning: cross-recipient disclosure
  // For each message, check if its original recipients are different from finalRecipients
  for (const msg of messagesInOrder) {
    const originalAddresses = new Set(
      [
        ...(msg.toRecipients || []).map((r) => r.emailAddress.address.toLowerCase()),
        ...((msg.ccRecipients || []).map((r) => r.emailAddress.address.toLowerCase())),
        msg.from?.emailAddress?.address?.toLowerCase(),
      ].filter(Boolean) as string[]
    );

    const newRecipients = finalRecipients.filter(
      (r) => !originalAddresses.has(r.address.toLowerCase())
    );

    if (newRecipients.length > 0) {
      const fromName = msg.from?.emailAddress?.name || 'Unknown';
      const date = new Date(msg.receivedDateTime).toLocaleDateString('en-GB');
      warnings.push({
        type: 'cross_recipient_disclosure',
        message: `${fromName}'s message from ${date} will now be visible to recipients who weren't on the original thread (${newRecipients.map((r) => r.address).join(', ')}).`,
        affectedMessageIds: [msg.id],
      });
    }
  }

  return warnings;
}
