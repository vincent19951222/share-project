# 牛马补给站 AI 生图 Phase 1 用户侧 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把牛马补给站从旧 4 维任务 / 抽奖券 / 商店入口，迁移为只使用金币的 AI 生图主题解锁、生成、retry 和作品集闭环。

**Architecture:** Phase 1 保留 share-project 的 Next.js App Router、Prisma + SQLite、cookie auth 和现有补给站入口；新增 `lib/gamification/ai-image/*` 服务边界，所有 provider、COS、prompt 组合、计费、任务状态都在服务端完成。前端只消费 `SupplyStationProductionSnapshot.supplyAiImage`，不接触黑盒 prompt，不运行时依赖 `/Users/vincent/Projects/IPStudio`。

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma 7 + better-sqlite3, Vitest + jsdom, Tailwind CSS v4, COS SDK `cos-nodejs-sdk-v5`, GPT-image-2 via boluopets-compatible image endpoints.

## Global Constraints

- Source specs: `docs/superpowers/specs/2026-06-26-supply-station-ai-incentive-design.md` and `docs/superpowers/specs/2026-07-06-supply-ai-image-ipstudio-migration-design.md`.
- If the two specs differ on theme count, use the later migration decision: Phase 1 imports IPStudio's 13 default themes as the initial preset catalog.
- Default unlock policy: exactly 1 preset theme is default unlocked; all other enabled presets are unlocked through the theme gacha.
- Currency: front-end Phase 1 shows only `User.coins`; old `ticketBalance` and `LotteryTicketLedger` remain in the database but are not shown in the primary supply UI.
- Legacy ticket conversion: old ticket balance converts at `1 ticket = 50 coins`, then sets `User.ticketBalance` to 0.
- AI image generation price constants must be centralized in `lib/gamification/ai-image/constants.ts`.
- Prompt templates are server-only; never return `promptTemplate`, full prompt, API keys, or provider request bodies to the client.
- Reference input images are persisted to COS for retry, but base64/data URLs are never stored in SQLite.
- Phase 1 includes 1 / 2 / 4 generation, failed / partial retry, theme gacha,作品集, and旧补给存档.
- Phase 1 excludes `themes-admin`, admin theme publish / restore, and admin images; those are planned in Phase 2.
- Phase 1 excludes猜盐 / 海龟汤, AI 问答,图片公开广场,主题直购,评论,点赞,排行,后台审核队列.
- Do not physically delete old daily task, lottery ticket, inventory, shop, or redemption tables in Phase 1.

---

## File Structure

### New Files

- `docs/superpowers/research/2026-07-06-ipstudio-migration-source-freeze.md` - records IPStudio HEAD, dirty status, source file list, and implementation snapshot notes.
- `docs/superpowers/research/2026-07-06-ipstudio-migration-source.diff` - raw dirty diff exported from IPStudio before migration implementation.
- `scripts/convert-supply-tickets-to-coins.ts` - idempotent local/prod script to convert old `ticketBalance` to `coins`.
- `lib/gamification/ai-image/constants.ts` - coin prices, task limits, timeouts, COS key prefixes, provider defaults.
- `lib/gamification/ai-image/types.ts` - service-layer types shared by AI image modules.
- `lib/gamification/ai-image/themes.ts` - 13 preset themes, default unlock marker, server-only prompt templates.
- `lib/gamification/ai-image/theme-unlocks.ts` - unlock lookup and theme gacha service.
- `lib/gamification/ai-image/prompt.ts` - server-only prompt composition and snapshot serialization.
- `lib/gamification/ai-image/provider.ts` - boluopets-compatible `gpt-image-2` generation/edit client.
- `lib/gamification/ai-image/cos-storage.ts` - generated image and input reference upload helpers.
- `lib/gamification/ai-image/tasks.ts` - task creation, item creation, status settlement, coin charge/refund, retry orchestration.
- `lib/gamification/ai-image/task-runner.ts` - in-process runner for queued items and provider/COS execution.
- `lib/gamification/ai-image/snapshot.ts` - builds `supplyAiImage` snapshot for supply state and API responses.
- `lib/gamification/legacy-supply-archive.ts` - read-only archive summary for old inventory, redemption, and task records.
- `app/api/gamification/ai-image/tasks/route.ts` - `POST` create generation task.
- `app/api/gamification/ai-image/tasks/[taskId]/route.ts` - `GET` task detail and timeout settlement.
- `app/api/gamification/ai-image/tasks/[taskId]/retry/route.ts` - `POST` retry failed or partial task.
- `app/api/gamification/ai-image/themes/draw/route.ts` - `POST` theme gacha unlock.
- `components/gamification/production/SupplyAiImageStudioPanel.tsx` - user-facing生图控制台.
- `components/gamification/production/SupplyThemeGachaPanel.tsx` - theme gacha UI.
- `components/gamification/production/SupplyArtworkBackpackPanel.tsx` -作品集 and unlocked theme inventory UI.
- `components/gamification/production/SupplyLegacyArchivePanel.tsx` - read-only旧补给存档 UI.
- `__tests__/legacy-ticket-conversion-script.test.ts` - script dry-run and idempotency tests.
- `__tests__/ai-image-themes.test.ts` - theme catalog and client-safe snapshot tests.
- `__tests__/ai-image-prompt.test.ts` - prompt composition and prompt hiding tests.
- `__tests__/ai-image-provider.test.ts` - provider request shape tests with mocked fetch/FormData.
- `__tests__/ai-image-cos-storage.test.ts` - COS upload key and data URL validation tests.
- `__tests__/ai-image-tasks.test.ts` - task creation, charge/refund, item, retry service tests.
- `__tests__/ai-image-api.test.ts` - task create/detail/retry API tests.
- `__tests__/ai-image-theme-draw-api.test.ts` - theme gacha API tests.
- `__tests__/supply-ai-image-snapshot.test.ts` - `supplyAiImage` view-model tests.
- `__tests__/supply-ai-image-studio-panel.test.tsx` - studio UI tests.
- `__tests__/supply-ai-image-shell.test.tsx` - shell panel and mutation flow tests.

### Modified Files

- `package.json` and `package-lock.json` - add `cos-nodejs-sdk-v5`.
- `prisma/schema.prisma` - add AI image task, item, artwork, input image, and theme unlock models; add relations to `User` and `Team`.
- `lib/db-seed.ts` - delete AI image rows during deterministic seed reset.
- `lib/types.ts` - add AI image snapshot types; update `SupplyStationProductionSnapshot` resources and sections.
- `lib/gamification/supply-view-model.ts` - build simplified resources, `supplyAiImage`, and legacy archive.
- `app/api/gamification/supply/state/route.ts` - stop auto-creating old daily assignments.
- `lib/api.ts` - add AI image client functions.
- `components/gamification/production/SupplyStationShell.tsx` - replace old panels with AI studio, gacha, artwork backpack, and legacy archive.
- `components/gamification/production/supply-ui-lab-adapters.ts` - remove or quarantine old production adapters if no longer used by the shell.
- `lib/supply-nav-context.ts` and `lib/navigation-routes.ts` - remove ticket from primary supply nav resources.
- Existing tests under `__tests__/gamification-supply-state-api.test.ts`, `__tests__/supply-production-view-model.test.ts`, `__tests__/supply-production-shell.test.tsx`, `__tests__/home-supply-navigation.test.tsx`, and `__tests__/supply-ui-lab-production-adapters.test.ts` - update old expectations from tickets/tasks/shop to AI image MVP.

---

## Task 1: Freeze IPStudio Source And Add COS Dependency

**Files:**
- Create: `docs/superpowers/research/2026-07-06-ipstudio-migration-source-freeze.md`
- Create: `docs/superpowers/research/2026-07-06-ipstudio-migration-source.diff`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `/Users/vincent/Projects/IPStudio` current dirty worktree.
- Produces: frozen source evidence and installed `cos-nodejs-sdk-v5` dependency for `lib/gamification/ai-image/cos-storage.ts`.

- [ ] **Step 1: Record IPStudio HEAD**

Run:

```bash
git -C /Users/vincent/Projects/IPStudio rev-parse HEAD
```

Expected: prints a commit hash. The spec snapshot expected `be4578a`; if the hash differs, stop and ask whether to refresh the migration source.

- [ ] **Step 2: Record IPStudio dirty status**

Run:

```bash
git -C /Users/vincent/Projects/IPStudio status --short
```

Expected: includes the dirty files listed in `docs/superpowers/specs/2026-07-06-supply-ai-image-ipstudio-migration-design.md`, especially `screens/UnifiedCreation.tsx`, `lib/server/generationTaskApi.ts`, `lib/server/playgroundTaskRepository.ts`, retry routes, and `lib/server/sqlite.ts`.

- [ ] **Step 3: Export the dirty diff**

Run:

```bash
git -C /Users/vincent/Projects/IPStudio diff > docs/superpowers/research/2026-07-06-ipstudio-migration-source.diff
```

Expected: file exists and is non-empty when IPStudio still has dirty changes.

- [ ] **Step 4: Write the source freeze note**

Create `docs/superpowers/research/2026-07-06-ipstudio-migration-source-freeze.md` with this structure:

```markdown
# IPStudio Migration Source Freeze

> Captured for share-project Phase 1 AI image migration.

## Source

- Path: `/Users/vincent/Projects/IPStudio`
- HEAD: `<paste command output>`
- Captured at: `2026-07-06 Asia/Shanghai`

## Dirty Files Included

Paste `git status --short` output here.

## Source Files To Read During Implementation

- `/Users/vincent/Projects/IPStudio/lib/server/imageGeneration.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/cosStorage.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/generationTaskApi.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/playgroundTaskRepository.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/playgroundTaskRunner.ts`
- `/Users/vincent/Projects/IPStudio/lib/server/themeRegistry.ts`
- `/Users/vincent/Projects/IPStudio/lib/designScenes.ts`
- `/Users/vincent/Projects/IPStudio/screens/UnifiedCreation.tsx`
- `/Users/vincent/Projects/IPStudio/services/generationTaskService.ts`

## Runtime Boundary

share-project must not import from `/Users/vincent/Projects/IPStudio` at runtime. All migrated code is copied or translated into share-project-owned modules.
```

- [ ] **Step 5: Install COS SDK**

Run:

```bash
npm install cos-nodejs-sdk-v5
```

Expected: `package.json` and `package-lock.json` include `cos-nodejs-sdk-v5`.

- [ ] **Step 6: Verify dependency and docs**

Run:

```bash
node -e "require('cos-nodejs-sdk-v5'); console.log('cos sdk ok')"
git diff -- docs/superpowers/research/2026-07-06-ipstudio-migration-source-freeze.md docs/superpowers/research/2026-07-06-ipstudio-migration-source.diff package.json package-lock.json
```

