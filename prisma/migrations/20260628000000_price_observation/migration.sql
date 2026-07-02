-- CreateTable
CREATE TABLE "PriceObservation" (
    "id" BIGSERIAL NOT NULL,
    "tokenId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "volume24h" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PriceObservation_tokenId_observedAt_key" ON "PriceObservation"("tokenId", "observedAt");

-- CreateIndex
CREATE INDEX "PriceObservation_tokenId_idx" ON "PriceObservation"("tokenId");

-- CreateIndex
CREATE INDEX "PriceObservation_observedAt_idx" ON "PriceObservation"("observedAt");

-- CreateIndex
CREATE INDEX "PriceObservation_category_observedAt_idx" ON "PriceObservation"("category", "observedAt");
