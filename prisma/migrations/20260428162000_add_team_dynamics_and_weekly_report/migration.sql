-- CreateTable
CREATE TABLE "WeeklyReportDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "weekStartDayKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WeeklyReportDraft_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WeeklyReportDraft_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamDynamic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "actorUserId" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "importance" TEXT NOT NULL DEFAULT 'normal',
    "occurredAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TeamDynamic_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TeamDynamicReadState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamDynamicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamDynamicReadState_teamDynamicId_fkey" FOREIGN KEY ("teamDynamicId") REFERENCES "TeamDynamic" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TeamDynamicReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WeeklyReportDraft_teamId_weekStartDayKey_updatedAt_idx" ON "WeeklyReportDraft"("teamId", "weekStartDayKey", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReportDraft_teamId_createdByUserId_weekStartDayKey_key" ON "WeeklyReportDraft"("teamId", "createdByUserId", "weekStartDayKey");

-- CreateIndex
CREATE INDEX "TeamDynamic_teamId_occurredAt_idx" ON "TeamDynamic"("teamId", "occurredAt");

-- CreateIndex
CREATE INDEX "TeamDynamic_teamId_type_occurredAt_idx" ON "TeamDynamic"("teamId", "type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamDynamic_teamId_sourceType_sourceId_key" ON "TeamDynamic"("teamId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "TeamDynamicReadState_userId_readAt_idx" ON "TeamDynamicReadState"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamDynamicReadState_teamDynamicId_userId_key" ON "TeamDynamicReadState"("teamDynamicId", "userId");