Expected: first command prints `cos sdk ok`; diff contains only the freeze docs and dependency changes.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/research/2026-07-06-ipstudio-migration-source-freeze.md docs/superpowers/research/2026-07-06-ipstudio-migration-source.diff package.json package-lock.json
git commit -m "chore: freeze ipstudio image migration source"
```

---

## Task 2: Add AI Image Prisma Models And Seed Reset

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/db-seed.ts`
- Test: `__tests__/ai-image-schema.test.ts`

**Interfaces:**
- Produces Prisma delegates: `aiImageThemeUnlock`, `aiImageGenerationTask`, `aiImageGenerationItem`, `aiImageArtwork`, `aiImageTaskInputImage`.
- Later tasks rely on these exact fields and relations.

- [ ] **Step 1: Write schema test**

Create `__tests__/ai-image-schema.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

describe("AI image schema", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores theme unlocks, generation tasks, items, input images, and artworks", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });

    const unlock = await prisma.aiImageThemeUnlock.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        themeId: "theme-01",
        source: "default",
      },
    });

    const task = await prisma.aiImageGenerationTask.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        themeId: unlock.themeId,
        userPrompt: "训练后的像素海报",
        requestedCount: 2,
        status: "queued",
        coinCost: 120,
        coinRefunded: false,
        refundedCoinAmount: 0,
        providerModel: "gpt-image-2",
        promptSnapshotJson: JSON.stringify({ themeId: unlock.themeId }),
      },
    });

    const input = await prisma.aiImageTaskInputImage.create({
      data: {
        taskId: task.id,
        userId: user.id,
        teamId: user.teamId,
        imageUrl: "https://example.com/input.png",
        cosKey: "share-project/ai-images-inputs/u1/input.png",
        mimeType: "image/png",
        sizeBytes: 120,
        sortOrder: 0,
      },
    });

    const item = await prisma.aiImageGenerationItem.create({
      data: {
        taskId: task.id,
        userId: user.id,
        teamId: user.teamId,
        themeId: unlock.themeId,
        index: 0,
        status: "completed",
        imageUrl: "https://example.com/output.png",
        cosKey: "share-project/ai-images/u1/output.png",
      },
    });

    const artwork = await prisma.aiImageArtwork.create({
      data: {
        taskId: task.id,
        itemId: item.id,
        userId: user.id,
        teamId: user.teamId,
        themeId: unlock.themeId,
        imageUrl: item.imageUrl!,
        cosKey: item.cosKey!,
        promptSnapshotJson: task.promptSnapshotJson,
      },
    });

    await expect(prisma.aiImageTaskInputImage.findUnique({ where: { id: input.id } })).resolves.toBeTruthy();
    await expect(prisma.aiImageArtwork.findUnique({ where: { id: artwork.id } })).resolves.toBeTruthy();
  });

  it("seedDatabase clears AI image rows for the seed team", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const task = await prisma.aiImageGenerationTask.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        themeId: "theme-01",
        requestedCount: 1,
        status: "failed",
        coinCost: 60,
        coinRefunded: true,
        refundedCoinAmount: 60,
        providerModel: "gpt-image-2",
        errorMessage: "mock failure",
        promptSnapshotJson: "{}",
      },
    });
    await prisma.aiImageGenerationItem.create({
      data: {
        taskId: task.id,
        userId: user.id,
        teamId: user.teamId,
        themeId: "theme-01",
        index: 0,
        status: "failed",
        errorMessage: "mock failure",
      },
    });

    await seedDatabase();

    await expect(prisma.aiImageGenerationTask.count()).resolves.toBe(0);
    await expect(prisma.aiImageGenerationItem.count()).resolves.toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/ai-image-schema.test.ts
```

Expected: FAIL because Prisma delegates do not exist.

- [ ] **Step 3: Add Prisma relations and models**

In `prisma/schema.prisma`, add relation arrays to `Team`:

```prisma
  aiImageThemeUnlocks AiImageThemeUnlock[]
  aiImageGenerationTasks AiImageGenerationTask[]
  aiImageGenerationItems AiImageGenerationItem[]
  aiImageArtworks AiImageArtwork[]
  aiImageTaskInputImages AiImageTaskInputImage[]
```

Add relation arrays to `User`:

```prisma
  aiImageThemeUnlocks AiImageThemeUnlock[]
  aiImageGenerationTasks AiImageGenerationTask[]
  aiImageGenerationItems AiImageGenerationItem[]
  aiImageArtworks AiImageArtwork[]
  aiImageTaskInputImages AiImageTaskInputImage[]
```

Add these models near the gamification models:

```prisma
model AiImageThemeUnlock {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  teamId    String
  team      Team     @relation(fields: [teamId], references: [id])
  themeId   String
  source    String
  createdAt DateTime @default(now())

  @@unique([userId, themeId])
  @@index([teamId, themeId])
}

model AiImageGenerationTask {
  id                 String                   @id @default(cuid())
  userId             String
  user               User                     @relation(fields: [userId], references: [id])
  teamId             String
  team               Team                     @relation(fields: [teamId], references: [id])
  themeId            String
  userPrompt         String?
  requestedCount     Int
  status             String
  coinCost           Int
  coinRefunded       Boolean                  @default(false)
  refundedCoinAmount Int                      @default(0)
  providerModel      String
  errorMessage       String?
  promptSnapshotJson String
  retryOfTaskId      String?
  retryOfTask        AiImageGenerationTask?   @relation("AiImageTaskRetrySource", fields: [retryOfTaskId], references: [id])
  retryTasks         AiImageGenerationTask[]  @relation("AiImageTaskRetrySource")
  createdAt          DateTime                 @default(now())
  updatedAt          DateTime                 @updatedAt
  items              AiImageGenerationItem[]
  artworks           AiImageArtwork[]
  inputImages        AiImageTaskInputImage[]

  @@index([userId, createdAt])
  @@index([teamId, createdAt])
  @@index([status, updatedAt])
  @@index([retryOfTaskId])
}

model AiImageGenerationItem {
  id           String                @id @default(cuid())
  taskId       String
  task         AiImageGenerationTask @relation(fields: [taskId], references: [id])
  userId       String
  user         User                  @relation(fields: [userId], references: [id])
  teamId       String
  team         Team                  @relation(fields: [teamId], references: [id])
  themeId      String
  index        Int
  status       String
  imageUrl     String?
  cosKey       String?
  errorMessage String?
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt
  artwork      AiImageArtwork?

  @@unique([taskId, index])
  @@index([userId, createdAt])
  @@index([teamId, createdAt])
  @@index([status, updatedAt])
}

model AiImageArtwork {
  id                 String                @id @default(cuid())
  taskId             String
  task               AiImageGenerationTask @relation(fields: [taskId], references: [id])
  itemId             String                @unique
  item               AiImageGenerationItem @relation(fields: [itemId], references: [id])
  userId             String
  user               User                  @relation(fields: [userId], references: [id])
  teamId             String
  team               Team                  @relation(fields: [teamId], references: [id])
  themeId            String
  imageUrl           String
  cosKey             String
  promptSnapshotJson String
  createdAt          DateTime              @default(now())

  @@index([userId, createdAt])
  @@index([teamId, createdAt])
  @@index([themeId, createdAt])
}

model AiImageTaskInputImage {
  id        String                @id @default(cuid())
  taskId    String
  task      AiImageGenerationTask @relation(fields: [taskId], references: [id])
  userId    String
  user      User                  @relation(fields: [userId], references: [id])
  teamId    String
  team      Team                  @relation(fields: [teamId], references: [id])
  imageUrl  String
  cosKey    String
  mimeType  String
  sizeBytes Int
  sortOrder Int
  createdAt DateTime              @default(now())

  @@index([taskId, sortOrder])
  @@index([userId, createdAt])
}
```

- [ ] **Step 4: Update seed reset**

In `lib/db-seed.ts`, after team lookup and before deleting users/team-owned records that AI rows depend on, delete AI rows in dependency order:

```ts
  await prisma.aiImageArtwork.deleteMany({
    where: { teamId: team.id },
  });

  await prisma.aiImageTaskInputImage.deleteMany({
    where: { teamId: team.id },
  });

  await prisma.aiImageGenerationItem.deleteMany({
    where: { teamId: team.id },
  });

  await prisma.aiImageGenerationTask.deleteMany({
    where: { teamId: team.id },
  });

  await prisma.aiImageThemeUnlock.deleteMany({
    where: { teamId: team.id },
  });
```

- [ ] **Step 5: Generate Prisma client and update local schema**

Run:

```bash
npx prisma generate
npx prisma db push
```

Expected: both commands exit 0. `npx prisma db push` may update only the local development DB.

- [ ] **Step 6: Run schema test**

Run:

```bash
npm test -- __tests__/ai-image-schema.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/db-seed.ts __tests__/ai-image-schema.test.ts lib/generated package-lock.json package.json
git commit -m "feat: add ai image data models"
```

---

## Task 3: Convert Legacy Tickets To Coins

**Files:**
- Create: `scripts/convert-supply-tickets-to-coins.ts`
- Test: `__tests__/legacy-ticket-conversion-script.test.ts`

**Interfaces:**
- Produces command: `npx tsx scripts/convert-supply-tickets-to-coins.ts --dry-run` and `npx tsx scripts/convert-supply-tickets-to-coins.ts --apply`.
- Conversion rule: `coins += ticketBalance * 50`, then `ticketBalance = 0`.

- [ ] **Step 1: Write script test**

Create `__tests__/legacy-ticket-conversion-script.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { convertSupplyTicketsToCoins } from "@/scripts/convert-supply-tickets-to-coins";
import { prisma } from "@/lib/prisma";

describe("convertSupplyTicketsToCoins", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("dry-runs without mutating users", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    await prisma.user.update({ where: { id: user.id }, data: { coins: 100, ticketBalance: 3 } });

    const result = await convertSupplyTicketsToCoins({ apply: false });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(result).toMatchObject({ convertedUserCount: 1, ticketCount: 3, coinGrantTotal: 150 });
    expect(after.coins).toBe(100);
    expect(after.ticketBalance).toBe(3);
  });

  it("applies conversion idempotently", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    await prisma.user.update({ where: { id: user.id }, data: { coins: 100, ticketBalance: 3 } });

    await convertSupplyTicketsToCoins({ apply: true });
    const first = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await convertSupplyTicketsToCoins({ apply: true });
    const second = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(first.coins).toBe(250);
    expect(first.ticketBalance).toBe(0);
    expect(second.coins).toBe(250);
    expect(second.ticketBalance).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/legacy-ticket-conversion-script.test.ts
```

