-- CreateTable
CREATE TABLE "EnterpriseWechatSendLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT,
    "purpose" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "contentPreview" TEXT NOT NULL,
    "failureReason" TEXT,
    "errorMessage" TEXT,
    "httpStatus" INTEGER,
    "wechatErrcode" INTEGER,
    "wechatErrmsg" TEXT,
    "responseBodySnippet" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseWechatSendLog_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EnterpriseWechatPushEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "payloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnterpriseWechatPushEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialInvitation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "invitationType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "itemUseRecordId" TEXT,
    "wechatSendLogId" TEXT,
    "wechatWebhookSentAt" DATETIME,
    "respondedAt" DATETIME,
    "expiredAt" DATETIME,
    "rewardSettledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SocialInvitation_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SocialInvitation_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SocialInvitation_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SocialInvitation_itemUseRecordId_fkey" FOREIGN KEY ("itemUseRecordId") REFERENCES "ItemUseRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SocialInvitation_wechatSendLogId_fkey" FOREIGN KEY ("wechatSendLogId") REFERENCES "EnterpriseWechatSendLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialInvitationResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invitationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "responderUserId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "responseText" TEXT,
    "displayPayloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialInvitationResponse_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "SocialInvitation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SocialInvitationResponse_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SocialInvitationResponse_responderUserId_fkey" FOREIGN KEY ("responderUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyTaskAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "dimensionKey" TEXT NOT NULL,
    "taskCardId" TEXT NOT NULL,
    "rerollCount" INTEGER NOT NULL DEFAULT 0,
    "rerolledFromTaskCardId" TEXT,
    "completedAt" DATETIME,
    "completionText" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyTaskAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyTaskAssignment_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LotteryTicketLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LotteryTicketLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LotteryTicketLedger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExperienceLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExperienceLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ExperienceLedger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCoins" INTEGER NOT NULL,
    "totalPriceCoins" INTEGER NOT NULL,
    "dayKey" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShopPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ShopPurchase_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InventoryItem_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemUseRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "effectSnapshotJson" TEXT NOT NULL,
    "settledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ItemUseRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ItemUseRecord_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LotteryDraw" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "drawType" TEXT NOT NULL,
    "ticketSpent" INTEGER NOT NULL,
    "coinSpent" INTEGER NOT NULL DEFAULT 0,
    "guaranteeApplied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LotteryDraw_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LotteryDraw_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LotteryDrawResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "drawId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "rewardId" TEXT NOT NULL,
    "rewardTier" TEXT NOT NULL,
    "rewardKind" TEXT NOT NULL,
    "rewardSnapshotJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LotteryDrawResult_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "LotteryDraw" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RealWorldRedemption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedByUserId" TEXT,
    "confirmedAt" DATETIME,
    "cancelledByUserId" TEXT,
    "cancelledAt" DATETIME,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RealWorldRedemption_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RealWorldRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RealWorldRedemption_confirmedByUserId_fkey" FOREIGN KEY ("confirmedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RealWorldRedemption_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PunchRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT,
    "dayIndex" INTEGER NOT NULL,
    "dayKey" TEXT NOT NULL,
    "punched" BOOLEAN NOT NULL,
    "punchType" TEXT,
    "streakAfterPunch" INTEGER NOT NULL DEFAULT 0,
    "assetAwarded" INTEGER NOT NULL DEFAULT 0,
    "baseAssetAwarded" INTEGER NOT NULL DEFAULT 0,
    "boostAssetBonus" INTEGER NOT NULL DEFAULT 0,
    "baseSeasonContribution" INTEGER NOT NULL DEFAULT 0,
    "boostSeasonBonus" INTEGER NOT NULL DEFAULT 0,
    "seasonContributionAwarded" INTEGER NOT NULL DEFAULT 0,
    "boostItemUseRecordId" TEXT,
    "boostSummaryJson" TEXT,
    "countedForSeasonSlot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PunchRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PunchRecord_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PunchRecord" ("assetAwarded", "countedForSeasonSlot", "createdAt", "dayIndex", "dayKey", "id", "punchType", "punched", "seasonId", "streakAfterPunch", "userId") SELECT "assetAwarded", "countedForSeasonSlot", "createdAt", "dayIndex", "dayKey", "id", "punchType", "punched", "seasonId", "streakAfterPunch", "userId" FROM "PunchRecord";
