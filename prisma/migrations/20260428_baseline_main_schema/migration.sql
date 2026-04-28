-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "goalName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "targetSlots" INTEGER NOT NULL,
    "filledSlots" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    CONSTRAINT "Season_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SeasonMemberStat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonIncome" INTEGER NOT NULL DEFAULT 0,
    "slotContribution" INTEGER NOT NULL DEFAULT 0,
    "colorIndex" INTEGER NOT NULL,
    "memberOrder" INTEGER NOT NULL,
    "firstContributionAt" DATETIME,
    CONSTRAINT "SeasonMemberStat_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SeasonMemberStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoardNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BoardNote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BoardNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "assetAwarded" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoffeeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "CoffeeRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CoffeeRecord_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatarKey" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastPunchDayKey" TEXT,
    "coins" INTEGER NOT NULL DEFAULT 0,
    "teamId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("avatarKey", "coins", "createdAt", "id", "password", "teamId", "username") SELECT "avatarKey", "coins", "createdAt", "id", "password", "teamId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
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
    "countedForSeasonSlot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PunchRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PunchRecord_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PunchRecord" ("createdAt", "dayIndex", "id", "punchType", "punched", "userId") SELECT "createdAt", "dayIndex", "id", "punchType", "punched", "userId" FROM "PunchRecord";
DROP TABLE "PunchRecord";
ALTER TABLE "new_PunchRecord" RENAME TO "PunchRecord";
CREATE UNIQUE INDEX "PunchRecord_userId_dayKey_key" ON "PunchRecord"("userId", "dayKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Season_teamId_status_startedAt_idx" ON "Season"("teamId", "status", "startedAt");

-- CreateIndex
CREATE INDEX "SeasonMemberStat_seasonId_slotContribution_memberOrder_idx" ON "SeasonMemberStat"("seasonId", "slotContribution", "memberOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonMemberStat_seasonId_userId_key" ON "SeasonMemberStat"("seasonId", "userId");

-- CreateIndex
CREATE INDEX "BoardNote_teamId_isDeleted_pinned_createdAt_idx" ON "BoardNote"("teamId", "isDeleted", "pinned", "createdAt");

-- CreateIndex
CREATE INDEX "BoardNote_authorId_idx" ON "BoardNote"("authorId");

-- CreateIndex
CREATE INDEX "ActivityEvent_teamId_createdAt_idx" ON "ActivityEvent"("teamId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_createdAt_idx" ON "ActivityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CoffeeRecord_teamId_dayKey_createdAt_idx" ON "CoffeeRecord"("teamId", "dayKey", "createdAt");

-- CreateIndex
CREATE INDEX "CoffeeRecord_userId_dayKey_createdAt_idx" ON "CoffeeRecord"("userId", "dayKey", "createdAt");