Expected: FAIL because the script module does not exist.

- [ ] **Step 3: Add conversion script**

Create `scripts/convert-supply-tickets-to-coins.ts`:

```ts
import { prisma } from "@/lib/prisma";

export const LEGACY_TICKET_TO_COIN_RATE = 50;

export interface ConvertSupplyTicketsToCoinsResult {
  convertedUserCount: number;
  ticketCount: number;
  coinGrantTotal: number;
}

export async function convertSupplyTicketsToCoins({
  apply,
}: {
  apply: boolean;
}): Promise<ConvertSupplyTicketsToCoinsResult> {
  const users = await prisma.user.findMany({
    where: { ticketBalance: { gt: 0 } },
    select: { id: true, username: true, coins: true, ticketBalance: true },
    orderBy: { createdAt: "asc" },
  });

  const ticketCount = users.reduce((sum, user) => sum + user.ticketBalance, 0);
  const coinGrantTotal = ticketCount * LEGACY_TICKET_TO_COIN_RATE;

  if (apply) {
    for (const user of users) {
      const coinGrant = user.ticketBalance * LEGACY_TICKET_TO_COIN_RATE;
      await prisma.user.updateMany({
        where: { id: user.id, ticketBalance: user.ticketBalance },
        data: {
          coins: { increment: coinGrant },
          ticketBalance: 0,
        },
      });
    }
  }

  return {
    convertedUserCount: users.length,
    ticketCount,
    coinGrantTotal,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const dryRun = process.argv.includes("--dry-run");

  if (!apply && !dryRun) {
    throw new Error("Pass --dry-run or --apply");
  }

  const result = await convertSupplyTicketsToCoins({ apply });
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", ...result }, null, 2));
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
```

- [ ] **Step 4: Run focused test**

Run:

```bash
npm test -- __tests__/legacy-ticket-conversion-script.test.ts
```

Expected: PASS.

- [ ] **Step 5: Smoke dry-run command**

Run:

```bash
npx tsx scripts/convert-supply-tickets-to-coins.ts --dry-run
```

Expected: prints JSON with `mode: "dry-run"` and does not mutate local users.

- [ ] **Step 6: Commit**

```bash
git add scripts/convert-supply-tickets-to-coins.ts __tests__/legacy-ticket-conversion-script.test.ts
git commit -m "feat: add legacy ticket conversion script"
```

---

## Task 4: Add Theme Presets, Prompt Snapshots, And Client-Safe Types

**Files:**
- Create: `lib/gamification/ai-image/constants.ts`
- Create: `lib/gamification/ai-image/types.ts`
- Create: `lib/gamification/ai-image/themes.ts`
- Create: `lib/gamification/ai-image/prompt.ts`
- Modify: `lib/types.ts`
- Test: `__tests__/ai-image-themes.test.ts`
- Test: `__tests__/ai-image-prompt.test.ts`

**Interfaces:**
- Produces `getAiImageThemes()`, `getAiImageThemeById(themeId)`, `toClientThemeSnapshot(theme, unlocked)`, and `buildPromptSnapshot(input)`.
- Later tasks must use `AiImageThemeSnapshot` instead of returning raw theme definitions.

- [ ] **Step 1: Write theme and prompt tests**

Create `__tests__/ai-image-themes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getAiImageThemeById,
  getAiImageThemes,
  toClientThemeSnapshot,
} from "@/lib/gamification/ai-image/themes";

describe("AI image preset themes", () => {
  it("loads 13 enabled presets with exactly one default unlock", () => {
    const themes = getAiImageThemes();

    expect(themes).toHaveLength(13);
    expect(themes.filter((theme) => theme.defaultUnlocked)).toHaveLength(1);
    expect(themes.every((theme) => theme.enabled)).toBe(true);
  });

  it("does not expose promptTemplate in client snapshots", () => {
    const theme = getAiImageThemeById("theme-01");
    expect(theme?.promptTemplate).toContain("像素");

    const snapshot = toClientThemeSnapshot(theme!, true);

    expect(snapshot).toMatchObject({
      id: "theme-01",
      unlocked: true,
      defaultUnlocked: true,
    });
    expect(JSON.stringify(snapshot)).not.toContain("promptTemplate");
    expect(JSON.stringify(snapshot)).not.toContain(theme!.promptTemplate);
  });
});
```

Create `__tests__/ai-image-prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getAiImageThemeById } from "@/lib/gamification/ai-image/themes";
import { buildPromptSnapshot } from "@/lib/gamification/ai-image/prompt";

describe("AI image prompt snapshot", () => {
  it("combines server-only theme prompt and user prompt", () => {
    const theme = getAiImageThemeById("theme-01")!;
    const snapshot = buildPromptSnapshot({
      theme,
      userPrompt: "加入团队口号：今天也要动一动",
    });

    expect(snapshot.providerPrompt).toContain(theme.promptTemplate);
    expect(snapshot.providerPrompt).toContain("今天也要动一动");
    expect(snapshot.clientPromptSummary).toBe("加入团队口号：今天也要动一动");
    expect(snapshot.themeId).toBe("theme-01");
  });

  it("trims blank user prompt without exposing prompt templates to client summary", () => {
    const theme = getAiImageThemeById("theme-01")!;
    const snapshot = buildPromptSnapshot({ theme, userPrompt: "   " });

    expect(snapshot.clientPromptSummary).toBe("");
    expect(snapshot.providerPrompt).toContain(theme.promptTemplate);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- __tests__/ai-image-themes.test.ts __tests__/ai-image-prompt.test.ts
```

Expected: FAIL because the modules and types do not exist.

- [ ] **Step 3: Add constants**

Create `lib/gamification/ai-image/constants.ts`:

```ts
export const AI_IMAGE_GENERATION_COIN_COST = 60;
export const AI_IMAGE_THEME_DRAW_COIN_COST = 200;
export const AI_IMAGE_MAX_REFERENCE_IMAGES = 3;
export const AI_IMAGE_ALLOWED_REQUEST_COUNTS = [1, 2, 4] as const;
export const AI_IMAGE_RETRY_MIN_COUNT = 1;
export const AI_IMAGE_RETRY_MAX_COUNT = 4;
export const AI_IMAGE_TASK_TIMEOUT_MS = 10 * 60 * 1000;
export const AI_IMAGE_PROVIDER_MODEL = "gpt-image-2";
export const AI_IMAGE_GENERATION_URL =
  process.env.IMAGE_GENERATION_URL ?? "https://api.boluopets.com/v1/images/generations";
export const AI_IMAGE_EDIT_URL =
  process.env.IMAGE_EDIT_URL ?? "https://api.boluopets.com/v1/images/edits";
export const AI_IMAGE_INPUT_COS_PREFIX = "share-project/ai-image-inputs";
export const AI_IMAGE_OUTPUT_COS_PREFIX = "share-project/ai-images";
```

- [ ] **Step 4: Add service types**

Create `lib/gamification/ai-image/types.ts`:

```ts
export type AiImageTaskStatus = "queued" | "running" | "completed" | "partial" | "failed";
export type AiImageItemStatus = "queued" | "running" | "completed" | "failed";
export type AiImageThemeUnlockSource = "default" | "draw";

export interface AiImageThemeDefinition {
  id: string;
  name: string;
  description: string;
  previewImageUrl: string;
  promptTemplate: string;
  defaultUnlocked: boolean;
  enabled: boolean;
  sortOrder: number;
  tag: string;
  palette: string[];
}

export interface AiImagePromptSnapshot {
  themeId: string;
  themeName: string;
  providerPrompt: string;
  clientPromptSummary: string;
}
```

- [ ] **Step 5: Add snapshot types to `lib/types.ts`**

Add:

```ts
export interface AiImageThemeSnapshot {
  id: string;
  name: string;
  description: string;
  previewImageUrl: string;
  defaultUnlocked: boolean;
  unlocked: boolean;
  enabled: boolean;
  sortOrder: number;
  tag: string;
  palette: string[];
}

export interface AiImageGenerationItemSnapshot {
  id: string;
  index: number;
  status: "queued" | "running" | "completed" | "failed";
  imageUrl: string | null;
  errorMessage: string | null;
}

export interface AiImageGenerationTaskSnapshot {
  id: string;
  themeId: string;
  userPrompt: string;
  requestedCount: number;
  status: "queued" | "running" | "completed" | "partial" | "failed";
  coinCost: number;
  refundedCoinAmount: number;
  errorMessage: string | null;
  retryAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  items: AiImageGenerationItemSnapshot[];
}

export interface AiImageArtworkSnapshot {
  id: string;
  taskId: string;
  itemId: string;
  themeId: string;
  imageUrl: string;
  createdAt: string;
}

export interface SupplyAiImageSnapshot {
  wallet: {
    coins: number;
    generationCostPerImage: number;
    themeDrawCost: number;
  };
  themes: {
    unlocked: AiImageThemeSnapshot[];
    locked: AiImageThemeSnapshot[];
    allUnlocked: boolean;
  };
  recentTasks: AiImageGenerationTaskSnapshot[];
  recentArtworks: AiImageArtworkSnapshot[];
}
```

- [ ] **Step 6: Add 13 preset themes**

Create `lib/gamification/ai-image/themes.ts` with:

