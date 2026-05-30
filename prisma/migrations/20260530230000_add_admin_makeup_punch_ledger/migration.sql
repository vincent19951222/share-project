CREATE TABLE "AdminMakeupPunchLedger" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "punchRecordId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "rewardAwarded" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminMakeupPunchLedger_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdminMakeupPunchLedger_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdminMakeupPunchLedger_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AdminMakeupPunchLedger_punchRecordId_fkey" FOREIGN KEY ("punchRecordId") REFERENCES "PunchRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AdminMakeupPunchLedger_punchRecordId_key" ON "AdminMakeupPunchLedger"("punchRecordId");
CREATE INDEX "AdminMakeupPunchLedger_teamId_monthKey_createdAt_idx" ON "AdminMakeupPunchLedger"("teamId", "monthKey", "createdAt");
CREATE INDEX "AdminMakeupPunchLedger_targetUserId_dayKey_idx" ON "AdminMakeupPunchLedger"("targetUserId", "dayKey");
CREATE INDEX "AdminMakeupPunchLedger_adminUserId_createdAt_idx" ON "AdminMakeupPunchLedger"("adminUserId", "createdAt");
