# 牛马补给站 AI 生图 Phase 2 后台运营 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Phase 1 用户生图闭环稳定后，迁移 IPStudio 的 `themes-admin`、theme publish / restore、admin images 能力，让管理员可以无代码维护 AI 生图主题、发布/回滚主题版本，并浏览生成图片资产。

**Architecture:** Phase 2 复用 Phase 1 的 `lib/gamification/ai-image/*` provider、COS、任务、主题 preset 和作品表；新增 admin-only 配置层，用 Prisma 存储主题草稿、发布版本和后台资产查询。普通用户继续只读取 client-safe theme snapshot，管理员通过现有 `/admin` 页面和 `loadCurrentUser` / `isAdminUser` 鉴权访问后台。

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma 7 + better-sqlite3, Vitest + jsdom, existing `/admin` shell, Phase 1 AI image services, COS-backed images.

## Global Constraints

- Phase 2 starts only after `docs/superpowers/plans/2026-07-06-supply-ai-image-phase1-user-mvp.md` is complete and verified.
- Admin auth must reuse `lib/session.ts` with `loadCurrentUser()` and `isAdminUser()`; do not add a new login system.
- Public theme APIs and supply snapshots must never expose `promptTemplate`, full provider prompts, admin-only notes, COS secret config, or draft-only metadata.
- Code preset themes remain fallback. Published admin config overlays preset themes by `themeId`.
- Theme publish / restore must be versioned. No destructive overwrite without a recoverable version row.
- Admin images is a backstage asset browser, not a public gallery; do not add likes, comments, rankings, public sharing, or moderation queue.
- Phase 2 does not add主题直购,图片公开广场,猜盐 / 海龟汤, AI 问答, or custom prompt for ordinary users.
- Keep all admin-visible copy Chinese-first; keep route names, test names, and code identifiers English.

---

## File Structure

### New Files

- `lib/gamification/ai-image/admin-themes.ts` - admin theme config CRUD, publish, restore, version list, and overlay resolver.
- `lib/gamification/ai-image/admin-images.ts` - admin asset list query for completed artworks and generation items.
- `app/api/admin/gamification/ai-image/themes/route.ts` - admin list/create theme config.
- `app/api/admin/gamification/ai-image/themes/[themeId]/route.ts` - admin get/update one theme config.
- `app/api/admin/gamification/ai-image/themes/[themeId]/publish/route.ts` - publish draft/current edit to active config version.
- `app/api/admin/gamification/ai-image/themes/[themeId]/restore/route.ts` - restore a historical version.
- `app/api/admin/gamification/ai-image/themes/[themeId]/versions/route.ts` - list versions.
- `app/api/admin/gamification/ai-image/themes/[themeId]/preview/route.ts` - generate/update theme preview draft by using Phase 1 task/provider path.
- `app/api/admin/gamification/ai-image/images/route.ts` - admin generated image asset listing.
- `components/admin/AiImageThemeAdminPanel.tsx` - theme list and editor.
- `components/admin/AiImageThemeEditor.tsx` - focused editor form for one theme.
- `components/admin/AiImageAdminImagesPanel.tsx` - image asset browser.
- `__tests__/ai-image-admin-theme-schema.test.ts` - schema and seed cleanup tests.
- `__tests__/ai-image-admin-themes.test.ts` - service tests for overlay/publish/restore.
- `__tests__/ai-image-admin-themes-api.test.ts` - admin theme route tests.
- `__tests__/ai-image-admin-images-api.test.ts` - admin images route tests.
- `__tests__/ai-image-theme-admin-panel.test.tsx` - admin theme UI tests.
- `__tests__/ai-image-admin-images-panel.test.tsx` - admin images UI tests.

### Modified Files

- `prisma/schema.prisma` - add theme config, version, and preview draft models.
- `lib/db-seed.ts` - clear Phase 2 admin rows for seed team.
- `lib/gamification/ai-image/themes.ts` - resolve active themes through admin overlay where server context needs it.
- `lib/gamification/ai-image/snapshot.ts` - use published admin overlay for user-visible theme snapshots while still hiding prompts.
- `app/(board)/admin/page.tsx` - load AI image admin snapshots and pass panels to `AdminPageShell`.
- `components/admin/AdminPageShell.tsx` - add navigation anchors and panel slots for AI image theme ops and image assets.
- `lib/types.ts` - add admin theme and admin image snapshot types.
- Existing admin tests: `__tests__/admin-page-shell.test.tsx`, `__tests__/admin-page-route` if present, and related `/admin` tests.

---

