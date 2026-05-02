-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('taxable_qc', 'exempt', 'manual');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "taxRegime" "TaxRegime" NOT NULL DEFAULT 'taxable_qc';
UPDATE "Transaction" SET "taxRegime" = 'manual';
