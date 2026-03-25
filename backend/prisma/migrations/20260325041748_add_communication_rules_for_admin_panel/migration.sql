-- CreateTable
CREATE TABLE "CommunicationRule" (
    "id" TEXT NOT NULL,
    "fromUsername" TEXT NOT NULL,
    "toUsername" TEXT NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationRule_fromUsername_idx" ON "CommunicationRule"("fromUsername");

-- CreateIndex
CREATE INDEX "CommunicationRule_toUsername_idx" ON "CommunicationRule"("toUsername");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationRule_fromUsername_toUsername_key" ON "CommunicationRule"("fromUsername", "toUsername");
