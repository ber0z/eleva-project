/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('EVOLUTION', 'COMPARISON', 'PROFILE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isProfilePublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "username" VARCHAR(32);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" SERIAL NOT NULL,
    "type" "ShareType" NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "profileUserId" INTEGER,
    "evolutionId" INTEGER,
    "evolutionAId" INTEGER,
    "evolutionBId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_tokenHash_key" ON "ShareLink"("tokenHash");

-- CreateIndex
CREATE INDEX "ShareLink_type_ownerId_idx" ON "ShareLink"("type", "ownerId");

-- CreateIndex
CREATE INDEX "ShareLink_profileUserId_idx" ON "ShareLink"("profileUserId");

-- CreateIndex
CREATE INDEX "ShareLink_evolutionId_idx" ON "ShareLink"("evolutionId");

-- CreateIndex
CREATE INDEX "ShareLink_evolutionAId_evolutionBId_idx" ON "ShareLink"("evolutionAId", "evolutionBId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_profileUserId_fkey" FOREIGN KEY ("profileUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_evolutionId_fkey" FOREIGN KEY ("evolutionId") REFERENCES "Evolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_evolutionAId_fkey" FOREIGN KEY ("evolutionAId") REFERENCES "Evolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_evolutionBId_fkey" FOREIGN KEY ("evolutionBId") REFERENCES "Evolution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
