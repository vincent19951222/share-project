# 新手四周训练计划实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有健身打卡页中加入一套面向减脂新手的固定四周训练计划，支持模板匹配、今日计划、动作完成记录，并复用现有打卡和奖励结算。

**Architecture:** 动作目录与九套固定模板以版本化 JSON 保存，用户创建计划时将模板解析为数据库快照。`BoardSnapshot` 携带当前计划，创建计划使用独立 API，完成训练则通过现有 `/api/board/punch` 的 POST/PATCH 事务同时写入训练计划完成状态，避免第二套打卡或奖励逻辑。

**Tech Stack:** Next.js 15 App Router、React 19、TypeScript strict、Prisma 7 + SQLite、Vitest + jsdom、Tailwind CSS v4。

---

## 实施边界

本计划只实现设计文档 `docs/superpowers/specs/2026-07-11-beginner-training-plan-design.md` 的第一版：

- 固定四周模板，不使用 LLM。
- 周一错过不影响周二到周日。
- 不做顺延、补课、疲劳调整或饮食建议。
- 不增加第五个导航。
- 不改个人菜单中的 AI 生图入口。
- 不加入团队挑战。
- 不迁移动作图片或 GIF。
- 计划从创建日所在周的下一个周一开始；若创建日是周一，则从当天开始。

最后一条是实施期的明确日期规则：避免半周计划，同时让周一创建的用户可以立即开始。

## 文件结构

### 内容基础

- Create `content/training/exercises.v1.json`: 100 至 150 个无媒体字段的新手动作目录。
- Create `content/training/templates.v1.json`: 2/3/4 天 × 30/45/60 分钟的九套四周模板。
- Create `lib/training-plan/content.ts`: 内容类型、运行时校验、模板查询和动作查询。
- Create `scripts/import-beginner-exercises.ts`: 从外部 `exercises.json` 导入并筛选动作文本数据。
- Create `scripts/build-beginner-training-templates.ts`: 构建并写入固定模板 JSON。
- Modify `package.json`: 增加内容导入和模板构建脚本。
- Create `__tests__/training-plan-content.test.ts`: 校验动作数量、媒体边界、模板矩阵和引用完整性。

### 持久化与领域服务

- Modify `prisma/schema.prisma`: 增加训练档案、计划、计划日和计划动作模型，并关联 `WorkoutRecord`。
- Create `prisma/migrations/20260711090000_add_beginner_training_plans/migration.sql`: 新增表、索引和外键。
- Create `lib/training-plan/domain.ts`: 输入解析、日期规则、状态推导和快照类型辅助。
- Create `lib/training-plan/service.ts`: 创建计划、读取计划和构建快照。
- Create `lib/training-plan/completion.ts`: 在打卡事务中完成或撤销计划日。
- Modify `lib/workouts.ts`: 让现有训练 payload 接受模板使用的 45 分钟和动感单车。
- Create `__tests__/training-plan-domain.test.ts`: 日期与状态纯函数测试。
- Create `__tests__/training-plan-service.test.ts`: 数据库创建、快照和模板不变性测试。

### API 与现有打卡集成

- Create `app/api/training-plan/route.ts`: 创建当前用户的四周计划。
- Modify `app/api/board/punch/route.ts`: 接受可选计划完成信息，并在 POST/PATCH/DELETE 中同步计划状态。
- Modify `lib/api.ts`: 增加创建计划 API，并扩展打卡请求类型。
- Modify `lib/types.ts`: 增加训练计划快照类型和 `BoardSnapshot.currentTrainingPlan`。
- Modify `lib/board-state.ts`: 将当前计划加入打卡页快照。
- Modify `lib/store.tsx`: 远端快照同步时更新计划和今日训练明细。
- Create `__tests__/training-plan-api.test.ts`: 创建计划 API 测试。
- Create `__tests__/training-plan-punch-integration.test.ts`: 计划完成、重复提交、已打卡更新和撤销测试。
- Modify `__tests__/board-state.test.ts`: 快照携带训练计划。
- Modify `__tests__/board-provider-sync.test.tsx`: 轮询和打卡响应正确替换训练计划状态。

### 界面

- Create `components/training-plan/TrainingPlanCard.tsx`: 健身打卡页中的紧凑今日计划卡。
- Create `components/training-plan/TrainingPlanSetupDialog.tsx`: 创建计划表单。
- Create `components/training-plan/TrainingPlanDetailDialog.tsx`: 当前周、四周总览和今日训练容器。
- Create `components/training-plan/TrainingSessionView.tsx`: 动作勾选、可选重量次数和完成操作。
- Modify `components/punch-board/PunchBoard.tsx`: 在团队信息与打卡表格之间插入今日计划卡。
- Modify `app/globals.css`: 新增训练计划卡、弹层和移动端样式。
- Create `__tests__/training-plan-card.test.tsx`: 今日、休息、错过和无计划状态。
- Create `__tests__/training-plan-setup.test.tsx`: 表单校验和创建请求。
- Create `__tests__/training-session-view.test.tsx`: 动作完成和现有打卡联动。
- Modify `__tests__/home-ui-punch-scene.test.tsx`: 主场景包含训练计划卡且原有区域仍存在。

---

### Task 1: 动作目录与模板内容基础

**Files:**
- Create: `content/training/exercises.v1.json`
- Create: `content/training/templates.v1.json`
- Create: `lib/training-plan/content.ts`
- Create: `scripts/import-beginner-exercises.ts`
- Create: `scripts/build-beginner-training-templates.ts`
- Modify: `package.json`
- Test: `__tests__/training-plan-content.test.ts`

- [ ] **Step 1: 写内容校验失败测试**

