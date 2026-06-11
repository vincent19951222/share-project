CREATE TABLE "WorkoutRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "punchRecordId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "trainingType" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkoutRecord_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkoutRecord_punchRecordId_fkey" FOREIGN KEY ("punchRecordId") REFERENCES "PunchRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "WorkoutEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutRecordId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutEntry_workoutRecordId_fkey" FOREIGN KEY ("workoutRecordId") REFERENCES "WorkoutRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "WorkoutRecord_punchRecordId_key" ON "WorkoutRecord"("punchRecordId");
CREATE INDEX "WorkoutRecord_userId_dayKey_idx" ON "WorkoutRecord"("userId", "dayKey");
CREATE INDEX "WorkoutRecord_teamId_dayKey_idx" ON "WorkoutRecord"("teamId", "dayKey");
CREATE UNIQUE INDEX "WorkoutEntry_workoutRecordId_category_code_key" ON "WorkoutEntry"("workoutRecordId", "category", "code");
CREATE INDEX "WorkoutEntry_category_code_idx" ON "WorkoutEntry"("category", "code");