```ts
import type { AiImageThemeDefinition } from "@/lib/gamification/ai-image/types";
import type { AiImageThemeSnapshot } from "@/lib/types";

const THEMES: AiImageThemeDefinition[] = [
  {
    id: "theme-01",
    name: "牛马像素馆",
    description: "把照片或文字变成粗边框像素健身角色。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_120.png",
    promptTemplate: "8-bit pixel art fitness poster, chunky black outlines, bold yellow and charcoal blocks, playful Chinese fitness team energy, clean composition.",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 1,
    tag: "像素",
    palette: ["#fde047", "#1f2937", "#f8fafc"],
  },
  {
    id: "theme-02",
    name: "工地减脂风",
    description: "安全帽、反光马甲、杠铃和水泥灰的硬核减脂照。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_020.png",
    promptTemplate: "construction-site fat-loss poster, hard hat, reflective vest, barbell, concrete gray, fluorescent yellow, bold brutalist typography feeling.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 2,
    tag: "硬核",
    palette: ["#facc15", "#525252", "#22c55e"],
  },
  {
    id: "theme-03",
    name: "低脂美食拟人",
    description: "鸡胸肉、西兰花和鸡蛋变成训练搭子。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_005.png",
    promptTemplate: "healthy low-fat food characters training together, chicken breast, broccoli, egg, humorous mascot style, bright editorial composition.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 3,
    tag: "食物",
    palette: ["#86efac", "#fef3c7", "#111827"],
  },
  {
    id: "theme-04",
    name: "复古港风健身达人",
    description: "90 年代港风海报质感的训练大片。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_task_reroll_coupon.png",
    promptTemplate: "1990s Hong Kong movie poster fitness portrait, warm film grain, dramatic gym lighting, retro Chinese poster mood.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 4,
    tag: "港风",
    palette: ["#f97316", "#0f172a", "#fef2f2"],
  },
  {
    id: "theme-05",
    name: "办公室减脂",
    description: "工位、电脑和偷偷训练的小动作。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_small_boost_coupon.png",
    promptTemplate: "office worker stealth fitness scene, desk, monitor, resistance band, humorous but polished, modern Chinese workplace energy.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 5,
    tag: "工位",
    palette: ["#38bdf8", "#f8fafc", "#334155"],
  },
  {
    id: "theme-06",
    name: "Brutalist 海报",
    description: "粗字体、强对比、几何图形的训练宣言。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coin_rich_coupon.png",
    promptTemplate: "brutalist fitness poster, huge bold typography feeling, strict grid, chunky border, yellow black white red accents, no generic neon.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 6,
    tag: "海报",
    palette: ["#fde047", "#111827", "#ef4444"],
  },
  {
    id: "theme-07",
    name: "肌肉萌宠",
    description: "宠物拟人举铁，轻松搞笑但不幼稚。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_team_invite_card.png",
    promptTemplate: "cute muscular pet mascot lifting weights, funny gym energy, expressive character design, polished illustration, bold outlines.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 7,
    tag: "萌宠",
    palette: ["#f9a8d4", "#fef08a", "#374151"],
  },
  {
    id: "theme-08",
    name: "瑜伽仙人",
    description: "东方修仙和瑜伽动作结合的轻盈场景。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_team_spark.png",
    promptTemplate: "eastern immortal yoga master, elegant stretching pose, misty mountain training ground, refined Chinese fantasy fitness poster.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 8,
    tag: "瑜伽",
    palette: ["#a7f3d0", "#c4b5fd", "#1f2937"],
  },
  {
    id: "theme-09",
    name: "赛博健身海报",
    description: "未来训练房和机械感灯牌，避开泛霓虹廉价感。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_leave_shield.png",
    promptTemplate: "cyber fitness poster, disciplined futuristic gym, mechanical light signage, sharp composition, restrained neon, premium sports editorial.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 9,
    tag: "赛博",
    palette: ["#22d3ee", "#111827", "#eab308"],
  },
  {
    id: "theme-10",
    name: "暴汗训练场",
    description: "训练后暴汗、灯牌和团队口号的现场感。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_boss_ticket.png",
    promptTemplate: "sweaty training arena, team slogan lightbox, post-workout energy, cinematic sports scene, bold local fitness community.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 10,
    tag: "暴汗",
    palette: ["#fb7185", "#f97316", "#111827"],
  },
  {
    id: "theme-11",
    name: "牛马漫画格",
    description: "四格漫画感，把训练瞬间变成吐槽剧情。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_meal_coupon.png",
    promptTemplate: "comic panel fitness story, four-panel energy, expressive Chinese captions feeling without readable text, funny workout struggle.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 11,
    tag: "漫画",
    palette: ["#ffffff", "#111827", "#60a5fa"],
  },
  {
    id: "theme-12",
    name: "训练贴纸包",
    description: "把人或物做成可爱的健身贴纸资产。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_priority_badge.png",
    promptTemplate: "fitness sticker pack style, clean cutout, white sticker border, playful gym accessories, transparent-background feeling.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 12,
    tag: "贴纸",
    palette: ["#fef3c7", "#34d399", "#111827"],
  },
  {
    id: "theme-13",
    name: "团队战报封面",
    description: "生成一张适合晒到团队战报里的封面图。",
    previewImageUrl: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_luckin_coffee.png",
    promptTemplate: "team fitness report cover, editorial layout, bold title space without readable text, achievement atmosphere, yellow black accent colors.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 13,
    tag: "战报",
    palette: ["#fde047", "#0f172a", "#f8fafc"],
  },
];

export function getAiImageThemes() {
  return [...THEMES].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getAiImageThemeById(themeId: string) {
  return getAiImageThemes().find((theme) => theme.id === themeId) ?? null;
}

export function getDefaultUnlockedAiImageThemeIds() {
  return getAiImageThemes()
    .filter((theme) => theme.enabled && theme.defaultUnlocked)
    .map((theme) => theme.id);
}

export function toClientThemeSnapshot(
  theme: AiImageThemeDefinition,
  unlocked: boolean,
): AiImageThemeSnapshot {
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    previewImageUrl: theme.previewImageUrl,
    defaultUnlocked: theme.defaultUnlocked,
    unlocked,
    enabled: theme.enabled,
    sortOrder: theme.sortOrder,
    tag: theme.tag,
    palette: theme.palette,
  };
}
```

- [ ] **Step 7: Add prompt builder**

Create `lib/gamification/ai-image/prompt.ts`:

```ts
import type { AiImageThemeDefinition, AiImagePromptSnapshot } from "@/lib/gamification/ai-image/types";

const USER_PROMPT_LIMIT = 240;

export function normalizeAiImageUserPrompt(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  if (normalized.length > USER_PROMPT_LIMIT) {
    throw new Error(`补充描述不能超过 ${USER_PROMPT_LIMIT} 个字符`);
  }

  return normalized;
}

export function buildPromptSnapshot({
  theme,
  userPrompt,
}: {
  theme: AiImageThemeDefinition;
  userPrompt?: string | null;
}): AiImagePromptSnapshot {
  const normalizedUserPrompt = normalizeAiImageUserPrompt(userPrompt);
  const providerPrompt = normalizedUserPrompt
    ? `${theme.promptTemplate}\n\nUser add-on: ${normalizedUserPrompt}`
    : theme.promptTemplate;

  return {
    themeId: theme.id,
    themeName: theme.name,
    providerPrompt,
    clientPromptSummary: normalizedUserPrompt,
  };
}
```

- [ ] **Step 8: Run focused tests**

Run:

```bash
npm test -- __tests__/ai-image-themes.test.ts __tests__/ai-image-prompt.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/gamification/ai-image/constants.ts lib/gamification/ai-image/types.ts lib/gamification/ai-image/themes.ts lib/gamification/ai-image/prompt.ts lib/types.ts __tests__/ai-image-themes.test.ts __tests__/ai-image-prompt.test.ts
git commit -m "feat: add ai image preset themes"
```

---

## Task 5: Build Provider And COS Storage Services

**Files:**
- Create: `lib/gamification/ai-image/provider.ts`
- Create: `lib/gamification/ai-image/cos-storage.ts`
- Test: `__tests__/ai-image-provider.test.ts`
- Test: `__tests__/ai-image-cos-storage.test.ts`

**Interfaces:**
- Produces `generateAiImage(input): Promise<{ b64Json: string; mimeType: string }>` and `uploadAiImageDataUrl(input): Promise<{ imageUrl: string; cosKey: string; sizeBytes: number; mimeType: string }>` plus `uploadAiImageBase64(input)`.
- Consumes env vars: `BOLUOPETS_API_KEY`, `IMAGE_GENERATION_URL`, `IMAGE_EDIT_URL`, `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`, `COS_PUBLIC_BASE_URL`.

- [ ] **Step 1: Write provider tests**

Create `__tests__/ai-image-provider.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAiImage } from "@/lib/gamification/ai-image/provider";

describe("AI image provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses the generation endpoint when no reference images are provided", async () => {
    vi.stubEnv("BOLUOPETS_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: Buffer.from("ok").toString("base64") }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateAiImage({ prompt: "pixel poster", referenceImages: [] })).resolves.toMatchObject({
      mimeType: "image/png",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.boluopets.com/v1/images/generations",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses the edit endpoint when reference images are provided", async () => {
    vi.stubEnv("BOLUOPETS_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: Buffer.from("ok").toString("base64") }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateAiImage({
      prompt: "with input",
      referenceImages: [{ dataUrl: "data:image/png;base64,aGVsbG8=", filename: "input.png" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.boluopets.com/v1/images/edits",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws a Chinese error when API key is missing", async () => {
    vi.stubEnv("BOLUOPETS_API_KEY", "");

    await expect(generateAiImage({ prompt: "x", referenceImages: [] })).rejects.toThrow("缺少生图 API Key");
  });
});
```

- [ ] **Step 2: Write COS tests**

Create `__tests__/ai-image-cos-storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildAiImageCosKey,
  parseImageDataUrl,
} from "@/lib/gamification/ai-image/cos-storage";

describe("AI image COS storage helpers", () => {
  it("parses png data URLs", () => {
    const parsed = parseImageDataUrl("data:image/png;base64,aGVsbG8=");

    expect(parsed.mimeType).toBe("image/png");
    expect(parsed.buffer.toString()).toBe("hello");
    expect(parsed.extension).toBe("png");
  });

  it("rejects non-data-url inputs", () => {
    expect(() => parseImageDataUrl("https://example.com/image.png")).toThrow("参考图格式不是 data URL");
  });

  it("builds stable output and input COS keys", () => {
    expect(
      buildAiImageCosKey({
        kind: "output",
        userId: "u1",
        id: "item1",
        extension: "png",
        now: new Date("2026-07-06T12:00:00+08:00"),
      }),
    ).toBe("share-project/ai-images/u1/2026/07/06/item1/original.png");

    expect(
      buildAiImageCosKey({
        kind: "input",
        userId: "u1",
        id: "input1",
        extension: "jpg",
        now: new Date("2026-07-06T12:00:00+08:00"),
      }),
    ).toBe("share-project/ai-image-inputs/u1/2026/07/06/input1/original.jpg");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- __tests__/ai-image-provider.test.ts __tests__/ai-image-cos-storage.test.ts
```

Expected: FAIL because provider and COS modules do not exist.

- [ ] **Step 4: Implement provider**

Create `lib/gamification/ai-image/provider.ts` by translating the relevant behavior from `/Users/vincent/Projects/IPStudio/lib/server/imageGeneration.ts`:

