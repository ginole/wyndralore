-- Store the Paddle transaction id on the order so a later refund/chargeback can map back to it.
ALTER TABLE "Order" ADD COLUMN "paddleTransactionId" TEXT;
CREATE INDEX "Order_paddleTransactionId_idx" ON "Order"("paddleTransactionId");
