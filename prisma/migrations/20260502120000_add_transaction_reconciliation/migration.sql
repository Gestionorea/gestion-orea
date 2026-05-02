-- Ajout du suivi de reconciliation comptable sur les transactions.
ALTER TABLE "Transaction"
  ADD COLUMN "reconciledAt" TIMESTAMP(3),
  ADD COLUMN "reconciledById" TEXT;

CREATE INDEX "Transaction_reconciledAt_idx" ON "Transaction"("reconciledAt");

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_reconciledById_fkey"
  FOREIGN KEY ("reconciledById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
