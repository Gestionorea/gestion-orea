CREATE TABLE "InteracContact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultCategoryId" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InteracContact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InteracContact_name_key" ON "InteracContact"("name");
CREATE INDEX "InteracContact_defaultCategoryId_idx" ON "InteracContact"("defaultCategoryId");

ALTER TABLE "InteracContact" ADD CONSTRAINT "InteracContact_defaultCategoryId_fkey" FOREIGN KEY ("defaultCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
