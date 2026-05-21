/*
  Warnings:

  - You are about to drop the `RecipientToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "RecipientToken" DROP CONSTRAINT "RecipientToken_auditLogId_fkey";

-- DropTable
DROP TABLE "RecipientToken";