创建 `__tests__/training-plan-content.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  exerciseCatalog,
  getExerciseById,
  trainingTemplates,
  validateTrainingContent,
} from "@/lib/training-plan/content";

describe("beginner training content", () => {
  it("ships a media-free beginner exercise catalog", () => {
    expect(exerciseCatalog.length).toBeGreaterThanOrEqual(100);
    expect(exerciseCatalog.length).toBeLessThanOrEqual(150);
    expect(new Set(exerciseCatalog.map((exercise) => exercise.id)).size).toBe(
      exerciseCatalog.length,
    );

    for (const exercise of exerciseCatalog) {
      expect(exercise.nameZh.length).toBeGreaterThan(0);
      expect(exercise.instructionsZh.length).toBeGreaterThan(0);
      expect(exercise).not.toHaveProperty("image");
      expect(exercise).not.toHaveProperty("gif_url");
      expect(exercise).not.toHaveProperty("gifUrl");
    }
  });

  it("ships the complete nine-template matrix", () => {
    expect(trainingTemplates).toHaveLength(9);
    expect(
      trainingTemplates.map((template) => [
        template.weeklyFrequency,
        template.durationMinutes,
      ]),
    ).toEqual([
      [2, 30], [2, 45], [2, 60],
      [3, 30], [3, 45], [3, 60],
      [4, 30], [4, 45], [4, 60],
    ]);
  });

  it("contains four complete weeks and only references catalog exercises", () => {
    expect(validateTrainingContent()).toEqual({ ok: true, errors: [] });

    for (const template of trainingTemplates) {
      expect(template.weeks).toHaveLength(4);
      for (const week of template.weeks) {
        expect(week.sessions).toHaveLength(template.weeklyFrequency);
        for (const session of week.sessions) {
        expect(session.estimatedMinutes).toBe(template.durationMinutes);
        for (const item of session.exercises) {
          const exercise = getExerciseById(item.exerciseId);
          expect(exercise).not.toBeNull();
          if (item.phase === "main" && exercise?.equipment !== "body weight") {
            expect(exercise?.homeAlternativeId).not.toBeNull();
            expect(getExerciseById(exercise!.homeAlternativeId!)).not.toBeNull();
          }
        }
      }
    }
    }
  });
});
```

- [ ] **Step 2: 运行测试确认缺少内容模块**

Run:

```bash
npm test -- __tests__/training-plan-content.test.ts
```

Expected: FAIL，提示无法解析 `@/lib/training-plan/content`。

- [ ] **Step 3: 实现内容类型和运行时校验**

创建 `lib/training-plan/content.ts`，直接导入两份 JSON，并定义以下公开契约：

```ts
import exercisesJson from "@/content/training/exercises.v1.json";
import templatesJson from "@/content/training/templates.v1.json";

export type TrainingFrequency = 2 | 3 | 4;
export type TrainingDuration = 30 | 45 | 60;
export type TrainingPhase = "warmup" | "main" | "cardio" | "cooldown";

export interface ExerciseCatalogEntry {
  id: string;
  source: "hasaneyldrm/exercises-dataset";
  sourceId: string;
  nameEn: string;
  nameZh: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  instructionsZh: string;
  difficulty: "beginner";
  movementPattern: string;
  avoidTags: string[];
  beginnerTip: string;
  homeAlternativeId: string | null;
}

export interface TrainingTemplateExercise {
  exerciseId: string;
  phase: TrainingPhase;
  sets: number | null;
  reps: string | null;
  seconds: number | null;
  restSeconds: number | null;
}

export interface TrainingTemplateSession {
  slot: number;
  title: string;
  estimatedMinutes: TrainingDuration;
  exercises: TrainingTemplateExercise[];
}

export interface TrainingTemplateWeek {
  weekIndex: 1 | 2 | 3 | 4;
  sessions: TrainingTemplateSession[];
}

export interface TrainingTemplate {
  id: string;
  version: 1;
  goal: "beginner-fat-loss";
  weeklyFrequency: TrainingFrequency;
  durationMinutes: TrainingDuration;
  weeks: TrainingTemplateWeek[];
}

export const exerciseCatalog = exercisesJson as ExerciseCatalogEntry[];
export const trainingTemplates = templatesJson as TrainingTemplate[];

const exercisesById = new Map(exerciseCatalog.map((item) => [item.id, item]));

export function getExerciseById(id: string): ExerciseCatalogEntry | null {
  return exercisesById.get(id) ?? null;
}

export function getTrainingTemplate(
  weeklyFrequency: TrainingFrequency,
  durationMinutes: TrainingDuration,
): TrainingTemplate | null {
  return (
    trainingTemplates.find(
      (item) =>
        item.weeklyFrequency === weeklyFrequency &&
        item.durationMinutes === durationMinutes,
    ) ?? null
  );
}

export function validateTrainingContent(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const matrixKeys = new Set<string>();

  for (const template of trainingTemplates) {
    const matrixKey = `${template.weeklyFrequency}:${template.durationMinutes}`;
    if (matrixKeys.has(matrixKey)) errors.push(`duplicate-template:${matrixKey}`);
    matrixKeys.add(matrixKey);
    if (template.weeks.length !== 4) errors.push(`invalid-week-count:${template.id}`);

    for (const week of template.weeks) {
      if (week.sessions.length !== template.weeklyFrequency) {
        errors.push(`invalid-session-count:${template.id}:${week.weekIndex}`);
      }
      for (const session of week.sessions) {
        if (session.estimatedMinutes !== template.durationMinutes) {
          errors.push(`invalid-duration:${template.id}:${week.weekIndex}:${session.slot}`);
        }
        for (const item of session.exercises) {
          if (!exercisesById.has(item.exerciseId)) {
            errors.push(`missing-exercise:${template.id}:${item.exerciseId}`);
          }
        }
      }
    }
  }

  if (matrixKeys.size !== 9) errors.push("incomplete-template-matrix");
  return { ok: errors.length === 0, errors };
}
```

- [ ] **Step 4: 增加动作导入脚本**

创建 `scripts/import-beginner-exercises.ts`。脚本接收 `--source` 和 `--output`，只读取文本字段，使用固定器械白名单、身体部位配额和高难度名称黑名单，将结果稳定排序后输出 120 条记录。脚本必须明确删除 `image`、`gif_url`、`media_id` 和 `attribution`。

关键入口必须为：

```ts
const args = process.argv.slice(2);
const sourcePath = readFlag(args, "--source");
const outputPath = readFlag(
  args,
  "--output",
  "content/training/exercises.v1.json",
);

if (!sourcePath) {
  throw new Error("missing --source <exercises.json>");
}

const source = JSON.parse(readFileSync(sourcePath, "utf8")) as SourceExercise[];
const selected = selectBeginnerExercises(source);

if (selected.length !== 120) {
  throw new Error(`expected 120 beginner exercises, got ${selected.length}`);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(selected, null, 2)}\n`);
```

选择策略使用这些常量，不得抓取远程媒体：

```ts
const EQUIPMENT_PRIORITY = [
  "body weight",
  "dumbbell",
  "cable",
  "leverage machine",
  "barbell",
  "sled machine",
  "elliptical machine",
  "stationary bike",
] as const;

const BODY_PART_QUOTAS: Record<string, number> = {
  "upper legs": 24,
  back: 18,
  chest: 16,
  shoulders: 14,
  waist: 20,
  "upper arms": 12,
  "lower legs": 8,
  cardio: 8,
};

const ADVANCED_NAME_PATTERN =
  /handstand|planche|muscle-up|plyo|pistol|snatch|clean and jerk|single arm push-up|superman push-up/i;

