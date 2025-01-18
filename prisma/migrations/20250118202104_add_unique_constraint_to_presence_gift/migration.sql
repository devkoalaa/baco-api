/*
  Warnings:

  - A unique constraint covering the columns `[presenceId,giftId]` on the table `PresenceGift` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PresenceGift_presenceId_giftId_key" ON "PresenceGift"("presenceId", "giftId");
