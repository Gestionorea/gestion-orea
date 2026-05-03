CREATE TABLE "PaymentSourceOwnership" (
    "id" TEXT NOT NULL,
    "paymentSourceId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentSourceOwnership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentSourceOwnership_paymentSourceId_companyId_key" ON "PaymentSourceOwnership"("paymentSourceId", "companyId");
CREATE INDEX "PaymentSourceOwnership_paymentSourceId_idx" ON "PaymentSourceOwnership"("paymentSourceId");
CREATE INDEX "PaymentSourceOwnership_companyId_idx" ON "PaymentSourceOwnership"("companyId");

ALTER TABLE "PaymentSourceOwnership" ADD CONSTRAINT "PaymentSourceOwnership_paymentSourceId_fkey" FOREIGN KEY ("paymentSourceId") REFERENCES "PaymentSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentSourceOwnership" ADD CONSTRAINT "PaymentSourceOwnership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PropertyOwnership" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PropertyOwnership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertyOwnership_propertyId_companyId_key" ON "PropertyOwnership"("propertyId", "companyId");
CREATE INDEX "PropertyOwnership_propertyId_idx" ON "PropertyOwnership"("propertyId");
CREATE INDEX "PropertyOwnership_companyId_idx" ON "PropertyOwnership"("companyId");

ALTER TABLE "PropertyOwnership" ADD CONSTRAINT "PropertyOwnership_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropertyOwnership" ADD CONSTRAINT "PropertyOwnership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