const REQUIRED_TEMPLATE_SOURCE_IDS = new Set([
  "0025", "0085", "0241", "0274", "0276", "0289", "0294", "0334",
  "0405", "0585", "0599", "0739", "0818", "0861", "0872", "1350",
  "1385", "1760", "2138", "2141", "3666",
]);
```

筛选时先纳入 `REQUIRED_TEMPLATE_SOURCE_IDS`，再按身体部位配额补齐 120 条，保证模板不会引用被配额挤出的动作。中文名称优先使用脚本内的常见动作覆盖表；没有覆盖时先保留规范化英文名称，同时生成 `docs/training/exercise-catalog-review-v1.md` 供本任务内人工检查。检查必须逐条确认名称、说明、难度和居家替代；不合格项通过脚本内固定 `EXCLUDED_SOURCE_IDS` 替换，英文占位名通过 `NAME_ZH_OVERRIDES` 补齐后重新生成，最终报告不得包含英文占位名或“待确认”状态。

模板使用的非徒手主动作必须在脚本内的 `HOME_ALTERNATIVE_BY_SOURCE_ID` 映射到一个已纳入目录的徒手动作；没有安全替代的动作不得进入模板。

- [ ] **Step 5: 增加固定模板构建脚本**

创建 `scripts/build-beginner-training-templates.ts`。模板生成器只在开发阶段执行，输出是固定 JSON；线上不得实时拼装动作。

模板必须使用以下稳定会话骨架：

```ts
const SESSION_BLUEPRINTS = {
  fullBodyA: ["2141", "0739", "0025", "0861", "0276"],
  fullBodyB: ["2138", "0085", "0818", "0405", "0274"],
  fullBodyC: ["3666", "1760", "0289", "1350", "0872"],
  upperA: ["2141", "0025", "0861", "0334", "0241", "0276"],
  lowerA: ["2138", "0739", "0599", "0585", "0274"],
  upperB: ["2141", "0289", "0818", "0405", "0294", "0872"],
  lowerB: ["3666", "0085", "1760", "1385", "0276"],
} as const;

const WEEK_PROGRESSION = [
  { weekIndex: 1, mainSets: 2, reps: "10" },
  { weekIndex: 2, mainSets: 2, reps: "12" },
  { weekIndex: 3, mainSets: 3, reps: "10" },
  { weekIndex: 4, mainSets: 3, reps: "10" },
] as const;
```

频率映射固定为：

```ts
const FREQUENCY_BLUEPRINTS = {
  2: ["fullBodyA", "fullBodyB"],
  3: ["fullBodyA", "fullBodyB", "fullBodyC"],
  4: ["upperA", "lowerA", "upperB", "lowerB"],
} as const;
```

30 分钟保留热身、有氧和 4 个主训练项；45 分钟保留 5 个主训练项；60 分钟保留全部动作并增加固定放松项。输出顺序必须为 2/3/4 天，再按 30/45/60 分钟排序。

- [ ] **Step 6: 增加 package 脚本并生成内容**

在 `package.json` 的 `scripts` 中增加：

```json
"training:import-exercises": "tsx scripts/import-beginner-exercises.ts",
"training:build-templates": "tsx scripts/build-beginner-training-templates.ts"
```

执行：

```bash
rm -rf /tmp/exercises-dataset-training-plan
git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset.git /tmp/exercises-dataset-training-plan
npm run training:import-exercises -- --source /tmp/exercises-dataset-training-plan/data/exercises.json
npm run training:build-templates
```

Expected: 生成 `exercises.v1.json` 120 条和 `templates.v1.json` 9 套，且输出中不包含媒体路径字段。

- [ ] **Step 7: 运行内容测试**

Run:

```bash
npm test -- __tests__/training-plan-content.test.ts
```

Expected: PASS。

- [ ] **Step 8: 提交内容基础**

```bash
git add package.json content/training lib/training-plan/content.ts scripts/import-beginner-exercises.ts scripts/build-beginner-training-templates.ts docs/training/exercise-catalog-review-v1.md __tests__/training-plan-content.test.ts
git commit -m "feat: add beginner training plan content"
```

---

### Task 2: Prisma 训练计划模型

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260711090000_add_beginner_training_plans/migration.sql`
- Test: `__tests__/prisma-path.test.ts`

- [ ] **Step 1: 在 Prisma 模型中增加关系**

在 `User` 中增加：

```prisma
  trainingProfile       TrainingProfile?
  trainingPlans         TrainingPlan[]
```

在 `WorkoutRecord` 中增加：

```prisma
  trainingPlanDay TrainingPlanDay?
```

在 `WorkoutEntry` 之后增加：

```prisma
model TrainingProfile {
  id                     String   @id @default(cuid())
  userId                 String   @unique
  user                   User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  weeklyFrequency        Int
  sessionDurationMinutes Int
  weekdaysJson           String
  equipmentJson          String
  avoidTagsJson          String
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
}

model TrainingPlan {
  id                  String            @id @default(cuid())
  userId              String
  user                User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  templateId          String
  templateVersion     Int
  status              String
  startDayKey         String
  endDayKey           String
  profileSnapshotJson String
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  completedAt         DateTime?
  days                TrainingPlanDay[]

  @@index([userId, status, createdAt])
  @@index([userId, startDayKey, endDayKey])
}

model TrainingPlanDay {
  id                String                 @id @default(cuid())
  planId            String
  plan              TrainingPlan           @relation(fields: [planId], references: [id], onDelete: Cascade)
  dayKey            String
  weekIndex         Int
  weekday           Int
  title             String
  estimatedMinutes  Int
  workoutPayloadJson String
  completedAt       DateTime?
  workoutRecordId   String?                 @unique
  workoutRecord     WorkoutRecord?          @relation(fields: [workoutRecordId], references: [id], onDelete: SetNull)
  createdAt         DateTime                @default(now())
  updatedAt         DateTime                @updatedAt
  exercises         TrainingPlanExercise[]

  @@unique([planId, dayKey])
  @@index([dayKey, completedAt])
}

model TrainingPlanExercise {
  id                        String          @id @default(cuid())
  planDayId                 String
  planDay                   TrainingPlanDay @relation(fields: [planDayId], references: [id], onDelete: Cascade)
  exerciseId                String
  name                      String
  bodyPart                  String
  equipment                 String
  phase                     String
  sortOrder                 Int
  plannedSets               Int?
  plannedReps               String?
  plannedSeconds            Int?
  restSeconds               Int?
  beginnerTip               String
  homeAlternativeExerciseId String?
  homeAlternativeName       String?
  completedAt               DateTime?
  actualWeightKg            Float?
  actualReps                String?
  createdAt                 DateTime        @default(now())
  updatedAt                 DateTime        @updatedAt

  @@unique([planDayId, sortOrder])
  @@index([exerciseId])
}
```

