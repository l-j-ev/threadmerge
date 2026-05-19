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
