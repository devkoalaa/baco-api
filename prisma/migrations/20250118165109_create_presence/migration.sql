/*
  Warnings:

  - The primary key for the `Item` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `id` on the `Item` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Item" DROP CONSTRAINT "Item_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ALTER COLUMN "quantity" SET DEFAULT 0,
ALTER COLUMN "image" DROP NOT NULL,
ALTER COLUMN "createdAt" SET DATA TYPE DATE,
ALTER COLUMN "deletedAt" SET DATA TYPE DATE,
ADD CONSTRAINT "Item_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "Gift" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT now(),
    "image" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "quantityPurchased" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATE NOT NULL,
    "deletedAt" DATE,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "acompanhantesAdultos" INTEGER NOT NULL DEFAULT 0,
    "acompanhantesCriancas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATE,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresenceGift" (
    "id" UUID NOT NULL,
    "presenceId" UUID NOT NULL,
    "giftId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PresenceGift_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PresenceGift" ADD CONSTRAINT "PresenceGift_presenceId_fkey" FOREIGN KEY ("presenceId") REFERENCES "Presence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresenceGift" ADD CONSTRAINT "PresenceGift_giftId_fkey" FOREIGN KEY ("giftId") REFERENCES "Gift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