- [ ] **Step 2: 创建迁移 SQL**

创建 `prisma/migrations/20260711090000_add_beginner_training_plans/migration.sql`：

```sql
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
```

- [ ] **Step 3: 生成 Prisma Client**

Run:

```bash
npm run prepare:prisma
```

Expected: exit 0；生成目录保持忽略，不提交 `lib/generated/prisma/**`。

- [ ] **Step 4: 验证 Prisma 基础测试**

Run:

```bash
npm test -- __tests__/prisma-path.test.ts __tests__/db-connection.test.ts
```

Expected: PASS。

- [ ] **Step 5: 提交数据库模型**

```bash
git add prisma/schema.prisma prisma/migrations/20260711090000_add_beginner_training_plans/migration.sql
git commit -m "feat: add training plan schema"
```

---

### Task 3: 日期规则与计划领域服务

**Files:**
- Create: `lib/training-plan/domain.ts`
- Create: `lib/training-plan/service.ts`
- Create: `__tests__/training-plan-domain.test.ts`
- Create: `__tests__/training-plan-service.test.ts`

- [ ] **Step 1: 写日期和输入解析失败测试**

创建 `__tests__/training-plan-domain.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import {
  deriveTrainingPlanDayStatus,
  getTrainingPlanStartDayKey,
  parseCreateTrainingPlanInput,
} from "@/lib/training-plan/domain";

describe("training plan domain", () => {
  it("starts today on Monday and next Monday on other weekdays", () => {
    expect(getTrainingPlanStartDayKey(new Date("2026-07-13T08:00:00+08:00"))).toBe("2026-07-13");
    expect(getTrainingPlanStartDayKey(new Date("2026-07-14T08:00:00+08:00"))).toBe("2026-07-20");
  });

  it("requires weekday count to match frequency", () => {
    expect(parseCreateTrainingPlanInput({
      weeklyFrequency: 3,
      sessionDurationMinutes: 45,
      weekdays: [1, 3],
      equipment: ["gym"],
      avoidTags: [],
    })).toEqual({ ok: false, error: "weekday-count-mismatch" });
  });

  it("derives missed without mutating later days", () => {
    expect(deriveTrainingPlanDayStatus({
      dayKey: "2026-07-13",
      todayDayKey: "2026-07-14",
      completedAt: null,
    })).toBe("missed");
    expect(deriveTrainingPlanDayStatus({
      dayKey: "2026-07-15",
      todayDayKey: "2026-07-14",
      completedAt: null,
    })).toBe("upcoming");
  });
});
```

- [ ] **Step 2: 运行领域测试确认失败**

Run:

```bash
npm test -- __tests__/training-plan-domain.test.ts
```

Expected: FAIL，提示缺少 `domain.ts`。

- [ ] **Step 3: 实现输入、日期和状态规则**

`lib/training-plan/domain.ts` 必须导出：

```ts
export type TrainingPlanDayStatus = "completed" | "today" | "missed" | "upcoming";

export interface CreateTrainingPlanInput {
  weeklyFrequency: 2 | 3 | 4;
  sessionDurationMinutes: 30 | 45 | 60;
  weekdays: number[];
  equipment: string[];
  avoidTags: string[];
}

export function getTrainingPlanStartDayKey(now: Date): string;
export function addShanghaiDays(dayKey: string, days: number): string;
export function getShanghaiWeekday(dayKey: string): number;
export function parseCreateTrainingPlanInput(input: unknown):
  | { ok: true; value: CreateTrainingPlanInput }
  | { ok: false; error: string };
export function deriveTrainingPlanDayStatus(input: {
  dayKey: string;
  todayDayKey: string;
  completedAt: Date | string | null;
}): TrainingPlanDayStatus;
```

日期函数只处理 `YYYY-MM-DD`，通过 UTC 中午锚点完成加减，避免本地时区跨日错误。`weekdays` 使用 1 至 7 表示周一至周日，解析后去重并升序。

- [ ] **Step 4: 写计划服务失败测试**

`__tests__/training-plan-service.test.ts` 使用 `seedDatabase()` 和真实测试库，覆盖：

```ts
it("creates four immutable weeks mapped to selected weekdays", async () => {
  const plan = await createTrainingPlanForUser({
    userId,
    now: new Date("2026-07-13T08:00:00+08:00"),
    input: {
      weeklyFrequency: 3,
      sessionDurationMinutes: 45,
      weekdays: [1, 3, 6],
      equipment: ["gym"],
      avoidTags: [],
    },
  });

  expect(plan.startDayKey).toBe("2026-07-13");
  expect(plan.endDayKey).toBe("2026-08-09");
  expect(plan.days).toHaveLength(12);
  expect(plan.days.slice(0, 3).map((day) => day.dayKey)).toEqual([
    "2026-07-13",
    "2026-07-15",
    "2026-07-18",
  ]);
});

it("rejects a second active plan", async () => {
  const request = {
    userId,
    now: new Date("2026-07-13T08:00:00+08:00"),
    input: {
      weeklyFrequency: 3 as const,
      sessionDurationMinutes: 45 as const,
      weekdays: [1, 3, 6],
      equipment: ["gym"],
      avoidTags: [],
    },
  };
  await createTrainingPlanForUser(request);
  await expect(createTrainingPlanForUser(request)).rejects.toThrow("active-plan-exists");
});

it("keeps the persisted snapshot unchanged after content objects mutate", async () => {
  const created = await createTrainingPlanForUser({
    userId,
    now: new Date("2026-07-13T08:00:00+08:00"),
    input: {
      weeklyFrequency: 3,
      sessionDurationMinutes: 45,
      weekdays: [1, 3, 6],
      equipment: ["gym"],
      avoidTags: [],
    },
  });
  const before = await prisma.trainingPlanDay.findMany({ where: { planId: created.id } });
  trainingTemplates[0].weeks[0].sessions[0].title = "mutated-test-title";
  const after = await prisma.trainingPlanDay.findMany({ where: { planId: created.id } });
  expect(after).toEqual(before);
});

it("rejects creation when an avoid tag leaves no safe fixed template", async () => {
  await expect(createTrainingPlanForUser({
    userId,
    now: new Date("2026-07-13T08:00:00+08:00"),
    input: {
      weeklyFrequency: 4,
      sessionDurationMinutes: 60,
      weekdays: [1, 2, 4, 6],
      equipment: ["gym"],
      avoidTags: ["knee"],
    },
  })).rejects.toThrow("training-template-not-found");
});
```

- [ ] **Step 5: 实现计划创建和快照服务**

`lib/training-plan/service.ts` 必须导出：

