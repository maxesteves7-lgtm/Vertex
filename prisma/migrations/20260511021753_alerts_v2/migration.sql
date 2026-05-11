/*
  Warnings:

  - Added the required column `exchange` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `externalMarketId` to the `Alert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `marketQuestion` to the `Alert` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_marketId_fkey";

-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "exchange" "ExchangeName" NOT NULL,
ADD COLUMN     "externalMarketId" TEXT NOT NULL,
ADD COLUMN     "marketQuestion" TEXT NOT NULL,
ALTER COLUMN "marketId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Alert_exchange_externalMarketId_idx" ON "Alert"("exchange", "externalMarketId");

-- CreateIndex
CREATE INDEX "Alert_isActive_idx" ON "Alert"("isActive");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE SET NULL ON UPDATE CASCADE;