```ts
import {
  AI_IMAGE_EDIT_URL,
  AI_IMAGE_GENERATION_URL,
  AI_IMAGE_MAX_REFERENCE_IMAGES,
  AI_IMAGE_PROVIDER_MODEL,
} from "@/lib/gamification/ai-image/constants";
import { parseImageDataUrl } from "@/lib/gamification/ai-image/cos-storage";

export interface AiImageReferenceInput {
  dataUrl: string;
  filename: string;
}

export interface GenerateAiImageInput {
  prompt: string;
  referenceImages: AiImageReferenceInput[];
}

export interface GenerateAiImageResult {
  b64Json: string;
  mimeType: "image/png";
}

function getProviderApiKey() {
  return process.env.BOLUOPETS_API_KEY?.trim() || process.env.VITE_BOLUOPETS_API_KEY?.trim() || "";
}

async function readProviderB64(response: Response): Promise<GenerateAiImageResult> {
  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "生图服务请求失败");
  }

  const b64Json = payload?.data?.[0]?.b64_json;

  if (!b64Json) {
    throw new Error("生图服务没有返回图片");
  }

  return { b64Json, mimeType: "image/png" };
}

export async function generateAiImage(input: GenerateAiImageInput): Promise<GenerateAiImageResult> {
  const apiKey = getProviderApiKey();

  if (!apiKey) {
    throw new Error("缺少生图 API Key");
  }

  if (input.referenceImages.length > AI_IMAGE_MAX_REFERENCE_IMAGES) {
    throw new Error(`参考图最多 ${AI_IMAGE_MAX_REFERENCE_IMAGES} 张`);
  }

  if (input.referenceImages.length === 0) {
    const response = await fetch(AI_IMAGE_GENERATION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_IMAGE_PROVIDER_MODEL,
        prompt: input.prompt,
        response_format: "b64_json",
      }),
    });

    return readProviderB64(response);
  }

  const form = new FormData();
  form.set("model", AI_IMAGE_PROVIDER_MODEL);
  form.set("prompt", input.prompt);
  form.set("response_format", "b64_json");

  for (const reference of input.referenceImages) {
    const parsed = parseImageDataUrl(reference.dataUrl);
    form.append("image", new Blob([parsed.buffer], { type: parsed.mimeType }), reference.filename);
  }

  const response = await fetch(AI_IMAGE_EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  return readProviderB64(response);
}
```

- [ ] **Step 5: Implement COS storage**

Create `lib/gamification/ai-image/cos-storage.ts` by translating the relevant behavior from `/Users/vincent/Projects/IPStudio/lib/server/cosStorage.ts`:

```ts
import COS from "cos-nodejs-sdk-v5";
import {
  AI_IMAGE_INPUT_COS_PREFIX,
  AI_IMAGE_OUTPUT_COS_PREFIX,
} from "@/lib/gamification/ai-image/constants";

export interface ParsedImageDataUrl {
  buffer: Buffer;
  mimeType: string;
  extension: "png" | "jpg" | "webp";
  sizeBytes: number;
}

export function parseImageDataUrl(dataUrl: string): ParsedImageDataUrl {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);

  if (!match) {
    throw new Error("参考图格式不是 data URL");
  }

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.replace("image/", "") as "png" | "webp";

  return { buffer, mimeType, extension, sizeBytes: buffer.byteLength };
}

export function buildAiImageCosKey({
  extension,
  id,
  kind,
  now = new Date(),
  userId,
}: {
  kind: "input" | "output";
  userId: string;
  id: string;
  extension: string;
  now?: Date;
}) {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const prefix = kind === "input" ? AI_IMAGE_INPUT_COS_PREFIX : AI_IMAGE_OUTPUT_COS_PREFIX;

  return `${prefix}/${userId}/${year}/${month}/${day}/${id}/original.${extension}`;
}

function getCosClient() {
  const SecretId = process.env.COS_SECRET_ID;
  const SecretKey = process.env.COS_SECRET_KEY;

  if (!SecretId || !SecretKey) {
    throw new Error("缺少 COS 密钥配置");
  }

  return new COS({ SecretId, SecretKey });
}

function getCosConfig() {
  const Bucket = process.env.COS_BUCKET;
  const Region = process.env.COS_REGION;
  const publicBaseUrl = process.env.COS_PUBLIC_BASE_URL;

  if (!Bucket || !Region || !publicBaseUrl) {
    throw new Error("缺少 COS 存储配置");
  }

  return { Bucket, Region, publicBaseUrl: publicBaseUrl.replace(/\/$/, "") };
}

export async function uploadAiImageBuffer({
  buffer,
  cosKey,
  mimeType,
}: {
  buffer: Buffer;
  cosKey: string;
  mimeType: string;
}) {
  const cos = getCosClient();
  const config = getCosConfig();

  await cos.putObject({
    Bucket: config.Bucket,
    Region: config.Region,
    Key: cosKey,
    Body: buffer,
    ContentType: mimeType,
  });

  return {
    imageUrl: `${config.publicBaseUrl}/${cosKey}`,
    cosKey,
  };
}

export async function uploadAiImageDataUrl({
  dataUrl,
  id,
  kind,
  userId,
}: {
  dataUrl: string;
  kind: "input" | "output";
  userId: string;
  id: string;
}) {
  const parsed = parseImageDataUrl(dataUrl);
  const cosKey = buildAiImageCosKey({
    kind,
    userId,
    id,
    extension: parsed.extension,
  });
  const stored = await uploadAiImageBuffer({ buffer: parsed.buffer, cosKey, mimeType: parsed.mimeType });

  return { ...stored, mimeType: parsed.mimeType, sizeBytes: parsed.sizeBytes };
}
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- __tests__/ai-image-provider.test.ts __tests__/ai-image-cos-storage.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/gamification/ai-image/provider.ts lib/gamification/ai-image/cos-storage.ts __tests__/ai-image-provider.test.ts __tests__/ai-image-cos-storage.test.ts package.json package-lock.json
git commit -m "feat: add ai image provider and cos storage"
```

---

## Task 6: Implement AI Image Task Service, Runner, And Retry

**Files:**
- Create: `lib/gamification/ai-image/tasks.ts`
- Create: `lib/gamification/ai-image/task-runner.ts`
- Create: `lib/gamification/ai-image/theme-unlocks.ts`
- Test: `__tests__/ai-image-tasks.test.ts`

**Interfaces:**
- Produces `createAiImageTask`, `getAiImageTaskForUser`, `retryAiImageTask`, `settleTimedOutAiImageTask`, `drawAiImageTheme`.
- Runner depends on injectable `provider` and `upload` functions in tests.

- [ ] **Step 1: Write task service tests**

Create `__tests__/ai-image-tasks.test.ts` with cases:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { createAiImageTask, getAiImageTaskForUser, retryAiImageTask } from "@/lib/gamification/ai-image/tasks";
import { drawAiImageTheme } from "@/lib/gamification/ai-image/theme-unlocks";
import { prisma } from "@/lib/prisma";

describe("AI image task service", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a charged 1/2/4 task with queued items", async () => {
    const task = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "暴汗训练后",
      requestedCount: 4,
      referenceImages: [],
      startRunner: false,
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const items = await prisma.aiImageGenerationItem.findMany({ where: { taskId: task.id } });

    expect(task.status).toBe("queued");
    expect(task.coinCost).toBe(240);
    expect(user.coins).toBe(760);
    expect(items).toHaveLength(4);
  });

  it("rejects locked themes", async () => {
    await expect(
      createAiImageTask({
        userId,
        themeId: "theme-02",
        userPrompt: "",
        requestedCount: 1,
        referenceImages: [],
        startRunner: false,
      }),
    ).rejects.toThrow("主题未解锁");
  });

  it("draws an unowned theme and charges coins", async () => {
    const result = await drawAiImageTheme({ userId, rng: () => 0 });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(result.theme.unlocked).toBe(true);
    expect(result.theme.defaultUnlocked).toBe(false);
    expect(user.coins).toBe(800);
  });

  it("retries failed tasks with original prompt and failed count", async () => {
    const original = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "retry me",
      requestedCount: 2,
      referenceImages: [],
      startRunner: false,
    });
    await prisma.aiImageGenerationItem.updateMany({
      where: { taskId: original.id },
      data: { status: "failed", errorMessage: "mock" },
    });
    await prisma.aiImageGenerationTask.update({
      where: { id: original.id },
      data: { status: "failed", coinRefunded: true, refundedCoinAmount: 120 },
    });
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });

    const retry = await retryAiImageTask({ userId, taskId: original.id, startRunner: false });
    const retryItems = await prisma.aiImageGenerationItem.findMany({ where: { taskId: retry.id } });

    expect(retry.retryOfTaskId).toBe(original.id);
    expect(retry.requestedCount).toBe(2);
    expect(retryItems).toHaveLength(2);
  });

  it("does not expose another user's task", async () => {
    const other = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    const task = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "",
      requestedCount: 1,
      referenceImages: [],
      startRunner: false,
    });

    await expect(getAiImageTaskForUser({ userId: other.id, taskId: task.id })).rejects.toThrow("任务不存在");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/ai-image-tasks.test.ts
```

Expected: FAIL because service modules do not exist.

- [ ] **Step 3: Implement theme unlock service**

Create `lib/gamification/ai-image/theme-unlocks.ts` with functions:

```ts
export async function getUnlockedAiImageThemeIds(userId: string): Promise<Set<string>>;
export async function assertAiImageThemeUnlocked(input: { userId: string; themeId: string }): Promise<void>;
export async function drawAiImageTheme(input: { userId: string; rng?: () => number }): Promise<{ theme: AiImageThemeSnapshot }>;
```

Implementation rules:
- Default unlocked themes count as unlocked without database rows.
- `drawAiImageTheme` charges `AI_IMAGE_THEME_DRAW_COIN_COST`.
- Draw pool is enabled themes not already unlocked.
- If no candidates remain, throw `"主题已集齐"` without charging.
- Use `prisma.$transaction` for coin decrement and unlock creation.

- [ ] **Step 4: Implement task service**

Create `lib/gamification/ai-image/tasks.ts` with exported signatures:

```ts
export class AiImageTaskError extends Error {
  readonly status: number;
}

export interface CreateAiImageTaskInput {
  userId: string;
  themeId: string;
  userPrompt?: string;
  requestedCount: 1 | 2 | 4;
  referenceImages: Array<{ dataUrl: string; filename: string }>;
  startRunner?: boolean;
}

