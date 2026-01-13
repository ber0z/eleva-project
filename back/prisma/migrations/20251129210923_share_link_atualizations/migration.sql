/*
  Warnings:

  - You are about to drop the column `profileUserId` on the `ShareLink` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ShareLink" DROP CONSTRAINT "ShareLink_profileUserId_fkey";

-- DropIndex
DROP INDEX "ShareLink_profileUserId_idx";

-- AlterTable
ALTER TABLE "ShareLink" DROP COLUMN "profileUserId",
ADD COLUMN     "includeImages" BOOLEAN NOT NULL DEFAULT true;
