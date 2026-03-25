-- AlterTable
ALTER TABLE "ChatRoom" ADD COLUMN     "ownerUserId" INTEGER,
ADD COLUMN     "ownerUsername" TEXT;

-- CreateIndex
CREATE INDEX "ChatRoom_ownerUserId_idx" ON "ChatRoom"("ownerUserId");
