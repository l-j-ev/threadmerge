// =========================================================================
// Email and conversation types (mirror what Microsoft Graph returns)
// =========================================================================

export interface EmailAddress {
  name: string;
  address: string;
}

export interface MessageBody {
  contentType: 'html' | 'text';
  content: string;
}

export interface Message {
  id: string;
  conversationId?: string;
  subject: string;
  from: { emailAddress: EmailAddress };
  toRecipients: { emailAddress: EmailAddress }[];
  ccRecipients?: { emailAddress: EmailAddress }[];
  receivedDateTime: string;
  body: MessageBody;
  bodyPreview?: string;
}

export interface ConversationSummary {
  conversationId: string;
  subject: string;
  latestMessage: Message;
  messageCount: number;
}

// =========================================================================
// Merge request and response types
// =========================================================================

export interface Redaction {
  messageId: string;
  startOffset: number;
  endOffset: number;
  originalLength: number;
  replacement: string; // e.g., "[redacted]"
}

export interface MergePreviewRequest {
  threadAId: string;
  threadBId: string;
  includedMessageIds: string[];
  messageOrder: string[]; // ordered list of message IDs as they should appear
  redactions: Redaction[];
}

export interface MergePreviewResponse {
  mergedBody: string;
  recipients: EmailAddress[];
  internalRecipients: EmailAddress[];
  externalRecipients: EmailAddress[];
  warnings: MergeWarning[];
}

export interface MergeWarning {
  type: 'cross_recipient_disclosure' | 'large_redaction' | 'all_external_recipients';
  message: string;
  affectedMessageIds?: string[];
}

export interface MergeSendRequest extends MergePreviewRequest {
  subject: string;
  recipients: EmailAddress[];
}

export interface MergeSendResponse {
  success: boolean;
  auditLogId: string;
  sentAt: string;
}

// =========================================================================
// User, tenant, and audit log types
// =========================================================================

export interface UserDto {
  id: string;
  azureUserId: string;
  email: string;
  displayName: string | null;
  tenantId: string;
}

export interface TenantDto {
  id: string;
  azureTenantId: string;
  displayName: string | null;
}

export interface AuditLogDto {
  id: string;
  userId: string;
  userEmail?: string;
  tenantId: string;
  timestamp: string;
  threadASubject: string | null;
  threadBSubject: string | null;
  includedMessageCount: number;
  excludedMessageCount: number;
  redactionCount: number;
  recipientCount: number;
  internalRecipientCount: number;
  externalRecipientCount: number;
  recipientAddresses: string[];
  subject: string;
}

// =========================================================================
// Template types
// =========================================================================

export interface TemplateDto {
  id: string;
  name: string;
  description: string | null;
  isShared: boolean;
  redactionRules: RedactionRule[];
  createdAt: string;
  updatedAt: string;
}

export interface RedactionRule {
  pattern: string; // regex or literal
  isRegex: boolean;
  replacement: string;
  description?: string;
}

// =========================================================================
// Inject mode types (add an email to a running thread)
// =========================================================================

export interface MessageAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

export interface MessageSummary {
  id: string;
  conversationId: string;
  subject: string;
  from: { emailAddress: EmailAddress };
  receivedDateTime: string;
  bodyPreview: string;
  hasAttachments: boolean;
}

export interface MessageDetail extends Message {
  hasAttachments: boolean;
  attachments: MessageAttachment[];
}

export interface InjectPreviewRequest {
  sourceMessageId: string;
  destThreadId: string;
  replyToMessageId: string;
  note: string;
  redactions: Redaction[];
  includedAttachmentIds: string[];
  recipients: EmailAddress[];
}

export interface InjectPreviewResponse {
  // The HTML that will form the reply body (your note + quoted source)
  replyBody: string;
  // Subject auto-derived from the destination thread
  subject: string;
  // Recipients (echoed back from request, classified)
  recipients: EmailAddress[];
  internalRecipients: EmailAddress[];
  externalRecipients: EmailAddress[];
  warnings: { code: string; message: string }[];
  // Attachment summaries for preview UI
  attachments: MessageAttachment[];
}

export interface InjectSendRequest extends InjectPreviewRequest {
  subject: string;
}

export interface InjectSendResponse {
  sentAt: string;
  auditLogId: string;
}
