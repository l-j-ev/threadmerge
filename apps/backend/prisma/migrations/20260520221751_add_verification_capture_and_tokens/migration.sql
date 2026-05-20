-- CreateTable
CREATE TABLE "CapturedMessage" (
    "id" TEXT NOT NULL,
    "auditLogId" TEXT NOT NULL,
    "graphMessageId" TEXT NOT NULL,
    "conversationId" TEXT,
    "contentHash" TEXT NOT NULL,
    "hashAlgorithm" TEXT NOT NULL DEFAULT 'sha256',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fromAddress" TEXT,
    "fromDomain" TEXT,
    "originalSentAt" TIMESTAMP(3),
    "recipientCount" INTEGER,
    "hadAttachments" BOOLEAN NOT NULL DEFAULT false,
    "attachmentCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CapturedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipientToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "auditLogId" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipientToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CapturedMessage_contentHash_key" ON "CapturedMessage"("contentHash");

-- CreateIndex
CREATE INDEX "CapturedMessage_contentHash_idx" ON "CapturedMessage"("contentHash");

-- CreateIndex
CREATE INDEX "CapturedMessage_auditLogId_idx" ON "CapturedMessage"("auditLogId");

-- CreateIndex
CREATE UNIQUE INDEX "RecipientToken_token_key" ON "RecipientToken"("token");

-- CreateIndex
CREATE INDEX "RecipientToken_token_idx" ON "RecipientToken"("token");

-- CreateIndex
CREATE INDEX "RecipientToken_auditLogId_idx" ON "RecipientToken"("auditLogId");

-- AddForeignKey
ALTER TABLE "CapturedMessage" ADD CONSTRAINT "CapturedMessage_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "AuditLogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipientToken" ADD CONSTRAINT "RecipientToken_auditLogId_fkey" FOREIGN KEY ("auditLogId") REFERENCES "AuditLogEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
