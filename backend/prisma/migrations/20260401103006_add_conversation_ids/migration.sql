/*
  Warnings:

  - A unique constraint covering the columns `[groupId]` on the table `ChatRoom` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[conversationId]` on the table `ChatRoom` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "conversationId" TEXT,
ADD COLUMN     "groupId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionCreatedAt" TIMESTAMP(3),
ADD COLUMN     "sessionJti" TEXT;

-- CreateTable
CREATE TABLE "CallHistory" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "peerUserId" INTEGER NOT NULL,
    "peerUsername" TEXT NOT NULL,
    "callType" TEXT NOT NULL DEFAULT 'voice',
    "callStatus" TEXT NOT NULL DEFAULT 'completed',
    "duration" INTEGER NOT NULL DEFAULT 0,
    "roomKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallHistory_userId_createdAt_idx" ON "CallHistory"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_groupId_key" ON "ChatRoom"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatRoom_conversationId_key" ON "ChatRoom"("conversationId");

-- CreateIndex
CREATE INDEX "ChatRoom_groupId_idx" ON "ChatRoom"("groupId");

-- CreateIndex
CREATE INDEX "ChatRoom_conversationId_idx" ON "ChatRoom"("conversationId");