## Task 1: Add Admin Theme Prisma Models

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/db-seed.ts`
- Test: `__tests__/ai-image-admin-theme-schema.test.ts`

**Interfaces:**
- Produces Prisma delegates: `aiImageThemeConfig`, `aiImageThemeVersion`, `aiImageThemePreviewDraft`.
- Later services consume these models by `themeId`.

- [ ] **Step 1: Write schema test**

Create `__tests__/ai-image-admin-theme-schema.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

describe("AI image admin theme schema", () => {
  let adminId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    adminId = admin.id;
    teamId = admin.teamId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores theme config, version, and preview draft", async () => {
    const config = await prisma.aiImageThemeConfig.create({
      data: {
        themeId: "theme-01",
        teamId,
        name: "牛马像素馆",
        description: "像素主题",
        tag: "像素",
        paletteJson: JSON.stringify(["#fde047", "#111827"]),
        previewImageUrl: "https://example.com/preview.png",
        promptTemplate: "server prompt",
        referenceImageUrl: null,
        referenceCosKey: null,
        enabled: true,
        sortOrder: 1,
        updatedByUserId: adminId,
      },
    });

    const version = await prisma.aiImageThemeVersion.create({
      data: {
        themeId: config.themeId,
        configId: config.id,
        teamId,
        version: 1,
        snapshotJson: JSON.stringify({ name: config.name, promptTemplate: config.promptTemplate }),
        createdByUserId: adminId,
      },
    });

    await prisma.aiImageThemeConfig.update({
      where: { id: config.id },
      data: { publishedVersionId: version.id },
    });

    const draft = await prisma.aiImageThemePreviewDraft.create({
      data: {
        themeId: config.themeId,
        configId: config.id,
        teamId,
        status: "completed",
        imageUrl: "https://example.com/draft.png",
        cosKey: "share-project/ai-images/admin/draft.png",
        promptSnapshotJson: "{}",
        createdByUserId: adminId,
      },
    });

    await expect(prisma.aiImageThemeVersion.findUnique({ where: { id: version.id } })).resolves.toBeTruthy();
    await expect(prisma.aiImageThemePreviewDraft.findUnique({ where: { id: draft.id } })).resolves.toBeTruthy();
  });

  it("seedDatabase clears admin theme rows for the seed team", async () => {
    await prisma.aiImageThemeConfig.create({
      data: {
        themeId: "theme-01",
        teamId,
        name: "Temporary",
        description: "Temporary",
        tag: "临时",
        paletteJson: "[]",
        previewImageUrl: "https://example.com/preview.png",
        promptTemplate: "temporary prompt",
        enabled: true,
        sortOrder: 1,
        updatedByUserId: adminId,
      },
    });

    await seedDatabase();

    await expect(prisma.aiImageThemeConfig.count()).resolves.toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/ai-image-admin-theme-schema.test.ts
```

Expected: FAIL because admin theme delegates do not exist.

- [ ] **Step 3: Add Prisma models**

Add relation arrays to `Team`:

```prisma
  aiImageThemeConfigs AiImageThemeConfig[]
  aiImageThemeVersions AiImageThemeVersion[]
  aiImageThemePreviewDrafts AiImageThemePreviewDraft[]
```

Add relation arrays to `User`:

```prisma
  updatedAiImageThemeConfigs AiImageThemeConfig[] @relation("AiImageThemeConfigUpdater")
  createdAiImageThemeVersions AiImageThemeVersion[] @relation("AiImageThemeVersionCreator")
  createdAiImageThemePreviewDrafts AiImageThemePreviewDraft[] @relation("AiImageThemePreviewCreator")
```

Add models:

```prisma
model AiImageThemeConfig {
  id                 String                     @id @default(cuid())
  themeId            String
  teamId             String
  team               Team                       @relation(fields: [teamId], references: [id])
  name               String
  description        String
  tag                String
  paletteJson        String
  previewImageUrl    String
  promptTemplate     String
  referenceImageUrl  String?
  referenceCosKey    String?
  enabled            Boolean                    @default(true)
  sortOrder          Int
  publishedVersionId String?
  updatedByUserId    String
  updatedByUser      User                       @relation("AiImageThemeConfigUpdater", fields: [updatedByUserId], references: [id])
  createdAt          DateTime                   @default(now())
  updatedAt          DateTime                   @updatedAt
  versions           AiImageThemeVersion[]
  previewDrafts      AiImageThemePreviewDraft[]

  @@unique([teamId, themeId])
  @@index([teamId, enabled, sortOrder])
}

model AiImageThemeVersion {
  id              String             @id @default(cuid())
  themeId         String
  configId        String
  config          AiImageThemeConfig @relation(fields: [configId], references: [id])
  teamId          String
  team            Team               @relation(fields: [teamId], references: [id])
  version         Int
  snapshotJson    String
  createdByUserId String
  createdByUser   User               @relation("AiImageThemeVersionCreator", fields: [createdByUserId], references: [id])
  createdAt       DateTime           @default(now())

  @@unique([configId, version])
  @@index([teamId, themeId, createdAt])
}

model AiImageThemePreviewDraft {
  id                 String             @id @default(cuid())
  themeId            String
  configId           String
  config             AiImageThemeConfig @relation(fields: [configId], references: [id])
  teamId             String
  team               Team               @relation(fields: [teamId], references: [id])
  status             String
  imageUrl           String?
  cosKey             String?
  errorMessage       String?
  promptSnapshotJson String
  createdByUserId    String
  createdByUser      User               @relation("AiImageThemePreviewCreator", fields: [createdByUserId], references: [id])
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt

  @@index([teamId, themeId, createdAt])
  @@index([status, updatedAt])
}
```

- [ ] **Step 4: Update seed cleanup**

In `lib/db-seed.ts`, delete Phase 2 rows before users can be reset:

```ts
  await prisma.aiImageThemePreviewDraft.deleteMany({
    where: { teamId: team.id },
  });

  await prisma.aiImageThemeVersion.deleteMany({
    where: { teamId: team.id },
  });

  await prisma.aiImageThemeConfig.deleteMany({
    where: { teamId: team.id },
  });
```

- [ ] **Step 5: Generate Prisma client and push local schema**

Run:

```bash
npx prisma generate
npx prisma db push
```

Expected: both commands exit 0.

- [ ] **Step 6: Run schema test**

Run:

```bash
npm test -- __tests__/ai-image-admin-theme-schema.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/db-seed.ts __tests__/ai-image-admin-theme-schema.test.ts lib/generated
git commit -m "feat: add ai image admin theme models"
```

---

## Task 2: Add Admin Theme Overlay Service

**Files:**
- Create: `lib/gamification/ai-image/admin-themes.ts`
- Modify: `lib/gamification/ai-image/themes.ts`
- Modify: `lib/gamification/ai-image/snapshot.ts`
- Modify: `lib/types.ts`
- Test: `__tests__/ai-image-admin-themes.test.ts`

**Interfaces:**
- Produces `listAdminAiImageThemes`, `saveAdminAiImageTheme`, `publishAdminAiImageTheme`, `restoreAdminAiImageThemeVersion`, `resolveActiveAiImageThemesForTeam`.
- Public snapshot consumes only resolved active themes converted through `toClientThemeSnapshot`.

- [ ] **Step 1: Add admin types**

In `lib/types.ts`, add:

```ts
export interface AiImageAdminThemeSnapshot {
  id: string;
  themeId: string;
  name: string;
  description: string;
  tag: string;
  palette: string[];
  previewImageUrl: string;
  promptTemplate: string;
  referenceImageUrl: string | null;
  enabled: boolean;
  sortOrder: number;
  publishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiImageAdminThemeVersionSnapshot {
  id: string;
  themeId: string;
  configId: string;
  version: number;
  snapshot: AiImageAdminThemeSnapshot;
  createdByUserId: string;
  createdAt: string;
}
```

- [ ] **Step 2: Write service tests**

Create `__tests__/ai-image-admin-themes.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import {
  listAdminAiImageThemes,
  publishAdminAiImageTheme,
  resolveActiveAiImageThemesForTeam,
  restoreAdminAiImageThemeVersion,
  saveAdminAiImageTheme,
} from "@/lib/gamification/ai-image/admin-themes";
import { getAiImageThemeById } from "@/lib/gamification/ai-image/themes";
import { prisma } from "@/lib/prisma";

describe("AI image admin themes service", () => {
  let adminId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    adminId = admin.id;
    teamId = admin.teamId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("lists preset themes as editable admin snapshots", async () => {
    const themes = await listAdminAiImageThemes({ teamId });

    expect(themes).toHaveLength(13);
    expect(themes[0]).toHaveProperty("promptTemplate");
  });

  it("saves and publishes an override without changing the preset fallback", async () => {
    await saveAdminAiImageTheme({
      teamId,
      updatedByUserId: adminId,
      themeId: "theme-01",
      patch: {
        name: "像素馆 v2",
        description: "新的描述",
        tag: "像素",
        palette: ["#000000"],
        previewImageUrl: "https://example.com/new.png",
        promptTemplate: "new server prompt",
        referenceImageUrl: null,
        referenceCosKey: null,
        enabled: true,
        sortOrder: 1,
      },
    });

    const version = await publishAdminAiImageTheme({ teamId, themeId: "theme-01", createdByUserId: adminId });
    const active = await resolveActiveAiImageThemesForTeam({ teamId });

    expect(version.version).toBe(1);
    expect(active.find((theme) => theme.id === "theme-01")?.name).toBe("像素馆 v2");
    expect(getAiImageThemeById("theme-01")?.name).toBe("牛马像素馆");
  });

  it("restores a historical version", async () => {
    await saveAdminAiImageTheme({
      teamId,
      updatedByUserId: adminId,
      themeId: "theme-01",
      patch: {
        name: "版本一",
        description: "v1",
        tag: "v1",
        palette: ["#111111"],
        previewImageUrl: "https://example.com/v1.png",
        promptTemplate: "prompt v1",
        referenceImageUrl: null,
        referenceCosKey: null,
        enabled: true,
        sortOrder: 1,
      },
    });
    const v1 = await publishAdminAiImageTheme({ teamId, themeId: "theme-01", createdByUserId: adminId });
    await saveAdminAiImageTheme({
      teamId,
      updatedByUserId: adminId,
      themeId: "theme-01",
      patch: { name: "版本二" },
    });

    await restoreAdminAiImageThemeVersion({ teamId, themeId: "theme-01", versionId: v1.id, restoredByUserId: adminId });
    const active = await resolveActiveAiImageThemesForTeam({ teamId });

    expect(active.find((theme) => theme.id === "theme-01")?.name).toBe("版本一");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/ai-image-admin-themes.test.ts
```

Expected: FAIL because service does not exist.

- [ ] **Step 4: Implement `admin-themes.ts`**

Create `lib/gamification/ai-image/admin-themes.ts` with:

```ts
import type { AiImageAdminThemeSnapshot, AiImageAdminThemeVersionSnapshot } from "@/lib/types";
import { getAiImageThemes } from "@/lib/gamification/ai-image/themes";
import type { AiImageThemeDefinition } from "@/lib/gamification/ai-image/types";
import { prisma } from "@/lib/prisma";

export interface AdminThemePatch {
  name?: string;
  description?: string;
  tag?: string;
  palette?: string[];
  previewImageUrl?: string;
  promptTemplate?: string;
  referenceImageUrl?: string | null;
  referenceCosKey?: string | null;
  enabled?: boolean;
  sortOrder?: number;
}

export async function listAdminAiImageThemes(input: { teamId: string }): Promise<AiImageAdminThemeSnapshot[]>;
export async function saveAdminAiImageTheme(input: { teamId: string; updatedByUserId: string; themeId: string; patch: AdminThemePatch }): Promise<AiImageAdminThemeSnapshot>;
export async function publishAdminAiImageTheme(input: { teamId: string; themeId: string; createdByUserId: string }): Promise<AiImageAdminThemeVersionSnapshot>;
export async function restoreAdminAiImageThemeVersion(input: { teamId: string; themeId: string; versionId: string; restoredByUserId: string }): Promise<AiImageAdminThemeSnapshot>;
export async function resolveActiveAiImageThemesForTeam(input: { teamId: string }): Promise<AiImageThemeDefinition[]>;
```

Implementation rules:
- `listAdminAiImageThemes` merges every preset with any `AiImageThemeConfig` row.
- `saveAdminAiImageTheme` upserts by `teamId_themeId`; omitted patch fields keep existing config or preset fallback.
- `publishAdminAiImageTheme` serializes the current admin snapshot to `AiImageThemeVersion.snapshotJson`, increments version by max + 1, and updates `publishedVersionId`.
- `restoreAdminAiImageThemeVersion` parses the selected version snapshot, writes its fields back to config, and sets `publishedVersionId` to the restored version id.
- `resolveActiveAiImageThemesForTeam` returns preset definitions overlaid by config rows with `enabled`, `name`, `description`, `tag`, `palette`, `previewImageUrl`, `promptTemplate`, and `sortOrder`.

- [ ] **Step 5: Update theme resolver usage**

In `lib/gamification/ai-image/snapshot.ts`, replace direct `getAiImageThemes()` calls with `resolveActiveAiImageThemesForTeam({ teamId })`. Keep client conversion through `toClientThemeSnapshot`.

In `lib/gamification/ai-image/tasks.ts`, when creating or retrying a task, resolve the active theme for the user's team instead of only `getAiImageThemeById(themeId)`.

- [ ] **Step 6: Run service tests**

Run:

```bash
npm test -- __tests__/ai-image-admin-themes.test.ts __tests__/supply-ai-image-snapshot.test.ts __tests__/ai-image-tasks.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/gamification/ai-image/admin-themes.ts lib/gamification/ai-image/themes.ts lib/gamification/ai-image/snapshot.ts lib/gamification/ai-image/tasks.ts lib/types.ts __tests__/ai-image-admin-themes.test.ts
git commit -m "feat: add ai image admin theme overlay"
```

---

## Task 3: Add Admin Theme APIs

**Files:**
- Create: `app/api/admin/gamification/ai-image/themes/route.ts`
- Create: `app/api/admin/gamification/ai-image/themes/[themeId]/route.ts`
- Create: `app/api/admin/gamification/ai-image/themes/[themeId]/publish/route.ts`
- Create: `app/api/admin/gamification/ai-image/themes/[themeId]/restore/route.ts`
- Create: `app/api/admin/gamification/ai-image/themes/[themeId]/versions/route.ts`
- Create: `app/api/admin/gamification/ai-image/themes/[themeId]/preview/route.ts`
- Test: `__tests__/ai-image-admin-themes-api.test.ts`

**Interfaces:**
- All routes require admin session.
- Non-admin returns 403; missing session returns 401.
- Routes return admin snapshots that include `promptTemplate` only for admins.

- [ ] **Step 1: Write API tests**

Create `__tests__/ai-image-admin-themes-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/gamification/ai-image/themes/route";
import { PATCH } from "@/app/api/admin/gamification/ai-image/themes/[themeId]/route";
import { POST as PUBLISH } from "@/app/api/admin/gamification/ai-image/themes/[themeId]/publish/route";
import { POST as RESTORE } from "@/app/api/admin/gamification/ai-image/themes/[themeId]/restore/route";
import { GET as VERSIONS } from "@/app/api/admin/gamification/ai-image/themes/[themeId]/versions/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(url: string, userId?: string, body?: unknown, method = body ? "POST" : "GET") {
  return new NextRequest(url, {
    method,
    headers: {
      ...(userId ? { cookie: `userId=${createCookieValue(userId)}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("admin AI image theme APIs", () => {
  let adminId: string;
  let memberId: string;

  beforeEach(async () => {
    await seedDatabase();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    await prisma.user.update({ where: { id: memberId }, data: { role: "MEMBER" } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects non-admin users", async () => {
    const response = await GET(request("http://localhost/api/admin/gamification/ai-image/themes", memberId));
    expect(response.status).toBe(403);
  });

  it("lists admin themes with promptTemplate for admins", async () => {
    const response = await GET(request("http://localhost/api/admin/gamification/ai-image/themes", adminId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.themes).toHaveLength(13);
    expect(body.themes[0].promptTemplate).toEqual(expect.any(String));
  });

  it("updates, publishes, lists versions, and restores a theme", async () => {
    const patch = await PATCH(
      request("http://localhost/api/admin/gamification/ai-image/themes/theme-01", adminId, {
        name: "像素馆后台版",
        promptTemplate: "admin prompt",
      }, "PATCH"),
      { params: Promise.resolve({ themeId: "theme-01" }) },
    );
    expect(patch.status).toBe(200);

    const publish = await PUBLISH(
      request("http://localhost/api/admin/gamification/ai-image/themes/theme-01/publish", adminId, {}),
      { params: Promise.resolve({ themeId: "theme-01" }) },
    );
    const publishBody = await publish.json();
    expect(publish.status).toBe(200);
    expect(publishBody.version.version).toBe(1);

    const versions = await VERSIONS(
      request("http://localhost/api/admin/gamification/ai-image/themes/theme-01/versions", adminId),
      { params: Promise.resolve({ themeId: "theme-01" }) },
    );
    const versionsBody = await versions.json();
    expect(versionsBody.versions).toHaveLength(1);

    const restore = await RESTORE(
      request("http://localhost/api/admin/gamification/ai-image/themes/theme-01/restore", adminId, {
        versionId: publishBody.version.id,
      }),
      { params: Promise.resolve({ themeId: "theme-01" }) },
    );
    expect(restore.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run API tests to verify they fail**

Run:

```bash
npm test -- __tests__/ai-image-admin-themes-api.test.ts
```

Expected: FAIL because admin routes do not exist.

- [ ] **Step 3: Implement admin auth helper inside routes**

Each route should use this local pattern:

```ts
const user = await loadCurrentUser(request.cookies);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
if (!isAdminUser(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

- [ ] **Step 4: Implement route behavior**

Route behavior:
- `GET /themes`: returns `{ themes }` from `listAdminAiImageThemes({ teamId: user.teamId })`.
- `POST /themes`: creates/upserts a config using body `themeId` and patch fields, then returns `{ theme }`.
- `PATCH /themes/[themeId]`: patches one theme and returns `{ theme }`.
- `POST /publish`: publishes and returns `{ version }`.
- `GET /versions`: returns `{ versions }`.
- `POST /restore`: requires body `{ versionId }`, restores and returns `{ theme }`.
- `POST /preview`: creates a preview draft using current theme config. Use Phase 1 provider/COS service directly or create a one-item internal preview task; return `{ draft }`.

- [ ] **Step 5: Run API tests**

Run:

```bash
npm test -- __tests__/ai-image-admin-themes-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/admin/gamification/ai-image/themes __tests__/ai-image-admin-themes-api.test.ts
git commit -m "feat: add ai image admin theme apis"
```

---

## Task 4: Add Admin Images Asset API

**Files:**
- Create: `lib/gamification/ai-image/admin-images.ts`
- Create: `app/api/admin/gamification/ai-image/images/route.ts`
- Modify: `lib/types.ts`
- Test: `__tests__/ai-image-admin-images-api.test.ts`

**Interfaces:**
- Produces admin-only list of generated artworks/items with COS keys, image URLs, user, theme, task status, and timestamps.

- [ ] **Step 1: Add admin image type**

In `lib/types.ts`, add:

```ts
export interface AiImageAdminImageAssetSnapshot {
  id: string;
  artworkId: string | null;
  taskId: string;
  itemId: string;
  userId: string;
  username: string;
  themeId: string;
  taskStatus: string;
  itemStatus: string;
  imageUrl: string | null;
  cosKey: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Write API test**

Create `__tests__/ai-image-admin-images-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/gamification/ai-image/images/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/admin/gamification/ai-image/images", {
    method: "GET",
    headers: userId ? { cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

describe("admin AI image assets API", () => {
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    teamId = admin.teamId;
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    await prisma.user.update({ where: { id: memberId }, data: { role: "MEMBER" } });

    const task = await prisma.aiImageGenerationTask.create({
      data: {
        userId: memberId,
        teamId,
        themeId: "theme-01",
        requestedCount: 1,
        status: "completed",
        coinCost: 60,
        coinRefunded: false,
        refundedCoinAmount: 0,
        providerModel: "gpt-image-2",
        promptSnapshotJson: "{}",
      },
    });
    const item = await prisma.aiImageGenerationItem.create({
      data: {
        taskId: task.id,
        userId: memberId,
        teamId,
        themeId: "theme-01",
        index: 0,
        status: "completed",
        imageUrl: "https://example.com/output.png",
        cosKey: "share-project/ai-images/u/output.png",
      },
    });
    await prisma.aiImageArtwork.create({
      data: {
        taskId: task.id,
        itemId: item.id,
        userId: memberId,
        teamId,
        themeId: "theme-01",
        imageUrl: item.imageUrl!,
        cosKey: item.cosKey!,
        promptSnapshotJson: "{}",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects non-admin users", async () => {
    const response = await GET(request(memberId));
    expect(response.status).toBe(403);
  });

  it("lists completed image assets for admins", async () => {
    const response = await GET(request(adminId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.assets[0]).toMatchObject({
      userId: memberId,
      username: "luo",
      themeId: "theme-01",
      imageUrl: "https://example.com/output.png",
      cosKey: "share-project/ai-images/u/output.png",
    });
  });
});
```

- [ ] **Step 3: Run API test to verify it fails**

Run:

```bash
npm test -- __tests__/ai-image-admin-images-api.test.ts
```

Expected: FAIL because module and route do not exist.

- [ ] **Step 4: Implement `admin-images.ts`**

Create `lib/gamification/ai-image/admin-images.ts`:

```ts
import { prisma } from "@/lib/prisma";
import type { AiImageAdminImageAssetSnapshot } from "@/lib/types";

export async function listAiImageAdminAssets({
  teamId,
  take = 80,
}: {
  teamId: string;
  take?: number;
}): Promise<AiImageAdminImageAssetSnapshot[]> {
  const items = await prisma.aiImageGenerationItem.findMany({
    where: {
      teamId,
      OR: [{ imageUrl: { not: null } }, { cosKey: { not: null } }],
    },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      user: { select: { username: true } },
      task: { select: { status: true } },
      artwork: { select: { id: true } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    artworkId: item.artwork?.id ?? null,
    taskId: item.taskId,
    itemId: item.id,
    userId: item.userId,
    username: item.user.username,
    themeId: item.themeId,
    taskStatus: item.task.status,
    itemStatus: item.status,
    imageUrl: item.imageUrl,
    cosKey: item.cosKey,
    createdAt: item.createdAt.toISOString(),
  }));
}
```

- [ ] **Step 5: Implement route**

Create `app/api/admin/gamification/ai-image/images/route.ts` with admin auth and:

```ts
const assets = await listAiImageAdminAssets({ teamId: user.teamId });
return NextResponse.json({ assets });
```

- [ ] **Step 6: Run test**

Run:

```bash
npm test -- __tests__/ai-image-admin-images-api.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/gamification/ai-image/admin-images.ts app/api/admin/gamification/ai-image/images/route.ts lib/types.ts __tests__/ai-image-admin-images-api.test.ts
git commit -m "feat: add ai image admin assets api"
```

---

## Task 5: Add Admin UI Panels

**Files:**
- Create: `components/admin/AiImageThemeAdminPanel.tsx`
- Create: `components/admin/AiImageThemeEditor.tsx`
- Create: `components/admin/AiImageAdminImagesPanel.tsx`
- Modify: `components/admin/AdminPageShell.tsx`
- Modify: `app/(board)/admin/page.tsx`
- Test: `__tests__/ai-image-theme-admin-panel.test.tsx`
- Test: `__tests__/ai-image-admin-images-panel.test.tsx`
- Modify: `__tests__/admin-page-shell.test.tsx`

**Interfaces:**
- Admin page displays two new sections: `#ai-image-themes` and `#ai-image-assets`.
- UI fetches admin APIs and handles 401/403/errors in Chinese.

- [ ] **Step 1: Write theme panel test**

Create `__tests__/ai-image-theme-admin-panel.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiImageThemeAdminPanel } from "@/components/admin/AiImageThemeAdminPanel";
import type { AiImageAdminThemeSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const theme: AiImageAdminThemeSnapshot = {
  id: "config-1",
  themeId: "theme-01",
  name: "牛马像素馆",
  description: "像素主题",
  tag: "像素",
  palette: ["#fde047"],
  previewImageUrl: "https://example.com/preview.png",
  promptTemplate: "server prompt",
  referenceImageUrl: null,
  enabled: true,
  sortOrder: 1,
  publishedVersionId: null,
  createdAt: "2026-07-06T00:00:00.000Z",
  updatedAt: "2026-07-06T00:00:00.000Z",
};

describe("AiImageThemeAdminPanel", () => {
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
    vi.unstubAllGlobals();
  });

  it("renders theme prompt editor and publish action", () => {
    act(() => {
      root.render(<AiImageThemeAdminPanel initialThemes={[theme]} />);
    });

    expect(container.textContent).toContain("AI 生图主题");
    expect(container.textContent).toContain("牛马像素馆");
    expect(container.querySelector("textarea")?.value).toContain("server prompt");
    expect(container.textContent).toContain("发布版本");
  });
});
```

- [ ] **Step 2: Write images panel test**

Create `__tests__/ai-image-admin-images-panel.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AiImageAdminImagesPanel } from "@/components/admin/AiImageAdminImagesPanel";
import type { AiImageAdminImageAssetSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("AiImageAdminImagesPanel", () => {
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

  it("renders generated asset metadata", () => {
    const assets: AiImageAdminImageAssetSnapshot[] = [{
      id: "item-1",
      artworkId: "artwork-1",
      taskId: "task-1",
      itemId: "item-1",
      userId: "u1",
      username: "li",
      themeId: "theme-01",
      taskStatus: "completed",
      itemStatus: "completed",
      imageUrl: "https://example.com/output.png",
      cosKey: "share-project/ai-images/u1/output.png",
      createdAt: "2026-07-06T00:00:00.000Z",
    }];

    act(() => {
      root.render(<AiImageAdminImagesPanel initialAssets={assets} />);
    });

    expect(container.textContent).toContain("AI 生图资产");
    expect(container.textContent).toContain("li");
    expect(container.textContent).toContain("share-project/ai-images/u1/output.png");
  });
});
```

- [ ] **Step 3: Run UI tests to verify they fail**

Run:

```bash
npm test -- __tests__/ai-image-theme-admin-panel.test.tsx __tests__/ai-image-admin-images-panel.test.tsx __tests__/admin-page-shell.test.tsx
```

Expected: FAIL because components and shell slots do not exist.

- [ ] **Step 4: Implement theme admin UI**

`AiImageThemeAdminPanel` requirements:
- Receives `initialThemes: AiImageAdminThemeSnapshot[]`.
- Shows selectable theme list.
- Renders `AiImageThemeEditor` for selected theme.
- Save button calls `PATCH /api/admin/gamification/ai-image/themes/[themeId]`.
- Publish button calls `POST /api/admin/gamification/ai-image/themes/[themeId]/publish`.
- Versions button loads `GET /versions`.
- Restore button calls `POST /restore` with `versionId`.
- Preview button calls `POST /preview`.
- Shows errors in Chinese, such as `主题保存失败` and `主题发布失败`.

`AiImageThemeEditor` requirements:
- Inputs for name, description, tag, palette comma list, preview URL, reference image URL, enabled, sortOrder.
- Textarea for `promptTemplate`.
- Does not render provider API keys or raw provider responses.

- [ ] **Step 5: Implement admin images UI**

`AiImageAdminImagesPanel` requirements:
- Receives `initialAssets`.
- Renders image thumbnail with plain `<img>`.
- Shows username, themeId, taskStatus, itemStatus, cosKey, createdAt.
- Refresh button calls `/api/admin/gamification/ai-image/images`.
- Clicking image opens a simple modal or new tab link to `imageUrl`.

- [ ] **Step 6: Wire admin page**

In `components/admin/AdminPageShell.tsx`:
- Add props:

```ts
aiImageThemesPanel: ReactNode;
aiImageAssetsPanel: ReactNode;
```

- Add top links:

```tsx
<a className="supply-inline-link" href="#ai-image-themes">AI 主题</a>
<a className="supply-inline-link" href="#ai-image-assets">AI 资产</a>
```

- Add sections:

```tsx
<section id="ai-image-themes" className="scroll-mt-4">
  {aiImageThemesPanel}
</section>
<section id="ai-image-assets" className="scroll-mt-4">
  {aiImageAssetsPanel}
</section>
```

In `app/(board)/admin/page.tsx`, load:

```ts
const [themes, imageAssets] = await Promise.all([
  listAdminAiImageThemes({ teamId: user.teamId }),
  listAiImageAdminAssets({ teamId: user.teamId }),
]);
```

Pass:

```tsx
aiImageThemesPanel={<AiImageThemeAdminPanel initialThemes={themes} />}
aiImageAssetsPanel={<AiImageAdminImagesPanel initialAssets={imageAssets} />}
```

- [ ] **Step 7: Run UI tests**

Run:

```bash
npm test -- __tests__/ai-image-theme-admin-panel.test.tsx __tests__/ai-image-admin-images-panel.test.tsx __tests__/admin-page-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add components/admin/AiImageThemeAdminPanel.tsx components/admin/AiImageThemeEditor.tsx components/admin/AiImageAdminImagesPanel.tsx components/admin/AdminPageShell.tsx app/'(board)'/admin/page.tsx __tests__/ai-image-theme-admin-panel.test.tsx __tests__/ai-image-admin-images-panel.test.tsx __tests__/admin-page-shell.test.tsx
git commit -m "feat: add ai image admin panels"
```

---

## Task 6: Final Phase 2 Verification

**Files:**
- Modify only if verification exposes defects.

**Interfaces:**
- Produces a verified admin backend where theme configs can be edited, published, restored, and image assets can be inspected.

- [ ] **Step 1: Run admin and AI focused tests**

Run:

```bash
npm test -- __tests__/ai-image-admin-theme-schema.test.ts __tests__/ai-image-admin-themes.test.ts __tests__/ai-image-admin-themes-api.test.ts __tests__/ai-image-admin-images-api.test.ts __tests__/ai-image-theme-admin-panel.test.tsx __tests__/ai-image-admin-images-panel.test.tsx __tests__/admin-page-shell.test.tsx __tests__/supply-ai-image-snapshot.test.ts __tests__/ai-image-tasks.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full static check**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 5: Manual admin smoke**

Start dev server:

```bash
npm run dev
```

Then in browser:
- Login as admin seed user `li`.
- Open `/admin`.
- Confirm AI 主题 and AI 资产 links are visible.
- Edit theme name and promptTemplate for `theme-01`.
- Save the theme.
- Publish a version.
- Confirm普通牛马补给站 still does not expose promptTemplate.
- Restore the published version.
- Open AI 资产 and confirm generated images show URL and COS key.

- [ ] **Step 6: Stop dev server**

Stop the `npm run dev` session with Ctrl-C.

- [ ] **Step 7: Commit any verification fixes**

If files changed:

```bash
git status --short
git add <changed-files>
git commit -m "fix: stabilize ai image admin verification"
```

Expected: no uncommitted Phase 2 changes remain except intentionally ignored local artifacts.