export async function createAiImageTask(input: CreateAiImageTaskInput): Promise<AiImageGenerationTask>;
export async function getAiImageTaskForUser(input: { userId: string; taskId: string }): Promise<AiImageGenerationTaskSnapshot>;
export async function retryAiImageTask(input: { userId: string; taskId: string; startRunner?: boolean }): Promise<AiImageGenerationTask>;
export async function settleTimedOutAiImageTask(input: { taskId: string; now?: Date }): Promise<void>;
```

Implementation rules:
- Validate `requestedCount` is 1 / 2 / 4 for normal creation.
- Validate reference image count is 0..3.
- Check user exists and load `teamId`.
- Check theme exists, enabled, and unlocked.
- `coinCost = AI_IMAGE_GENERATION_COIN_COST * requestedCount`.
- Transaction decrements coins, creates task, creates item rows, uploads input images to COS after the task id exists, and creates input image rows.
- If input image upload fails after coins are deducted, mark task `failed` and refund all coins in the same service flow.
- `retryAiImageTask` only accepts `failed` or `partial`; for `partial`, retry only failed item count.
- Retry reuses original `themeId`, `userPrompt`, `promptSnapshotJson`, and input images.
- `getAiImageTaskForUser` returns client-safe task snapshot with `retryAvailable`.

- [ ] **Step 5: Implement runner**

Create `lib/gamification/ai-image/task-runner.ts` with:

```ts
export async function runAiImageTask(taskId: string): Promise<void>;
export function enqueueAiImageTask(taskId: string): void;
```

Implementation rules:
- `enqueueAiImageTask` calls `void runAiImageTask(taskId)` in-process.
- Runner loads task with queued/failed items and input images.
- Each item calls `generateAiImage({ prompt, referenceImages })`.
- For stored input images, runner fetches each `imageUrl`, converts the bytes back to a `data:<mime>;base64,...` value, and passes those data URLs to `generateAiImage`.
- Each successful result uploads output image to COS and creates `AiImageArtwork`.
- Each failed item records Chinese-safe `errorMessage`.
- After all items settle, task status becomes `completed`, `partial`, or `failed`.
- Full failure refunds all `coinCost`; partial failure refunds `failedItemCount * AI_IMAGE_GENERATION_COIN_COST`.
- Refund updates `User.coins`, `coinRefunded`, and `refundedCoinAmount`.

- [ ] **Step 6: Run focused test**

Run:

```bash
npm test -- __tests__/ai-image-tasks.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/gamification/ai-image/tasks.ts lib/gamification/ai-image/task-runner.ts lib/gamification/ai-image/theme-unlocks.ts __tests__/ai-image-tasks.test.ts
git commit -m "feat: add ai image task service"
```

---

## Task 7: Add AI Image API Routes

**Files:**
- Create: `app/api/gamification/ai-image/tasks/route.ts`
- Create: `app/api/gamification/ai-image/tasks/[taskId]/route.ts`
- Create: `app/api/gamification/ai-image/tasks/[taskId]/retry/route.ts`
- Create: `app/api/gamification/ai-image/themes/draw/route.ts`
- Modify: `lib/api.ts`
- Test: `__tests__/ai-image-api.test.ts`
- Test: `__tests__/ai-image-theme-draw-api.test.ts`

**Interfaces:**
- API routes return `{ taskId }`, `{ task }`, and `{ theme }` or `{ snapshot }` as described in the spec.
- Client helpers: `createAiImageTask`, `fetchAiImageTask`, `retryAiImageTask`, `drawAiImageTheme`.

- [ ] **Step 1: Write API tests**

Create `__tests__/ai-image-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST as CREATE } from "@/app/api/gamification/ai-image/tasks/route";
import { GET as DETAIL } from "@/app/api/gamification/ai-image/tasks/[taskId]/route";
import { POST as RETRY } from "@/app/api/gamification/ai-image/tasks/[taskId]/retry/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(url: string, userId?: string, body?: unknown) {
  return new NextRequest(url, {
    method: body ? "POST" : "GET",
    headers: {
      ...(userId ? { cookie: `userId=${createCookieValue(userId)}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("AI image task API", () => {
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requires login", async () => {
    const response = await CREATE(request("http://localhost/api/gamification/ai-image/tasks", undefined, {}));
    expect(response.status).toBe(401);
  });

  it("creates a task", async () => {
    const response = await CREATE(
      request("http://localhost/api/gamification/ai-image/tasks", userId, {
        themeId: "theme-01",
        userPrompt: "训练后",
        requestedCount: 1,
        referenceImages: [],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.taskId).toEqual(expect.any(String));
  });

  it("returns task detail only to owner", async () => {
    const createResponse = await CREATE(
      request("http://localhost/api/gamification/ai-image/tasks", userId, {
        themeId: "theme-01",
        requestedCount: 1,
        referenceImages: [],
      }),
    );
    const { taskId } = await createResponse.json();
    const detail = await DETAIL(
      request(`http://localhost/api/gamification/ai-image/tasks/${taskId}`, userId),
      { params: Promise.resolve({ taskId }) },
    );

    expect(detail.status).toBe(200);
    await expect(detail.json()).resolves.toHaveProperty("task.id", taskId);
  });

  it("retries failed tasks", async () => {
    const createResponse = await CREATE(
      request("http://localhost/api/gamification/ai-image/tasks", userId, {
        themeId: "theme-01",
        requestedCount: 1,
        referenceImages: [],
      }),
    );
    const { taskId } = await createResponse.json();
    await prisma.aiImageGenerationTask.update({
      where: { id: taskId },
      data: { status: "failed", coinRefunded: true, refundedCoinAmount: 60 },
    });
    await prisma.aiImageGenerationItem.updateMany({
      where: { taskId },
      data: { status: "failed", errorMessage: "mock" },
    });

    const response = await RETRY(
      request(`http://localhost/api/gamification/ai-image/tasks/${taskId}/retry`, userId, {}),
      { params: Promise.resolve({ taskId }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.taskId).toEqual(expect.any(String));
  });
});
```

Create `__tests__/ai-image-theme-draw-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/ai-image/themes/draw/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/gamification/ai-image/themes/draw", {
    method: "POST",
    headers: userId ? { cookie: `userId=${createCookieValue(userId)}` } : undefined,
    body: JSON.stringify({}),
  });
}

