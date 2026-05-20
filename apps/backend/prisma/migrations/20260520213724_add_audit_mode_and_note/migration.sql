-- AlterTable
ALTER TABLE "AuditLogEntry" ADD COLUMN     "destinationThreadId" TEXT,
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'merge',
ADD COLUMN     "note" TEXT,
ADD COLUMN     "sourceThreadId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLogEntry_mode_idx" ON "AuditLogEntry"("mode");