```ts
export class ActiveTrainingPlanExistsError extends Error {}
export class TrainingTemplateNotFoundError extends Error {}

export async function createTrainingPlanForUser(input: {
  userId: string;
  now?: Date;
  input: CreateTrainingPlanInput;
}): Promise<TrainingPlanSnapshot>;

export async function getCurrentTrainingPlanSnapshot(input: {
  userId: string;
  now?: Date;
}): Promise<TrainingPlanSnapshot | null>;
```

创建事务必须：

1. 将已过结束日的 ACTIVE 计划更新为 COMPLETED。
2. 拒绝仍在有效期内的第二个 ACTIVE 计划。
3. upsert `TrainingProfile`。
4. 按固定模板和用户星期创建 28 天窗口中的计划日。
5. 将动作名称、处方、提示和居家替代复制到 `TrainingPlanExercise`。
6. 把聚合后的现有 `WorkoutTicketPayload` 写入 `workoutPayloadJson`。
7. 返回数据库快照，而不是直接返回模板对象。

创建快照前必须检查 `avoidTags`。模板动作命中避开标签时，只能替换为内容目录中已经声明且不命中相同标签的 `homeAlternativeId`；没有安全替代则抛出 `TrainingTemplateNotFoundError`，不得忽略避开项或临时生成动作。第一版只接受 `equipment: ["gym"]`。

`getCurrentTrainingPlanSnapshot()` 在读取时发现 `endDayKey < todayDayKey`，必须先将 ACTIVE 计划更新为 COMPLETED，再返回最近一轮完成计划；创建下一轮时同样先结算过期计划。

聚合 `WorkoutTicketPayload` 时必须使用固定映射，不能把外部数据集 body part 直接写入现有枚举：

```ts
const BODY_PART_TO_STRENGTH_PART = {
  chest: "chest",
  back: "back",
  shoulders: "shoulder",
  "upper arms": "arms",
  waist: "abs",
  "upper legs": "legs",
  "lower legs": "legs",
} as const;

const CARDIO_EQUIPMENT_TO_ITEM = {
  "elliptical machine": "elliptical",
  "stationary bike": "bike",
  "leverage machine": "treadmill",
} as const;
```

同一映射结果必须去重，并按 `CARDIO_ITEMS`、`STRENGTH_PARTS` 的目录顺序保存。

- [ ] **Step 6: 运行领域和服务测试**

Run:

```bash
npm test -- __tests__/training-plan-domain.test.ts __tests__/training-plan-service.test.ts
```

Expected: PASS。

- [ ] **Step 7: 提交领域服务**

```bash
git add lib/training-plan/domain.ts lib/training-plan/service.ts __tests__/training-plan-domain.test.ts __tests__/training-plan-service.test.ts
git commit -m "feat: add training plan domain service"
```

---

### Task 4: 计划快照与创建 API

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/board-state.ts`
- Modify: `lib/store.tsx`
- Create: `app/api/training-plan/route.ts`
- Modify: `lib/api.ts`
- Create: `__tests__/training-plan-api.test.ts`
- Modify: `__tests__/board-state.test.ts`
- Modify: `__tests__/board-provider-sync.test.tsx`

- [ ] **Step 1: 增加公共快照类型**

在 `lib/types.ts` 中增加：

```ts
export interface TrainingPlanExerciseSnapshot {
  id: string;
  exerciseId: string;
  name: string;
  bodyPart: string;
  equipment: string;
  phase: "warmup" | "main" | "cardio" | "cooldown";
  sortOrder: number;
  plannedSets: number | null;
  plannedReps: string | null;
  plannedSeconds: number | null;
  restSeconds: number | null;
  beginnerTip: string;
  homeAlternativeExerciseId: string | null;
  homeAlternativeName: string | null;
  completed: boolean;
  actualWeightKg: number | null;
  actualReps: string | null;
}

export interface TrainingPlanDaySnapshot {
  id: string;
  dayKey: string;
  weekIndex: number;
  weekday: number;
  title: string;
  estimatedMinutes: number;
  status: "completed" | "today" | "missed" | "upcoming";
  workoutPayload: WorkoutTicketPayload;
  exercises: TrainingPlanExerciseSnapshot[];
}

export interface TrainingPlanSnapshot {
  id: string;
  templateId: string;
  templateVersion: number;
  status: "ACTIVE" | "COMPLETED";
  startDayKey: string;
  endDayKey: string;
  currentWeekIndex: number;
  todayDay: TrainingPlanDaySnapshot | null;
  nextDay: TrainingPlanDaySnapshot | null;
  days: TrainingPlanDaySnapshot[];
}
```

在 `BoardSnapshot` 中增加：

```ts
  currentTrainingPlan?: TrainingPlanSnapshot | null;
```

该字段在服务端真实快照中始终返回，但类型保持可选，避免一次性修改所有历史测试 fixture；界面统一使用 `state.currentTrainingPlan ?? null`。

- [ ] **Step 2: 写快照和 store 同步失败测试**

在 `__tests__/board-state.test.ts` 增加有计划时 `currentTrainingPlan.todayDay` 的断言。在 `__tests__/board-provider-sync.test.tsx` 的远端快照中放入两个不同计划状态，断言轮询和 punch snapshot 都会替换：

```ts
expect(state.currentTrainingPlan.todayDay.status).toBe("completed");
expect(state.currentUserTodayWorkout).toEqual(remoteWorkoutPayload);
```

- [ ] **Step 3: 将计划加入 BoardSnapshot**

在 `buildBoardSnapshotForUser()` 中并行读取今日 workout 与当前计划：

```ts
const [todayWorkout, currentTrainingPlan] = await Promise.all([
  prisma.workoutRecord.findFirst({ /* preserve current query */ }),
  getCurrentTrainingPlanSnapshot({ userId: user.id, now }),
]);
```

返回值增加：

```ts
currentTrainingPlan,
```

更新 `lib/store.tsx` 的 `APPLY_REMOTE_SNAPSHOT` 和两个 `SYNC_REMOTE_STATE` 分支，显式复制：

```ts
currentUserTodayWorkout: action.snapshot.currentUserTodayWorkout,
currentTrainingPlan: action.snapshot.currentTrainingPlan ?? null,
```

- [ ] **Step 4: 写创建计划 API 失败测试**

`__tests__/training-plan-api.test.ts` 覆盖 401、400、201 和 409：

```ts
const response = await POST(request(userId, {
  weeklyFrequency: 3,
  sessionDurationMinutes: 45,
  weekdays: [1, 3, 6],
  equipment: ["gym"],
  avoidTags: [],
}));