describe("AI image theme draw API", () => {
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("draws a locked theme with coins", async () => {
    const response = await POST(request(userId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.theme.unlocked).toBe(true);
  });
});
```

- [ ] **Step 2: Run API tests to verify they fail**

Run:

```bash
npm test -- __tests__/ai-image-api.test.ts __tests__/ai-image-theme-draw-api.test.ts
```

Expected: FAIL because routes do not exist.

- [ ] **Step 3: Implement routes**

Each route must use `parseCookieValue(request.cookies.get("userId")?.value)` and map `AiImageTaskError` to JSON `{ error }`.

`app/api/gamification/ai-image/tasks/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { AiImageTaskError, createAiImageTask } from "@/lib/gamification/ai-image/tasks";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);
    if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const payload = (await request.json().catch(() => ({}))) as {
      themeId?: string;
      userPrompt?: string;
      requestedCount?: 1 | 2 | 4;
      referenceImages?: Array<{ dataUrl: string; filename: string }>;
    };

    const task = await createAiImageTask({
      userId,
      themeId: payload.themeId ?? "",
      userPrompt: payload.userPrompt,
      requestedCount: payload.requestedCount ?? 1,
      referenceImages: Array.isArray(payload.referenceImages) ? payload.referenceImages : [],
    });

    return NextResponse.json({ taskId: task.id });
  } catch (error) {
    if (error instanceof AiImageTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

`app/api/gamification/ai-image/tasks/[taskId]/route.ts` must export:

```ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const userId = parseCookieValue(request.cookies.get("userId")?.value);
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { taskId } = await params;
  const task = await getAiImageTaskForUser({ userId, taskId });
  return NextResponse.json({ task });
}
```

`app/api/gamification/ai-image/tasks/[taskId]/retry/route.ts` must export:

```ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const userId = parseCookieValue(request.cookies.get("userId")?.value);
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { taskId } = await params;
  const task = await retryAiImageTask({ userId, taskId });
  return NextResponse.json({ taskId: task.id });
}
```

`app/api/gamification/ai-image/themes/draw/route.ts` must export:

```ts
export async function POST(request: NextRequest) {
  const userId = parseCookieValue(request.cookies.get("userId")?.value);
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const result = await drawAiImageTheme({ userId });
  return NextResponse.json(result);
}
```

- [ ] **Step 4: Add client helpers to `lib/api.ts`**

Add:

```ts
export async function createAiImageGenerationTask(payload: {
  themeId: string;
  userPrompt?: string;
  requestedCount: 1 | 2 | 4;
  referenceImages: Array<{ dataUrl: string; filename: string }>;
}): Promise<{ taskId: string }> {
  const response = await fetch("/api/gamification/ai-image/tasks", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return readApiResult(response, "创建生图任务失败");
}

export async function fetchAiImageGenerationTask(taskId: string): Promise<{ task: AiImageGenerationTaskSnapshot }> {
  const response = await fetch(`/api/gamification/ai-image/tasks/${taskId}`, {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readApiResult(response, "获取生图任务失败");
}

export async function retryAiImageGenerationTask(taskId: string): Promise<{ taskId: string }> {
  const response = await fetch(`/api/gamification/ai-image/tasks/${taskId}/retry`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  return readApiResult(response, "重试生图任务失败");
}

export async function drawAiImageThemeFromSupply(): Promise<{ theme: AiImageThemeSnapshot }> {
  const response = await fetch("/api/gamification/ai-image/themes/draw", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  return readApiResult(response, "抽取生图主题失败");
}
```

Also import `AiImageGenerationTaskSnapshot` and `AiImageThemeSnapshot` from `@/lib/types`.

- [ ] **Step 5: Run API tests**

Run:

```bash
npm test -- __tests__/ai-image-api.test.ts __tests__/ai-image-theme-draw-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/gamification/ai-image lib/api.ts __tests__/ai-image-api.test.ts __tests__/ai-image-theme-draw-api.test.ts
git commit -m "feat: add ai image api routes"
```

---

## Task 8: Build Supply AI Snapshot And Stop Old Task Auto-Generation

**Files:**
- Create: `lib/gamification/ai-image/snapshot.ts`
- Create: `lib/gamification/legacy-supply-archive.ts`
- Modify: `lib/gamification/supply-view-model.ts`
- Modify: `app/api/gamification/supply/state/route.ts`
- Modify: `lib/types.ts`
- Modify: `lib/supply-nav-context.ts`
- Modify: `lib/navigation-routes.ts`
- Test: `__tests__/supply-ai-image-snapshot.test.ts`
- Modify tests: `__tests__/gamification-supply-state-api.test.ts`, `__tests__/supply-production-view-model.test.ts`, `__tests__/home-supply-navigation.test.ts`

**Interfaces:**
- Produces `SupplyStationProductionSnapshot.supplyAiImage`.
- Removes `resources.ticket` from primary snapshot and prevents `/api/gamification/supply/state` from calling `ensureTodayTaskAssignments`.

- [ ] **Step 1: Write snapshot test**

Create `__tests__/supply-ai-image-snapshot.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { buildSupplyStationViewModelForUser } from "@/lib/gamification/supply-view-model";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

describe("supply AI image snapshot", () => {
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 800, ticketBalance: 5 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns coins, AI themes, recent tasks, artworks, and no primary ticket resource", async () => {
    const snapshot = await buildSupplyStationViewModelForUser(userId, new Date("2026-07-06T09:00:00+08:00"));

    expect(snapshot?.resources).toEqual({
      coins: { label: "银子", value: 800 },
    });
    expect(snapshot?.supplyAiImage.wallet).toMatchObject({
      coins: 800,
      generationCostPerImage: 60,
      themeDrawCost: 200,
    });
    expect(snapshot?.supplyAiImage.themes.unlocked).toHaveLength(1);
    expect(snapshot?.supplyAiImage.themes.locked).toHaveLength(12);
    expect(JSON.stringify(snapshot)).not.toContain("promptTemplate");
  });

  it("does not require old daily task assignments", async () => {
    const dayKey = getShanghaiDayKey(new Date("2026-07-06T09:00:00+08:00"));
    await buildSupplyStationViewModelForUser(userId, new Date("2026-07-06T09:00:00+08:00"));

    await expect(prisma.dailyTaskAssignment.count({ where: { userId, dayKey } })).resolves.toBe(0);
  });
});
```

- [ ] **Step 2: Update old API test expectation**

In `__tests__/gamification-supply-state-api.test.ts`, replace the old test `"ensures today's tasks and returns production supply snapshot"` with:

```ts
  it("returns production supply snapshot without creating old daily tasks", async () => {
    const dayKey = getShanghaiDayKey();

    await expect(prisma.dailyTaskAssignment.count({ where: { userId, dayKey } })).resolves.toBe(0);

    const response = await GET(request(userId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot).toMatchObject({
      currentUserId: userId,
      teamId,
      dayKey,
      resources: {
        coins: { label: "银子" },
      },
      supplyAiImage: {
        wallet: {
          generationCostPerImage: 60,
          themeDrawCost: 200,
        },
      },
    });
    expect(body.snapshot.resources.ticket).toBeUndefined();
    expect(body.snapshot.dashboard.dailyQuests).toEqual([]);
    await expect(prisma.dailyTaskAssignment.count({ where: { userId, dayKey } })).resolves.toBe(0);
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
npm test -- __tests__/supply-ai-image-snapshot.test.ts __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts __tests__/home-supply-navigation.test.ts
```

Expected: FAIL because snapshot shape still includes tickets and old tasks.

- [ ] **Step 4: Implement `buildSupplyAiImageSnapshot`**

Create `lib/gamification/ai-image/snapshot.ts`:

```ts
import {
  AI_IMAGE_GENERATION_COIN_COST,
  AI_IMAGE_THEME_DRAW_COIN_COST,
} from "@/lib/gamification/ai-image/constants";
import { getAiImageThemes, toClientThemeSnapshot } from "@/lib/gamification/ai-image/themes";
import { getUnlockedAiImageThemeIds } from "@/lib/gamification/ai-image/theme-unlocks";
import { prisma } from "@/lib/prisma";
import type { SupplyAiImageSnapshot } from "@/lib/types";

export async function buildSupplyAiImageSnapshot({
  userId,
  teamId,
  coins,
}: {
  userId: string;
  teamId: string;
  coins: number;
}): Promise<SupplyAiImageSnapshot> {
  const unlockedIds = await getUnlockedAiImageThemeIds(userId);
  const themeSnapshots = getAiImageThemes()
    .filter((theme) => theme.enabled)
    .map((theme) => toClientThemeSnapshot(theme, unlockedIds.has(theme.id)));

  const recentTasks = await prisma.aiImageGenerationTask.findMany({
    where: { userId, teamId },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { items: { orderBy: { index: "asc" } } },
  });

  const recentArtworks = await prisma.aiImageArtwork.findMany({
    where: { userId, teamId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return {
    wallet: {
      coins,
      generationCostPerImage: AI_IMAGE_GENERATION_COIN_COST,
      themeDrawCost: AI_IMAGE_THEME_DRAW_COIN_COST,
    },
    themes: {
      unlocked: themeSnapshots.filter((theme) => theme.unlocked),
      locked: themeSnapshots.filter((theme) => !theme.unlocked),
      allUnlocked: themeSnapshots.every((theme) => theme.unlocked),
    },
    recentTasks: recentTasks.map((task) => ({
      id: task.id,
      themeId: task.themeId,
      userPrompt: task.userPrompt ?? "",
      requestedCount: task.requestedCount,
      status: task.status as SupplyAiImageSnapshot["recentTasks"][number]["status"],
      coinCost: task.coinCost,
      refundedCoinAmount: task.refundedCoinAmount,
      errorMessage: task.errorMessage,
      retryAvailable: task.status === "failed" || task.status === "partial",
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      items: task.items.map((item) => ({
        id: item.id,
        index: item.index,
        status: item.status as SupplyAiImageSnapshot["recentTasks"][number]["items"][number]["status"],
        imageUrl: item.imageUrl,
        errorMessage: item.errorMessage,
      })),
    })),
    recentArtworks: recentArtworks.map((artwork) => ({
      id: artwork.id,
      taskId: artwork.taskId,
      itemId: artwork.itemId,
      themeId: artwork.themeId,
      imageUrl: artwork.imageUrl,
      createdAt: artwork.createdAt.toISOString(),
    })),
  };
}
```

- [ ] **Step 5: Implement legacy archive**

Create `lib/gamification/legacy-supply-archive.ts`:

```ts
import { prisma } from "@/lib/prisma";

export interface SupplyLegacyArchiveSnapshot {
  ticketBalance: number;
  inventoryQuantity: number;
  redemptionCount: number;
  latestTaskRecordCount: number;
}

export async function buildLegacySupplyArchiveSnapshot({
  userId,
  teamId,
  ticketBalance,
}: {
  userId: string;
  teamId: string;
  ticketBalance: number;
}): Promise<SupplyLegacyArchiveSnapshot> {
  const [inventoryQuantity, redemptionCount, latestTaskRecordCount] = await Promise.all([
    prisma.inventoryItem.aggregate({
      where: { userId, teamId },
      _sum: { quantity: true },
    }),
    prisma.realWorldRedemption.count({ where: { userId, teamId } }),
    prisma.dailyTaskAssignment.count({ where: { userId, teamId } }),
  ]);

  return {
    ticketBalance,
    inventoryQuantity: inventoryQuantity._sum.quantity ?? 0,
    redemptionCount,
    latestTaskRecordCount,
  };
}
```

- [ ] **Step 6: Update `SupplyStationProductionSnapshot`**

In `lib/types.ts`:
- Change `resources` to only include `coins`.
- Set `dashboard.dailyQuests` to remain typed but allow empty list.
- Add `supplyAiImage: SupplyAiImageSnapshot`.
- Add `legacyArchive: SupplyLegacyArchiveSnapshot` or inline equivalent.

- [ ] **Step 7: Update view model**

In `lib/gamification/supply-view-model.ts`:
- Import `buildSupplyAiImageSnapshot`.
- Import `buildLegacySupplyArchiveSnapshot`.
- Keep `buildGamificationStateForUser` for profile/exp/social/redemptions if needed.
- Return:

```ts
resources: {
  coins: { label: "银子", value: user.coins },
},
dashboard: {
  dailyQuests: [],
  todayEffects: [],
},
drawPool: {
  wallet: {
    ...snapshot.ticketSummary,
    ticketBalance: 0,
  },
  lottery: {
    ...snapshot.lottery,
    status: "active",
    singleDrawEnabled: false,
    tenDrawEnabled: false,
    message: "旧抽奖池已下线，主题扭蛋请使用 AI 生图入口。",
  },
},
shop: { products: [] },
supplyAiImage: await buildSupplyAiImageSnapshot({ userId: user.id, teamId: snapshot.teamId, coins: user.coins }),
legacyArchive: await buildLegacySupplyArchiveSnapshot({ userId: user.id, teamId: snapshot.teamId, ticketBalance: user.ticketBalance }),
```

- [ ] **Step 8: Stop state API from creating old tasks**

In `app/api/gamification/supply/state/route.ts`:
- Remove imports of `ensureTodayTaskAssignments` and `GamificationTaskError`.
- Remove `await ensureTodayTaskAssignments({ userId });`.
- Keep 401 and 500 behavior.

- [ ] **Step 9: Update supply nav context**

In `lib/navigation-routes.ts`, change:

```ts
export type SupplyNavResourceId = "coins" | "backpack";
```

In `lib/supply-nav-context.ts`, remove ticket from resource mapping and map artwork count or legacy archive count only if the existing nav contract still needs a second resource. Preferred Phase 1 primary resources: coins only.

- [ ] **Step 10: Run focused tests**

Run:

```bash
npm test -- __tests__/supply-ai-image-snapshot.test.ts __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts __tests__/home-supply-navigation.test.ts
```

Expected: PASS after updating old expected snapshots.

- [ ] **Step 11: Commit**

```bash
git add lib/gamification/ai-image/snapshot.ts lib/gamification/legacy-supply-archive.ts lib/gamification/supply-view-model.ts app/api/gamification/supply/state/route.ts lib/types.ts lib/supply-nav-context.ts lib/navigation-routes.ts __tests__/supply-ai-image-snapshot.test.ts __tests__/gamification-supply-state-api.test.ts __tests__/supply-production-view-model.test.ts __tests__/home-supply-navigation.test.ts
git commit -m "feat: add ai image supply snapshot"
```

---

## Task 9: Replace Production Supply Shell With AI Image Panels

**Files:**
- Create: `components/gamification/production/SupplyAiImageStudioPanel.tsx`
- Create: `components/gamification/production/SupplyThemeGachaPanel.tsx`
- Create: `components/gamification/production/SupplyArtworkBackpackPanel.tsx`
- Create: `components/gamification/production/SupplyLegacyArchivePanel.tsx`
- Modify: `components/gamification/production/SupplyStationShell.tsx`
- Test: `__tests__/supply-ai-image-studio-panel.test.tsx`
- Test: `__tests__/supply-ai-image-shell.test.tsx`
- Modify tests: `__tests__/supply-production-shell.test.tsx`, `__tests__/supply-production-visual-contract.test.tsx`

**Interfaces:**
- `SupplyProductionPanel = "studio" | "themeGacha" | "artworks" | "legacyArchive"`.
- `SupplyAiImageStudioPanel` accepts snapshot data and callbacks; it does not fetch by itself except task polling through callback props or `lib/api.ts`.

- [ ] **Step 1: Write studio panel test**

Create `__tests__/supply-ai-image-studio-panel.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyAiImageStudioPanel } from "@/components/gamification/production/SupplyAiImageStudioPanel";
import type { SupplyAiImageSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot: SupplyAiImageSnapshot = {
  wallet: { coins: 800, generationCostPerImage: 60, themeDrawCost: 200 },
  themes: {
    unlocked: [{
      id: "theme-01",
      name: "牛马像素馆",
      description: "像素风",
      previewImageUrl: "https://example.com/theme.png",
      defaultUnlocked: true,
      unlocked: true,
      enabled: true,
      sortOrder: 1,
      tag: "像素",
      palette: ["#fde047"],
    }],
    locked: [],
    allUnlocked: false,
  },
  recentTasks: [],
  recentArtworks: [],
};

describe("SupplyAiImageStudioPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders wallet, themes, count selector, prompt input, and generate button", () => {
    const onCreateTask = vi.fn();

    act(() => {
      root.render(<SupplyAiImageStudioPanel snapshot={snapshot} onCreateTask={onCreateTask} onRetryTask={vi.fn()} />);
    });

    expect(container.textContent).toContain("800");
    expect(container.textContent).toContain("牛马像素馆");
    expect(container.querySelector("textarea")).not.toBeNull();
    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "1")).toBe(true);
    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "2")).toBe(true);
    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "4")).toBe(true);
    expect(container.textContent).toContain("生成");
  });
});
```

- [ ] **Step 2: Write shell test**

Create `__tests__/supply-ai-image-shell.test.tsx` based on `__tests__/supply-production-shell.test.tsx`, but with the new panel ids:

```tsx
it("loads AI image supply state and creates a generation task", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() }))
      .mockResolvedValueOnce(createJsonResponse({ taskId: "task-1" }))
      .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() })),
  );

  const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

  await act(async () => {
    root.render(<SupplyStationShell />);
  });
  await flush();

  await act(async () => {
    container.querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  await flush();

  expect(fetch).toHaveBeenNthCalledWith(
    2,
    "/api/gamification/ai-image/tasks",
    expect.objectContaining({ method: "POST" }),
  );
  expect(container.textContent).toContain("生图任务已创建");
});
```

Use a local `buildAiSnapshot()` helper that matches the updated `SupplyStationProductionSnapshot` shape.

- [ ] **Step 3: Run UI tests to verify they fail**

Run:

```bash
npm test -- __tests__/supply-ai-image-studio-panel.test.tsx __tests__/supply-ai-image-shell.test.tsx __tests__/supply-production-shell.test.tsx __tests__/supply-production-visual-contract.test.tsx
```

Expected: FAIL because new components and shell shape do not exist.

- [ ] **Step 4: Implement `SupplyAiImageStudioPanel`**

Component requirements:
- Render wallet, unlocked themes, selected theme, count selector 1 / 2 / 4.
- Render reference image upload with delete controls and a max of 3.
- Convert uploaded files to data URLs in the browser.
- Render user prompt textarea.
- Generate button calls:

```ts
onCreateTask({
  themeId: selectedThemeId,
  requestedCount,
  userPrompt,
  referenceImages,
});
```

- After successful submit, parent shell refreshes; panel clears prompt and reference images via controlled `submitVersion` prop or by resetting after `onCreateTask` resolves.
- Render recent tasks, item statuses, completed images, and retry button when `task.retryAvailable`.

- [ ] **Step 5: Implement gacha, artwork, and legacy panels**

`SupplyThemeGachaPanel`:
- Shows cost, locked theme count, unlocked theme grid.
- Button data action: `data-action="draw-ai-image-theme"`.
- Calls `onDrawTheme()`.

`SupplyArtworkBackpackPanel`:
- Shows unlocked themes and recent artworks.
- No use / exchange buttons.

`SupplyLegacyArchivePanel`:
- Shows old ticket count, old inventory quantity, old redemption count, old task record count.
- All controls are read-only; no action buttons for use/exchange.

- [ ] **Step 6: Rewrite `SupplyStationShell` panel map**

In `components/gamification/production/SupplyStationShell.tsx`:
- Remove imports and actions for old task complete/reroll/claim ticket/shop/item use/redemption/social respond.
- Add imports for new panels and API helpers.
- Use `SupplyProductionPanel = "studio" | "themeGacha" | "artworks" | "legacyArchive"`.
- Default `initialPanel = "studio"`.
- Keep `fetchSupplyStationState`, background refresh, error handling, success message, and `cacheSupplyNavSnapshot`.
- Implement:

```ts
async function handleCreateTask(payload: CreateAiImageGenerationTaskPayload) {
  await runAction("create-ai-image-task", async () => {
    await createAiImageGenerationTask(payload);
    return "生图任务已创建";
  });
}
```

Add retry and theme draw handlers with these shapes:

```ts
async function handleRetryTask(taskId: string) {
  await runAction("retry-ai-image-task", async () => {
    await retryAiImageGenerationTask(taskId);
    return "已重新提交失败图片";
  });
}

async function handleDrawTheme() {
  await runAction("draw-ai-image-theme", async () => {
    await drawAiImageThemeFromSupply();
    return "新主题已解锁";
  });
}
```

- [ ] **Step 7: Update old production shell tests**

In old shell tests:
- Remove expectations for `/api/gamification/tasks/complete`, `/api/gamification/lottery/draw`, `/api/gamification/shop/purchase`.
- Add expectations for `/api/gamification/ai-image/tasks`, `/api/gamification/ai-image/tasks/[taskId]/retry`, and `/api/gamification/ai-image/themes/draw`.

- [ ] **Step 8: Run focused UI tests**

Run:

```bash
npm test -- __tests__/supply-ai-image-studio-panel.test.tsx __tests__/supply-ai-image-shell.test.tsx __tests__/supply-production-shell.test.tsx __tests__/supply-production-visual-contract.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/gamification/production/SupplyAiImageStudioPanel.tsx components/gamification/production/SupplyThemeGachaPanel.tsx components/gamification/production/SupplyArtworkBackpackPanel.tsx components/gamification/production/SupplyLegacyArchivePanel.tsx components/gamification/production/SupplyStationShell.tsx __tests__/supply-ai-image-studio-panel.test.tsx __tests__/supply-ai-image-shell.test.tsx __tests__/supply-production-shell.test.tsx __tests__/supply-production-visual-contract.test.tsx
git commit -m "feat: replace supply station with ai image panels"
```

---

## Task 10: Remove Old Primary Supply Entrypoints From UI And Docs Contracts

**Files:**
- Modify: `components/gamification/production/supply-ui-lab-adapters.ts`
- Modify or remove tests: `__tests__/supply-ui-lab-production-adapters.test.ts`
- Modify: `__tests__/supply-dashboard-ui-lab-route.test.ts`, `__tests__/supply-draw-pool-ui-lab-route.test.ts`, `__tests__/supply-shop-ui-lab-route.test.ts`, `__tests__/supply-task-record-ui-lab-route.test.ts` only if they assert production primary behavior.
- Modify docs/content tests that mention old supply tickets as primary flow.

**Interfaces:**
- Produces a UI where primary supply navigation does not expose old task completion, ticket claim, shop purchase, real-world redemption, or old draw pool.

- [ ] **Step 1: Search old front-end labels**

Run:

```bash
rg -n "抽奖券|领取抽奖券|今日主线|逛商店|实体兑换|任务记录|换一个|打卡中|drawPool|taskRecord|purchase-shop-item|claim-ticket" components app lib __tests__
```

Expected: output identifies old UI lab/demo tests and production shell references. Keep UI lab-only demos if clearly isolated under `app/ui-lab`, but remove production primary references.

- [ ] **Step 2: Update production tests for old labels**

Add or update a test in `__tests__/supply-ai-image-shell.test.tsx`:

```tsx
it("does not show old ticket, shop, task, or redemption primary actions", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildAiSnapshot() })));
  const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

  await act(async () => {
    root.render(<SupplyStationShell />);
  });
  await flush();

  expect(container.textContent).not.toContain("抽奖券");
  expect(container.textContent).not.toContain("领取抽奖券");
  expect(container.textContent).not.toContain("逛商店");
  expect(container.textContent).not.toContain("实体兑换");
  expect(container.textContent).not.toContain("今日主线");
});
```

- [ ] **Step 3: Run old-label test to verify it passes**

Run:

```bash
npm test -- __tests__/supply-ai-image-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Keep UI lab routes isolated**

If old UI lab pages remain for design reference, add comments or tests proving they are not used by `SupplyStationShell`. Do not delete UI lab assets unless they break compilation.

- [ ] **Step 5: Run broad supply test slice**

Run:

```bash
npm test -- __tests__/supply-production-shell.test.tsx __tests__/supply-ai-image-shell.test.tsx __tests__/supply-ai-image-studio-panel.test.tsx __tests__/supply-production-view-model.test.ts __tests__/gamification-supply-state-api.test.ts __tests__/home-supply-navigation.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/gamification/production/supply-ui-lab-adapters.ts __tests__/supply-ui-lab-production-adapters.test.ts __tests__/supply-ai-image-shell.test.tsx
git commit -m "chore: hide legacy supply entrypoints"
```

---

## Task 11: Final Verification And Real Provider Smoke

**Files:**
- Modify only if verification exposes defects.

**Interfaces:**
- Produces a verified Phase 1 branch ready for review or Phase 2 planning.

- [ ] **Step 1: Run full static check**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Start dev server for manual smoke**

Run:

```bash
npm run dev
```

Expected: app starts on `http://localhost:3001`. Keep the session open while testing.

- [ ] **Step 5: Manual smoke without provider**

In browser:
- Login as a seed user.
- Open牛马补给站.
- Confirm no抽奖券,旧四维任务,商店,实体兑换 primary actions.
- Confirm coins,主题,生图控制台,主题扭蛋,作品集,旧补给存档 are visible.

- [ ] **Step 6: Manual smoke with provider and COS**

With `BOLUOPETS_API_KEY`, `COS_SECRET_ID`, `COS_SECRET_KEY`, `COS_BUCKET`, `COS_REGION`, and `COS_PUBLIC_BASE_URL` configured:
- Create a 1-image task with default theme and no reference image.
- Confirm coins decrease by 60.
- Confirm completed image appears in recent tasks and作品集.
- Create a 2-image task with one reference image.
- Confirm both items complete or failed items show retry.
- Force or reuse a failed/partial task and click retry.
- Confirm retry creates a new task and does not expose promptTemplate in the browser payload.

- [ ] **Step 7: Stop dev server**

Stop the `npm run dev` session with Ctrl-C.

- [ ] **Step 8: Commit any verification fixes**

If files changed during fixes:

```bash
git status --short
git add <changed-files>
git commit -m "fix: stabilize ai image phase1 verification"
```

Expected: no uncommitted Phase 1 changes remain except intentionally ignored local artifacts.
