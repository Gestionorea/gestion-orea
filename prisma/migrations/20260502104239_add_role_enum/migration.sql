-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'accountant', 'assistant');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'assistant';
