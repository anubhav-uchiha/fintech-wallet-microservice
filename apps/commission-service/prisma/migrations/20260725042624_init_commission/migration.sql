-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('ADD_MONEY', 'WITHDRAW', 'TRANSFER', 'AEPS_WITHDRAW', 'AEPS_BALANCE', 'DMT');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "commissions" (
    "id" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "minimum" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "maximum" DECIMAL(18,2) NOT NULL DEFAULT 999999,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "commissions_serviceType_key" ON "commissions"("serviceType");
