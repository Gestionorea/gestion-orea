-- CreateEnum
CREATE TYPE "PaymentSourceKind" AS ENUM ('card', 'bank_account', 'cash', 'other');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isAdvance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paymentSourceId" TEXT,
ADD COLUMN     "reimbursedAt" TIMESTAMP(3),
ADD COLUMN     "reimbursedById" TEXT,
ADD COLUMN     "reimbursementTransactionId" TEXT;

-- CreateTable
CREATE TABLE "PaymentSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PaymentSourceKind" NOT NULL,
    "lastDigits" TEXT,
    "isPersonal" BOOLEAN NOT NULL DEFAULT false,
    "ownerCompanyId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentSource_ownerCompanyId_idx" ON "PaymentSource"("ownerCompanyId");

-- CreateIndex
CREATE INDEX "PaymentSource_isPersonal_idx" ON "PaymentSource"("isPersonal");

-- CreateIndex
CREATE INDEX "PaymentSource_archived_idx" ON "PaymentSource"("archived");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reimbursementTransactionId_key" ON "Transaction"("reimbursementTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_paymentSourceId_idx" ON "Transaction"("paymentSourceId");

-- CreateIndex
CREATE INDEX "Transaction_isAdvance_reimbursedAt_idx" ON "Transaction"("isAdvance", "reimbursedAt");

-- AddForeignKey
ALTER TABLE "PaymentSource" ADD CONSTRAINT "PaymentSource_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentSourceId_fkey" FOREIGN KEY ("paymentSourceId") REFERENCES "PaymentSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_reimbursedById_fkey" FOREIGN KEY ("reimbursedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_reimbursementTransactionId_fkey" FOREIGN KEY ("reimbursementTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
