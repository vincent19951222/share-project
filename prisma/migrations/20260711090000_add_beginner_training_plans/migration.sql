CREATE TABLE "TrainingProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weeklyFrequency" INTEGER NOT NULL,
    "sessionDurationMinutes" INTEGER NOT NULL,
    "weekdaysJson" TEXT NOT NULL,
    "equipmentJson" TEXT NOT NULL,
    "avoidTagsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "startDayKey" TEXT NOT NULL,
    "endDayKey" TEXT NOT NULL,
    "profileSnapshotJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TrainingPlanDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "weekIndex" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "workoutPayloadJson" TEXT NOT NULL,
    "completedAt" DATETIME,
    "workoutRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingPlanDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TrainingPlanDay_workoutRecordId_fkey" FOREIGN KEY ("workoutRecordId") REFERENCES "WorkoutRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "TrainingPlanExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planDayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "plannedSets" INTEGER,
    "plannedReps" TEXT,
    "plannedSeconds" INTEGER,
    "restSeconds" INTEGER,
    "beginnerTip" TEXT NOT NULL,
    "homeAlternativeExerciseId" TEXT,
    "homeAlternativeName" TEXT,
    "completedAt" DATETIME,
    "actualWeightKg" REAL,
    "actualReps" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrainingPlanExercise_planDayId_fkey" FOREIGN KEY ("planDayId") REFERENCES "TrainingPlanDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "TrainingProfile_userId_key" ON "TrainingProfile"("userId");
CREATE INDEX "TrainingPlan_userId_status_createdAt_idx" ON "TrainingPlan"("userId", "status", "createdAt");
CREATE INDEX "TrainingPlan_userId_startDayKey_endDayKey_idx" ON "TrainingPlan"("userId", "startDayKey", "endDayKey");
CREATE UNIQUE INDEX "TrainingPlanDay_workoutRecordId_key" ON "TrainingPlanDay"("workoutRecordId");
CREATE UNIQUE INDEX "TrainingPlanDay_planId_dayKey_key" ON "TrainingPlanDay"("planId", "dayKey");
CREATE INDEX "TrainingPlanDay_dayKey_completedAt_idx" ON "TrainingPlanDay"("dayKey", "completedAt");
CREATE UNIQUE INDEX "TrainingPlanExercise_planDayId_sortOrder_key" ON "TrainingPlanExercise"("planDayId", "sortOrder");
CREATE INDEX "TrainingPlanExercise_exerciseId_idx" ON "TrainingPlanExercise"("exerciseId");