DROP TABLE "PunchRecord";
ALTER TABLE "new_PunchRecord" RENAME TO "PunchRecord";
CREATE INDEX "PunchRecord_boostItemUseRecordId_idx" ON "PunchRecord"("boostItemUseRecordId");
CREATE UNIQUE INDEX "PunchRecord_userId_dayKey_key" ON "PunchRecord"("userId", "dayKey");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarKey" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPunchDayKey" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "ticketBalance" INTEGER NOT NULL DEFAULT 0,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "teamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarKey", "coins", "createdAt", "currentStreak", "id", "lastPunchDayKey", "password", "role", "teamId", "username") SELECT "avatarKey", "coins", "createdAt", "currentStreak", "id", "lastPunchDayKey", "password", "role", "teamId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EnterpriseWechatSendLog_teamId_createdAt_idx" ON "EnterpriseWechatSendLog"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseWechatSendLog_purpose_createdAt_idx" ON "EnterpriseWechatSendLog"("purpose", "createdAt");

-- CreateIndex
CREATE INDEX "EnterpriseWechatSendLog_targetType_targetId_idx" ON "EnterpriseWechatSendLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "EnterpriseWechatSendLog_status_createdAt_idx" ON "EnterpriseWechatSendLog"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseWechatPushEvent_eventKey_key" ON "EnterpriseWechatPushEvent"("eventKey");

-- CreateIndex
CREATE INDEX "EnterpriseWechatPushEvent_teamId_purpose_createdAt_idx" ON "EnterpriseWechatPushEvent"("teamId", "purpose", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialInvitation_itemUseRecordId_key" ON "SocialInvitation"("itemUseRecordId");

-- CreateIndex
CREATE INDEX "SocialInvitation_teamId_dayKey_status_idx" ON "SocialInvitation"("teamId", "dayKey", "status");

-- CreateIndex
CREATE INDEX "SocialInvitation_senderUserId_dayKey_idx" ON "SocialInvitation"("senderUserId", "dayKey");

-- CreateIndex
CREATE INDEX "SocialInvitation_recipientUserId_dayKey_status_idx" ON "SocialInvitation"("recipientUserId", "dayKey", "status");

-- CreateIndex
CREATE INDEX "SocialInvitationResponse_teamId_dayKey_createdAt_idx" ON "SocialInvitationResponse"("teamId", "dayKey", "createdAt");

-- CreateIndex
CREATE INDEX "SocialInvitationResponse_responderUserId_dayKey_idx" ON "SocialInvitationResponse"("responderUserId", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "SocialInvitationResponse_invitationId_responderUserId_key" ON "SocialInvitationResponse"("invitationId", "responderUserId");

-- CreateIndex
CREATE INDEX "DailyTaskAssignment_teamId_dayKey_idx" ON "DailyTaskAssignment"("teamId", "dayKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTaskAssignment_userId_dayKey_dimensionKey_key" ON "DailyTaskAssignment"("userId", "dayKey", "dimensionKey");

-- CreateIndex
CREATE INDEX "LotteryTicketLedger_userId_createdAt_idx" ON "LotteryTicketLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LotteryTicketLedger_teamId_dayKey_createdAt_idx" ON "LotteryTicketLedger"("teamId", "dayKey", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LotteryTicketLedger_sourceType_sourceId_key" ON "LotteryTicketLedger"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ExperienceLedger_userId_createdAt_idx" ON "ExperienceLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ExperienceLedger_teamId_dayKey_createdAt_idx" ON "ExperienceLedger"("teamId", "dayKey", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceLedger_sourceType_sourceId_key" ON "ExperienceLedger"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ShopPurchase_userId_dayKey_itemId_idx" ON "ShopPurchase"("userId", "dayKey", "itemId");

-- CreateIndex
CREATE INDEX "ShopPurchase_userId_weekKey_itemId_idx" ON "ShopPurchase"("userId", "weekKey", "itemId");

-- CreateIndex
CREATE INDEX "ShopPurchase_teamId_createdAt_idx" ON "ShopPurchase"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryItem_teamId_itemId_idx" ON "InventoryItem"("teamId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_userId_itemId_key" ON "InventoryItem"("userId", "itemId");

-- CreateIndex
CREATE INDEX "ItemUseRecord_userId_dayKey_status_idx" ON "ItemUseRecord"("userId", "dayKey", "status");

-- CreateIndex
CREATE INDEX "ItemUseRecord_teamId_dayKey_status_idx" ON "ItemUseRecord"("teamId", "dayKey", "status");

-- CreateIndex
CREATE INDEX "ItemUseRecord_targetType_targetId_idx" ON "ItemUseRecord"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "LotteryDraw_userId_createdAt_idx" ON "LotteryDraw"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LotteryDraw_teamId_createdAt_idx" ON "LotteryDraw"("teamId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LotteryDrawResult_drawId_position_key" ON "LotteryDrawResult"("drawId", "position");

-- CreateIndex
CREATE INDEX "RealWorldRedemption_teamId_status_requestedAt_idx" ON "RealWorldRedemption"("teamId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "RealWorldRedemption_userId_status_requestedAt_idx" ON "RealWorldRedemption"("userId", "status", "requestedAt");
