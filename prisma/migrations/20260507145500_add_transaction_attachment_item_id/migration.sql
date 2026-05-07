-- Store the verified Microsoft Graph driveItem id for linked OneDrive invoices.
ALTER TABLE "Transaction" ADD COLUMN "attachmentItemId" TEXT;

CREATE INDEX "Transaction_attachmentItemId_idx" ON "Transaction"("attachmentItemId");
