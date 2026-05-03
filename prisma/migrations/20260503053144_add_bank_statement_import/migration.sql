CREATE TABLE "BankStatementImport" (
    "id" TEXT NOT NULL,
    "paymentSourceId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "oneDriveUrl" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "rowsTotal" INTEGER NOT NULL DEFAULT 0,
    "rowsImported" INTEGER NOT NULL DEFAULT 0,
    "rowsDuplicate" INTEGER NOT NULL DEFAULT 0,
    "rowsRejected" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BankStatementImport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BankStatementImport_paymentSourceId_periodEnd_idx" ON "BankStatementImport"("paymentSourceId", "periodEnd");
CREATE INDEX "BankStatementImport_uploadedById_idx" ON "BankStatementImport"("uploadedById");

ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_paymentSourceId_fkey" FOREIGN KEY ("paymentSourceId") REFERENCES "PaymentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BankStatementImport" ADD CONSTRAINT "BankStatementImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

ALTER TABLE "Transaction" ADD COLUMN "bankStatementImportId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "dedupHash" TEXT;
CREATE UNIQUE INDEX "Transaction_dedupHash_key" ON "Transaction"("dedupHash");
CREATE INDEX "Transaction_bankStatementImportId_idx" ON "Transaction"("bankStatementImportId");
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_bankStatementImportId_fkey" FOREIGN KEY ("bankStatementImportId") REFERENCES "BankStatementImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentSource" ADD COLUMN "statementColumnMapping" JSONB;