expect(response.status).toBe(201);
const body = await response.json();
expect(body.snapshot.currentTrainingPlan.days).toHaveLength(12);
```

- [ ] **Step 5: 实现创建计划 API**

`app/api/training-plan/route.ts` 只提供 POST：

```ts
export async function POST(request: NextRequest) {
  const userId = parseCookieValue(request.cookies.get("userId")?.value);
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = parseCreateTrainingPlanInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    await createTrainingPlanForUser({ userId, input: parsed.value });
    const snapshot = await buildBoardSnapshotForUser(userId);
    if (!snapshot) return NextResponse.json({ error: "snapshot-build-failed" }, { status: 500 });
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    if (error instanceof ActiveTrainingPlanExistsError) {
      return NextResponse.json({ error: "active-plan-exists" }, { status: 409 });
    }
    if (error instanceof TrainingTemplateNotFoundError) {
      return NextResponse.json({ error: "training-template-not-found" }, { status: 422 });
    }
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
```

在 `lib/api.ts` 增加 `createTrainingPlan(input): Promise<BoardSnapshot>`，复用 `readSnapshot()`。

- [ ] **Step 6: 运行 API 和快照测试**

Run:

```bash
npm test -- __tests__/training-plan-api.test.ts __tests__/board-state.test.ts __tests__/board-provider-sync.test.tsx
```

Expected: PASS。

- [ ] **Step 7: 提交快照和创建 API**

```bash
git add lib/types.ts lib/board-state.ts lib/store.tsx lib/api.ts app/api/training-plan/route.ts __tests__/training-plan-api.test.ts __tests__/board-state.test.ts __tests__/board-provider-sync.test.tsx
git commit -m "feat: expose current training plan"
```

---

### Task 5: 在现有打卡事务中完成计划

**Files:**
- Create: `lib/training-plan/completion.ts`
- Modify: `lib/workouts.ts`
- Modify: `components/ui/FitnessPunchTicket.tsx`
- Modify: `app/api/board/punch/route.ts`
- Modify: `lib/api.ts`
- Modify: `__tests__/workouts.test.ts`
- Create: `__tests__/training-plan-punch-integration.test.ts`

- [ ] **Step 1: 定义计划完成请求类型**

在 `lib/training-plan/completion.ts` 中定义：

```ts
export interface TrainingPlanExerciseResultInput {
  planExerciseId: string;
  completed: boolean;
  actualWeightKg: number | null;
  actualReps: string | null;
}

export interface TrainingPlanCompletionInput {
  planDayId: string;
  exercises: TrainingPlanExerciseResultInput[];
}

export function parseTrainingPlanCompletion(
  input: unknown,
): { ok: true; value: TrainingPlanCompletionInput | null } |
   { ok: false; error: "invalid-training-plan-completion" };
```

无 `trainingPlanCompletion` 字段时返回 `{ ok: true, value: null }`，确保原有打卡兼容。

- [ ] **Step 2: 写打卡集成失败测试**

`__tests__/training-plan-punch-integration.test.ts` 必须覆盖：

1. 无今日打卡时，POST 同时创建打卡、WorkoutRecord 和计划完成。
2. 已有今日打卡时，PATCH 更新 WorkoutRecord 并完成计划。
3. 同一完成请求重放后不重复奖励。
4. 不能完成未来或其他用户的计划日。
5. DELETE 撤销打卡后重置计划日和动作完成字段。
6. 普通打卡不带计划字段时行为保持不变。

核心断言：

```ts
expect(planDay.completedAt).not.toBeNull();
expect(planDay.workoutRecordId).toBe(workout.id);
expect(user.ticketBalance).toBe(1);
expect(fitnessLedgers).toHaveLength(1);
expect(planExercises.filter((item) => item.completedAt !== null)).toHaveLength(checkedCount);
```

- [ ] **Step 3: 让现有 workout payload 接受 45 分钟和动感单车**

先在 `__tests__/workouts.test.ts` 增加：

```ts
it("accepts the 45 minute duration used by beginner plan templates", () => {
  const parsed = parseWorkoutTicketPayload({
    trainingType: "strength",
    cardioItem: null,
    cardioItems: [],
    strengthParts: ["chest", "back"],
    durationMinutes: 45,
  });

  expect(parsed.ok).toBe(true);
});

it("accepts bike as a cardio item", () => {
  const parsed = parseWorkoutTicketPayload({
    trainingType: "cardio",
    cardioItem: "bike",
    cardioItems: ["bike"],
    strengthParts: [],
    durationMinutes: 30,
  });

  expect(parsed.ok).toBe(true);
});
```

运行该测试并确认当前因 `value % 10 === 0` 失败。然后将 `lib/workouts.ts` 的时长判断改为只扩展一个被模板使用的值：

```ts
return (
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 10 &&
  value <= 180 &&
  (value % 10 === 0 || value === 45)
);
```

不要把所有 5 分钟步长都放开，避免改变现有训练小票的输入契约。

同时把 `CARDIO_ITEMS` 扩展为：

```ts
export const CARDIO_ITEMS = [
  "treadmill",
  "elliptical",
  "bike",
  "walk",
  "swim",
  "dance",
] as const;
```

在 `cardioLabels` 和 `components/ui/FitnessPunchTicket.tsx` 的 cardio 选项中加入 `{ id: "bike", label: "动感单车" }`。更新现有 workout/UI 测试，使目录顺序保持一致。

- [ ] **Step 4: 实现事务辅助函数**

`lib/training-plan/completion.ts` 导出：

```ts
export async function completeTrainingPlanDay({
  tx,
  userId,
  dayKey,
  workoutRecordId,
  input,
  now,
}: {
  tx: Prisma.TransactionClient;
  userId: string;
  dayKey: string;
  workoutRecordId: string;
  input: TrainingPlanCompletionInput;
  now: Date;
}): Promise<void>;

export async function resetTrainingPlanDayForWorkout({
  tx,
  workoutRecordId,
}: {
  tx: Prisma.TransactionClient;
  workoutRecordId: string;
}): Promise<void>;
```

`completeTrainingPlanDay` 必须查询 `plan.userId` 和 `dayKey`，验证所有提交的 `planExerciseId` 都属于该计划日，然后 updateMany 重置未勾选项并写入勾选项。计划日已经完成且关联同一 `WorkoutRecord` 时直接返回，保持幂等。

- [ ] **Step 5: 扩展 punch 请求但保持旧 payload 兼容**

在 `lib/api.ts` 定义：

```ts
export type PunchSubmissionPayload = WorkoutTicketPayload & {
  trainingPlanCompletion?: TrainingPlanCompletionInput;
};
```

让 `submitTodayPunch` 和 `updateTodayWorkout` 接受 `PunchSubmissionPayload`。普通 FitnessPunchTicket 仍只发送原有字段。

- [ ] **Step 6: 接入 POST 和 PATCH 事务**

在 `/api/board/punch` POST/PATCH 解析 body 后增加：

```ts
const parsedCompletion = parseTrainingPlanCompletion(body);
if (!parsedCompletion.ok) {
  return NextResponse.json({ error: parsedCompletion.error }, { status: 400 });
}
```

保存 workout 时接收返回行：

```ts
const workout = await createWorkoutForPunch({ /* existing args */ });
if (parsedCompletion.value) {
  await completeTrainingPlanDay({
    tx,
    userId: user.id,
    dayKey: todayDayKey,
    workoutRecordId: workout.id,
    input: parsedCompletion.value,
    now,
  });
}
```

PATCH 对 `replaceWorkoutForPunch()` 使用相同逻辑。

POST 遇到 duplicate punch 且请求包含已完成的同一 `planDayId` 时返回当前快照 200；其他重复打卡仍返回 409。

- [ ] **Step 7: 接入 DELETE 撤销**

在删除 `WorkoutRecord` 前调用：

```ts
await resetTrainingPlanDayForWorkout({
  tx,
  workoutRecordId: todayWorkout.id,
});
```

该函数必须将计划日 `completedAt`、`workoutRecordId` 和所有动作的完成/实际值清空。

- [ ] **Step 8: 运行打卡集成回归**

Run:

```bash
npm test -- __tests__/training-plan-punch-integration.test.ts __tests__/board-punch-api.test.ts __tests__/board-punch-fitness-ticket.test.ts __tests__/workouts.test.ts
```

Expected: PASS，且原有奖励测试无回归。

- [ ] **Step 9: 提交打卡集成**

```bash
git add lib/training-plan/completion.ts lib/workouts.ts lib/api.ts components/ui/FitnessPunchTicket.tsx app/api/board/punch/route.ts __tests__/workouts.test.ts __tests__/fitness-punch-ticket-prototype.test.tsx __tests__/training-plan-punch-integration.test.ts
git commit -m "feat: complete plans through fitness punch"
```

---

### Task 6: 今日计划卡与创建流程

**Files:**
- Create: `components/training-plan/TrainingPlanCard.tsx`
- Create: `components/training-plan/TrainingPlanSetupDialog.tsx`
- Modify: `components/punch-board/PunchBoard.tsx`
- Create: `__tests__/training-plan-card.test.tsx`
- Create: `__tests__/training-plan-setup.test.tsx`
- Modify: `__tests__/home-ui-punch-scene.test.tsx`

- [ ] **Step 1: 写今日卡状态失败测试**

`__tests__/training-plan-card.test.tsx` 分别渲染：

- `currentTrainingPlan = null`，断言“生成我的 4 周计划”。
- 今日训练未完成，断言标题、时长和动作数。
- 今日休息，断言“今日休息”和下一次训练日期。
- 今日已完成，断言“今日训练已完成”。
- 当前周过去日期未完成只在详情中显示“已错过”，今日卡不触发顺延文案。
- 四周结束后显示“本轮计划已完成”和“开启下一轮”，不自动创建下一轮。

- [ ] **Step 2: 实现紧凑今日计划卡**

`TrainingPlanCard` 接收：

```ts
interface TrainingPlanCardProps {
  plan: TrainingPlanSnapshot | null;
  onCreate: () => void;
  onOpen: () => void;
}
```

组件根节点使用 `.training-plan-card`，不创建新路由或主导航。没有今日训练时使用 `plan.nextDay` 生成“下次训练”文案。

- [ ] **Step 3: 写创建表单失败测试**

`__tests__/training-plan-setup.test.tsx` 覆盖：

- 默认 3 天、45 分钟。
- 选中的星期数量必须等于训练天数。
- 只能选择 2/3/4 天和 30/45/60 分钟。
- 提交时调用 `createTrainingPlan()` 并应用返回的 BoardSnapshot。
- 409 显示“已有进行中的计划”。

- [ ] **Step 4: 实现创建计划弹层**

`TrainingPlanSetupDialog` 使用受控状态：

```ts
const [weeklyFrequency, setWeeklyFrequency] = useState<2 | 3 | 4>(3);
const [sessionDurationMinutes, setSessionDurationMinutes] = useState<30 | 45 | 60>(45);
const [weekdays, setWeekdays] = useState<number[]>([1, 3, 6]);
const [equipment] = useState<string[]>(["gym"]);
const [avoidTags, setAvoidTags] = useState<string[]>([]);
```

首版避开项只提供肩、腰背、膝三个非医疗筛选标签。文案明确：“如果正在疼痛或受伤，请先咨询专业人士，本计划不提供康复建议。”

- [ ] **Step 5: 接入 PunchBoard**

`PunchBoard` 保持现有顺序并插入：

```tsx
<TeamHeader />
<TrainingPlanCard />
<HeatmapGrid />
<ActivityStream />
```

创建成功后使用 `dispatch({ type: "APPLY_REMOTE_SNAPSHOT", snapshot })`，不得整页刷新。

- [ ] **Step 6: 运行今日卡和场景测试**

Run:

```bash
npm test -- __tests__/training-plan-card.test.tsx __tests__/training-plan-setup.test.tsx __tests__/home-ui-punch-scene.test.tsx
```

Expected: PASS。

- [ ] **Step 7: 提交今日卡和创建流程**

```bash
git add components/training-plan/TrainingPlanCard.tsx components/training-plan/TrainingPlanSetupDialog.tsx components/punch-board/PunchBoard.tsx __tests__/training-plan-card.test.tsx __tests__/training-plan-setup.test.tsx __tests__/home-ui-punch-scene.test.tsx
git commit -m "feat: add training plan entry flow"
```

---

### Task 7: 四周详情与训练执行

**Files:**
- Create: `components/training-plan/TrainingPlanDetailDialog.tsx`
- Create: `components/training-plan/TrainingSessionView.tsx`
- Modify: `components/training-plan/TrainingPlanCard.tsx`
- Create: `__tests__/training-session-view.test.tsx`

- [ ] **Step 1: 写详情和完成失败测试**

`__tests__/training-session-view.test.tsx` 覆盖：

- 当前周默认展开，其他周可切换查看。
- 已错过日期只读，不显示补做按钮。
- 未来日期只读，不能提前完成。
- 今日动作可以勾选，重量与次数可留空。
- 未打卡时调用 `submitTodayPunch()`。
- 已打卡时调用 `updateTodayWorkout()`。
- 请求必须包含计划日 ID 和每个动作结果。
- 成功后通过 `SYNC_REMOTE_STATE` 更新 BoardState。

核心请求断言：

```ts
expect(submitTodayPunch).toHaveBeenCalledWith({
  ...todayDay.workoutPayload,
  trainingPlanCompletion: {
    planDayId: todayDay.id,
    exercises: expect.arrayContaining([
      {
        planExerciseId: todayDay.exercises[0].id,
        completed: true,
        actualWeightKg: 12.5,
        actualReps: "10",
      },
    ]),
  },
});
```

- [ ] **Step 2: 实现四周详情弹层**

`TrainingPlanDetailDialog`：

- 使用 portal、`role="dialog"`、`aria-modal="true"`。
- Escape 和遮罩关闭，但提交中禁止关闭。
- 顶部显示第几周和四周日期范围。
- 周切换只切换展示，不改变计划。
- 完成、已错过、今日和未来使用不同语义标签。
- 不出现“顺延”“调整计划”或“AI 建议”。

- [ ] **Step 3: 实现今日训练动作列表**

`TrainingSessionView` 为每个动作维护：

```ts
type ExerciseDraft = {
  completed: boolean;
  actualWeightKg: string;
  actualReps: string;
};
```

重量只接受 0 至 500、最多一位小数；次数最多 32 个字符。空字符串发送 `null`。居家替代只展示，不在第一版修改计划快照。

- [ ] **Step 4: 复用现有打卡同步协议**

组件从 BoardState 找到当前用户今日格状态：

```ts
const currentUserIndex = state.members.findIndex((member) => member.id === state.currentUserId);
const alreadyPunched = state.gridData[currentUserIndex]?.[state.today - 1] === true;
```

请求前调用 `reservePunchEpoch()` 和 `BEGIN_PUNCH_SYNC`，成功后调用：

```ts
dispatch({
  type: "SYNC_REMOTE_STATE",
  snapshot,
  source: "punch",
  punchEpoch,
});
```

失败时调用 `END_PUNCH_SYNC` 并保留用户勾选内容。

- [ ] **Step 5: 运行训练执行测试**

Run:

```bash
npm test -- __tests__/training-session-view.test.tsx __tests__/heatmap-grid-punch.test.tsx __tests__/punch-popup.test.tsx
```

Expected: PASS，原有训练小票仍可独立打卡。

- [ ] **Step 6: 提交详情与执行流程**

```bash
git add components/training-plan/TrainingPlanDetailDialog.tsx components/training-plan/TrainingSessionView.tsx components/training-plan/TrainingPlanCard.tsx __tests__/training-session-view.test.tsx
git commit -m "feat: add guided training session flow"
```

---

### Task 8: 样式、响应式与可访问性

**Files:**
- Modify: `app/globals.css`
- Create: `__tests__/training-plan-css.test.ts`
- Modify: `__tests__/mobile-only-adaptation-css.test.ts`

- [ ] **Step 1: 写样式契约失败测试**

创建 `__tests__/training-plan-css.test.ts`，读取 `app/globals.css` 并断言存在：

```ts
expect(css).toContain(".training-plan-card");
expect(css).toContain(".training-plan-dialog");
expect(css).toContain(".training-plan-session-list");
expect(css).toContain("@media (max-width: 767px)");
expect(css).toContain("prefers-reduced-motion: reduce");
```

- [ ] **Step 2: 实现桌面与移动端样式**

样式必须满足：

- 今日卡桌面高度不超过 88px，避免压缩现有 HeatmapGrid。
- 移动端使用两行布局，正文不小于 14px。
- 弹层桌面最大宽度 920px，移动端占满宽度并保留安全区。
- 动作列表允许独立滚动，底部完成按钮保持可见。
- `:focus-visible` 有清晰轮廓。
- `prefers-reduced-motion: reduce` 时关闭非必要动画。
- 不修改 AI 生图、补给站或其他导航样式。

- [ ] **Step 3: 运行 CSS 与移动端测试**

Run:

```bash
npm test -- __tests__/training-plan-css.test.ts __tests__/mobile-only-adaptation-css.test.ts __tests__/home-ui-density-contract.test.ts
```

Expected: PASS。

- [ ] **Step 4: 提交样式**

```bash
git add app/globals.css __tests__/training-plan-css.test.ts __tests__/mobile-only-adaptation-css.test.ts
git commit -m "style: polish training plan experience"
```

---

### Task 9: 全量验证与交付检查

**Files:**
- Modify only if verification reveals a defect directly caused by Tasks 1-8.

- [ ] **Step 1: 重新生成 Prisma Client**

Run:

```bash
npm run prepare:prisma
```

Expected: exit 0。

- [ ] **Step 2: 运行训练计划专项测试**

Run:

```bash
npm test -- \
  __tests__/training-plan-content.test.ts \
  __tests__/training-plan-domain.test.ts \
  __tests__/training-plan-service.test.ts \
  __tests__/training-plan-api.test.ts \
  __tests__/training-plan-punch-integration.test.ts \
  __tests__/training-plan-card.test.tsx \
  __tests__/training-plan-setup.test.tsx \
  __tests__/training-session-view.test.tsx \
  __tests__/training-plan-css.test.ts
```

Expected: 全部 PASS。

- [ ] **Step 3: 运行受影响回归测试**

Run:

```bash
npm test -- \
  __tests__/board-state.test.ts \
  __tests__/board-provider-sync.test.tsx \
  __tests__/board-punch-api.test.ts \
  __tests__/board-punch-fitness-ticket.test.ts \
  __tests__/heatmap-grid-punch.test.tsx \
  __tests__/home-ui-punch-scene.test.tsx \
  __tests__/fitness-punch-ticket-prototype.test.tsx
```

Expected: 全部 PASS。

- [ ] **Step 4: 顺序运行完整质量检查**

Prisma 生成命令与全量测试不得并行执行。

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: 三个命令全部 exit 0。若出现项目已知旧失败，必须记录完整命令、失败测试和与本改动无关的证据；不能将未知失败视为可忽略。

- [ ] **Step 5: 本地视觉验收**

Run:

```bash
npm run dev
```

在 `http://localhost:3001` 验证：

- 无计划用户可以完成创建流程。
- 今日卡不遮挡 TeamHeader、HeatmapGrid 和 ActivityStream。
- 四周详情可以查看但不能改变固定日期。
- 错过日期没有补做入口。
- 完成今日计划只发一次奖励。
- 撤销打卡后今日计划恢复未完成。
- 桌面和移动端均无横向溢出。
- 个人菜单 AI 生图入口保持原样。

- [ ] **Step 6: 检查变更范围和提交状态**

Run:

```bash
git status --short
git log --oneline --decorate -12
git diff HEAD~8..HEAD --stat
```

Expected: 只有本计划文件、训练内容、训练计划代码、相关测试和必要 Prisma 迁移；不包含 `docs/knowledge-base/`、`docs/product-audit/` 或其他用户未提交文件。
