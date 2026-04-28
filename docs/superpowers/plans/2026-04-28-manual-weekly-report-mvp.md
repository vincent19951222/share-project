# Manual Weekly Report MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mainline weekly report MVP where admins generate a private current-week draft in Report Center, then publish it as a `WEEKLY_REPORT_CREATED` Team Dynamic that every member can review.

**Architecture:** Keep weekly report logic in a dedicated server-side service that computes deterministic current-week metrics from existing punch / season / coffee data, persists an admin-private `WeeklyReportDraft`, and reuses the existing `TeamDynamic` pipeline for public distribution. Report Center owns draft generation and publishing UX; Team Dynamics remains the public reading surface after publish.

**Tech Stack:** Next.js App Router, TypeScript, Prisma + SQLite, Vitest + jsdom, existing Team Dynamics service layer.

---

## File Structure

### New Files

- `lib/weekly-report.ts`
  - Shared weekly report types, week-window helpers, summary templating helpers.
- `lib/weekly-report-service.ts`
  - Server-side draft generation, draft loading, and publish-to-team-dynamics orchestration.
- `app/api/reports/weekly/draft/route.ts`
  - Admin-only `GET` / `POST` draft endpoint.
- `app/api/reports/weekly/publish/route.ts`
  - Admin-only publish endpoint.
- `components/report-center/WeeklyReportPanel.tsx`
  - Report Center module for admin draft actions and member-facing published-summary state.
- `components/team-dynamics/WeeklyReportDynamicCard.tsx`
  - Expanded page-mode rendering for published weekly reports.
- `lib/weekly-report-client.ts`
  - Thin client helpers for weekly report draft/publish requests.
- `__tests__/weekly-report-service.test.ts`
  - Service-level deterministic aggregation and publish tests.
- `__tests__/weekly-report-api.test.ts`
  - API auth and behavior tests.
- `__tests__/weekly-report-panel.test.tsx`
  - UI interaction tests for Report Center weekly report module.
- `__tests__/weekly-report-dynamic-card.test.tsx`
  - Team Dynamics published weekly report rendering tests.

### Modified Files

- `prisma/schema.prisma`
  - Add `WeeklyReportDraft` model and relations.
- `lib/db-seed.ts`
  - Clear / seed minimal draft-related fixtures if required by API tests.
- `components/report-center/ReportCenter.tsx`
  - Mount `WeeklyReportPanel`.
- `components/team-dynamics/TeamDynamicsTimeline.tsx`
  - Pass `mode` through to card renderer.
- `components/team-dynamics/TeamDynamicCard.tsx`
  - Delegate `WEEKLY_REPORT_CREATED` page-mode display to `WeeklyReportDynamicCard` while keeping panel-mode summary compact.
- `components/team-dynamics/TeamDynamicsPage.tsx`
  - No behavior shift, but tests may require stable hook points for published weekly report display.
- `app/globals.css`
  - Add weekly report panel and published-dynamic styles.
- `__tests__/report-center-component.test.tsx`
  - Update Report Center fetch stubs and assertions.
- `__tests__/team-dynamics-api.test.ts`
  - Extend with weekly report publish visibility when needed.

---

### Task 1: Add Draft Model and Shared Weekly Report Types

**Files:**
- Create: `__tests__/weekly-report-service.test.ts`
- Create: `lib/weekly-report.ts`
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write the failing service test file for week math, deterministic summary, and draft uniqueness**

```ts
import { describe, expect, it } from "vitest";
import {
  buildWeeklyReportSummary,
  getCurrentWeeklyReportWindow,
  type WeeklyReportSnapshot,
} from "@/lib/weekly-report";

describe("weekly-report helpers", () => {
  it("builds an Asia/Shanghai natural-week window from Monday to current day", () => {
    const window = getCurrentWeeklyReportWindow(new Date("2026-04-30T10:00:00+08:00"));

    expect(window.weekStartDayKey).toBe("2026-04-27");
    expect(window.weekEndDayKey).toBe("2026-04-30");
  });

  it("creates deterministic summary text without LLM", () => {
    const snapshot = {
      version: 1,
      weekStartDayKey: "2026-04-27",
      weekEndDayKey: "2026-04-30",
      generatedAt: "2026-04-30T10:00:00.000+08:00",
      generatedByUserId: "admin-1",
      summary: "",
      metrics: {
        totalPunches: 9,
        fullAttendanceDays: 2,
        peakDay: { dayKey: "2026-04-28", value: 4 },
        lowDay: { dayKey: "2026-04-29", value: 1 },
        seasonProgress: { filledSlots: 5, targetSlots: 8, status: "ACTIVE" },
      },
      highlights: {
        topMembers: [{ userId: "u1", label: "本周高光", value: "li · 4 次有效打卡" }],
      },
      sections: [],
    } satisfies WeeklyReportSnapshot;

    expect(buildWeeklyReportSummary(snapshot)).toContain("本周打卡 9 次");
    expect(buildWeeklyReportSummary(snapshot)).toContain("全勤 2 天");
    expect(buildWeeklyReportSummary(snapshot)).toContain("赛季进度 5/8");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx vitest run __tests__/weekly-report-service.test.ts
```

Expected: FAIL with missing `@/lib/weekly-report` exports.

- [ ] **Step 3: Add the `WeeklyReportDraft` Prisma model**

```prisma
model WeeklyReportDraft {
  id              String   @id @default(cuid())
  teamId          String
  team            Team     @relation(fields: [teamId], references: [id])
  createdByUserId String
  createdByUser   User     @relation(fields: [createdByUserId], references: [id])
  weekStartDayKey String
  summary         String
  payloadJson     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([teamId, createdByUserId, weekStartDayKey])
  @@index([teamId, weekStartDayKey, updatedAt])
}
```

Also extend existing relations:

```prisma
model Team {
  // ...
  weeklyReportDrafts WeeklyReportDraft[]
}

model User {
  // ...
  weeklyReportDrafts WeeklyReportDraft[]
}
```

- [ ] **Step 4: Add shared weekly report types and helper functions**

```ts
export interface WeeklyReportWindow {
  weekStartDayKey: string;
  weekEndDayKey: string;
  weekStartAt: Date;
  weekEndAt: Date;
}

export interface WeeklyReportSnapshot {
  version: 1;
  weekStartDayKey: string;
  weekEndDayKey: string;
  generatedAt: string;
  generatedByUserId: string;
  summary: string;
  metrics: {
    totalPunches: number;
    fullAttendanceDays: number;
    peakDay?: { dayKey: string; value: number };
    lowDay?: { dayKey: string; value: number };
    seasonProgress?: {
      filledSlots: number;
      targetSlots: number;
      status: string;
    };
  };
  highlights: {
    topMembers: Array<{ userId: string; label: string; value: string }>;
    coffee?: { userId?: string; label: string; value: string };
  };
  sections: Array<{
    id: string;
    title: string;
    summary: string;
    bullets: string[];
  }>;
}

export function getCurrentWeeklyReportWindow(now: Date = new Date()): WeeklyReportWindow {
  // Asia/Shanghai natural-week calculation
}

export function buildWeeklyReportSummary(snapshot: WeeklyReportSnapshot): string {
  const seasonText = snapshot.metrics.seasonProgress
    ? `，赛季进度 ${snapshot.metrics.seasonProgress.filledSlots}/${snapshot.metrics.seasonProgress.targetSlots}`
    : "";

  return `本周打卡 ${snapshot.metrics.totalPunches} 次，全勤 ${snapshot.metrics.fullAttendanceDays} 天${seasonText}。`;
}
```

- [ ] **Step 5: Regenerate Prisma client**

Run:

```bash
npx prisma generate
```

Expected: Prisma client regenerates without schema errors.

- [ ] **Step 6: Re-run the helper test**

Run:

```bash
npx vitest run __tests__/weekly-report-service.test.ts
```

Expected: PASS for the helper-only assertions.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma lib/weekly-report.ts __tests__/weekly-report-service.test.ts lib/generated/prisma
git commit -m "feat: add weekly report draft schema and types"
```

---

### Task 2: Implement Weekly Report Service and Draft / Publish Flow

**Files:**
- Modify: `__tests__/weekly-report-service.test.ts`
- Create: `lib/weekly-report-service.ts`
- Modify: `lib/db-seed.ts`

- [ ] **Step 1: Expand the failing service test to cover generation, draft overwrite, and publish dedupe**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import {
  generateWeeklyReportDraft,
  getWeeklyReportDraftForAdmin,
  publishWeeklyReportDraft,
} from "@/lib/weekly-report-service";

describe("weekly-report service", () => {
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    teamId = admin.teamId;
  });

  beforeEach(async () => {
    await prisma.teamDynamicReadState.deleteMany();
    await prisma.teamDynamic.deleteMany({ where: { type: "WEEKLY_REPORT_CREATED" } });
    await prisma.weeklyReportDraft.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("generates an admin-owned current-week draft", async () => {
    const draft = await generateWeeklyReportDraft({
      userId: adminId,
      now: new Date("2026-04-30T10:00:00+08:00"),
    });

    expect(draft.createdByUserId).toBe(adminId);
    expect(draft.weekStartDayKey).toBe("2026-04-27");
    expect(draft.snapshot.metrics.totalPunches).toBeGreaterThanOrEqual(0);
    expect(draft.snapshot.summary.length).toBeGreaterThan(0);
  });

  it("overwrites the same admin/week draft instead of creating duplicates", async () => {
    await generateWeeklyReportDraft({ userId: adminId, now: new Date("2026-04-30T10:00:00+08:00") });
    await generateWeeklyReportDraft({ userId: adminId, now: new Date("2026-04-30T11:00:00+08:00") });

    const drafts = await prisma.weeklyReportDraft.findMany({ where: { createdByUserId: adminId } });
    expect(drafts).toHaveLength(1);
  });

  it("keeps drafts private to the generating admin", async () => {
    await generateWeeklyReportDraft({ userId: adminId, now: new Date("2026-04-30T10:00:00+08:00") });

    const ownDraft = await getWeeklyReportDraftForAdmin({
      userId: adminId,
      now: new Date("2026-04-30T12:00:00+08:00"),
    });
    const otherDraft = await getWeeklyReportDraftForAdmin({
      userId: memberId,
      now: new Date("2026-04-30T12:00:00+08:00"),
    });

    expect(ownDraft).not.toBeNull();
    expect(otherDraft).toBeNull();
  });

  it("publishes the current draft as a single WEEKLY_REPORT_CREATED team dynamic", async () => {
    await generateWeeklyReportDraft({ userId: adminId, now: new Date("2026-04-30T10:00:00+08:00") });

    const published = await publishWeeklyReportDraft({
      userId: adminId,
      now: new Date("2026-04-30T12:00:00+08:00"),
    });

    expect(published.type).toBe("WEEKLY_REPORT_CREATED");
    expect(published.sourceType).toBe("weekly-report");

    await publishWeeklyReportDraft({
      userId: adminId,
      now: new Date("2026-04-30T12:05:00+08:00"),
    });

    const dynamics = await prisma.teamDynamic.findMany({
      where: { teamId, type: "WEEKLY_REPORT_CREATED" },
    });
    expect(dynamics).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the service test to verify it fails**

Run:

```bash
npx vitest run __tests__/weekly-report-service.test.ts
```

Expected: FAIL with missing `weekly-report-service` module or methods.

- [ ] **Step 3: Implement the weekly report service foundation**

```ts
import { prisma } from "@/lib/prisma";
import { createOrReuseTeamDynamic } from "@/lib/team-dynamics-service";
import {
  buildWeeklyReportSummary,
  getCurrentWeeklyReportWindow,
  type WeeklyReportSnapshot,
} from "@/lib/weekly-report";

export async function generateWeeklyReportDraft(input: { userId: string; now?: Date }) {
  // 1. Load admin + team context
  // 2. Compute current-week punch, season, coffee, and highlight metrics
  // 3. Build deterministic snapshot + summary
  // 4. Upsert WeeklyReportDraft by (teamId, createdByUserId, weekStartDayKey)
  // 5. Return a parsed object containing db fields + snapshot
}

export async function getWeeklyReportDraftForAdmin(input: { userId: string; now?: Date }) {
  // Load only the caller's current-week draft
}

export async function publishWeeklyReportDraft(input: { userId: string; now?: Date }) {
  // 1. Require an existing current-week draft
  // 2. CreateOrReuseTeamDynamic({ type: WEEKLY_REPORT_CREATED, sourceType: "weekly-report" })
  // 3. Persist summary + payload snapshot
  // 4. Return the published TeamDynamic
}
```

Important implementation rules:

```ts
if (user.role !== "ADMIN") {
  throw new Error("FORBIDDEN");
}

const sourceId = `${user.teamId}:${window.weekStartDayKey}`;
```

For the first version, compute coffee summary by aggregating `CoffeeRecord` rows in the same week window rather than trying to reuse client-only `CoffeeProvider` snapshots.

- [ ] **Step 4: Add minimal seed support only if tests require stable admin/member identity assumptions**

Example pattern in `lib/db-seed.ts`:

```ts
await prisma.weeklyReportDraft.deleteMany();
```

Do not add pre-seeded drafts. Tests should generate their own drafts.

- [ ] **Step 5: Re-run the service test**

Run:

```bash
npx vitest run __tests__/weekly-report-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/weekly-report-service.ts lib/db-seed.ts __tests__/weekly-report-service.test.ts
git commit -m "feat: add weekly report draft service"
```

---

### Task 3: Add Admin-Only Draft and Publish API Routes

**Files:**
- Create: `__tests__/weekly-report-api.test.ts`
- Create: `app/api/reports/weekly/draft/route.ts`
- Create: `app/api/reports/weekly/publish/route.ts`

- [ ] **Step 1: Write failing API tests for auth, admin-only access, draft GET/POST, and publish**

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { createCookieValue } from "@/lib/auth";
import { GET as getDraft, POST as postDraft } from "@/app/api/reports/weekly/draft/route";
import { POST as postPublish } from "@/app/api/reports/weekly/publish/route";

function request(path: string, userId?: string, method: "GET" | "POST" = "GET") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {},
  });
}

describe("/api/reports/weekly/*", () => {
  let adminId: string;
  let memberId: string;

  beforeAll(async () => {
    await seedDatabase();
    adminId = (await prisma.user.findUniqueOrThrow({ where: { username: "li" } })).id;
    memberId = (await prisma.user.findUniqueOrThrow({ where: { username: "luo" } })).id;
  });

  beforeEach(async () => {
    await prisma.teamDynamicReadState.deleteMany();
    await prisma.teamDynamic.deleteMany({ where: { type: "WEEKLY_REPORT_CREATED" } });
    await prisma.weeklyReportDraft.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects unauthenticated draft access", async () => {
    const response = await getDraft(request("/api/reports/weekly/draft"));
    expect(response.status).toBe(401);
  });

  it("rejects member draft generation", async () => {
    const response = await postDraft(request("/api/reports/weekly/draft", memberId, "POST"));
    expect(response.status).toBe(403);
  });

  it("lets admins generate and read their current-week draft", async () => {
    const createResponse = await postDraft(request("/api/reports/weekly/draft", adminId, "POST"));
    expect(createResponse.status).toBe(200);

    const readResponse = await getDraft(request("/api/reports/weekly/draft", adminId));
    const body = await readResponse.json();

    expect(readResponse.status).toBe(200);
    expect(body.summary).toBeTypeOf("string");
    expect(body.snapshot.weekStartDayKey).toBe("2026-04-27");
  });

  it("publishes the admin current-week draft into team dynamics", async () => {
    await postDraft(request("/api/reports/weekly/draft", adminId, "POST"));
    const response = await postPublish(request("/api/reports/weekly/publish", adminId, "POST"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.type).toBe("WEEKLY_REPORT_CREATED");
  });
});
```

- [ ] **Step 2: Run the API test to verify it fails**

Run:

```bash
npx vitest run __tests__/weekly-report-api.test.ts
```

Expected: FAIL with missing route modules.

- [ ] **Step 3: Implement draft route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import {
  generateWeeklyReportDraft,
  getWeeklyReportDraftForAdmin,
} from "@/lib/weekly-report-service";

export async function GET(request: NextRequest) {
  const user = await loadCurrentUser(request.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const draft = await getWeeklyReportDraftForAdmin({ userId: user.id });
  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });

  return NextResponse.json(draft);
}

export async function POST(request: NextRequest) {
  const user = await loadCurrentUser(request.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const draft = await generateWeeklyReportDraft({ userId: user.id });
  return NextResponse.json(draft);
}
```

- [ ] **Step 4: Implement publish route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import { publishWeeklyReportDraft } from "@/lib/weekly-report-service";

export async function POST(request: NextRequest) {
  const user = await loadCurrentUser(request.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const dynamic = await publishWeeklyReportDraft({ userId: user.id });
    return NextResponse.json(dynamic);
  } catch (error) {
    if (error instanceof Error && error.message === "DRAFT_NOT_FOUND") {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    throw error;
  }
}
```

- [ ] **Step 5: Re-run the API test**

Run:

```bash
npx vitest run __tests__/weekly-report-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/reports/weekly/draft/route.ts app/api/reports/weekly/publish/route.ts __tests__/weekly-report-api.test.ts
git commit -m "feat: add weekly report draft and publish api"
```

---

### Task 4: Add Report Center Weekly Report Module

**Files:**
- Create: `__tests__/weekly-report-panel.test.tsx`
- Create: `components/report-center/WeeklyReportPanel.tsx`
- Create: `lib/weekly-report-client.ts`
- Modify: `components/report-center/ReportCenter.tsx`
- Modify: `__tests__/report-center-component.test.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing Report Center weekly report panel test**

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { CoffeeProvider } from "@/lib/coffee-store";
import { BoardProvider } from "@/lib/store";

describe("WeeklyReportPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input) === "/api/coffee/state") {
          return Promise.resolve({ ok: true, json: async () => ({ snapshot: null }) });
        }
        if (String(input) === "/api/reports/weekly/draft") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              summary: "本周打卡 9 次，全勤 2 天。",
              snapshot: {
                weekStartDayKey: "2026-04-27",
                weekEndDayKey: "2026-04-30",
                summary: "本周打卡 9 次，全勤 2 天。",
                metrics: { totalPunches: 9, fullAttendanceDays: 2 },
                highlights: { topMembers: [] },
                sections: [],
              },
            }),
          });
        }
        if (String(input) === "/api/reports/weekly/publish") {
          return Promise.resolve({ ok: true, json: async () => ({ id: "dyn-weekly-1" }) });
        }
        throw new Error(`Unexpected fetch call: ${String(input)} ${init?.method ?? "GET"}`);
      }),
    );
    // render helpers...
  });

  it("shows admin-only generate and publish actions", async () => {
    // render ReportCenter with currentUser.isAdmin = true
    expect(container.textContent).toContain("本周周报");
    expect(container.textContent).toContain("生成本周周报");
    expect(container.textContent).toContain("发布到团队动态");
  });

  it("hides admin actions from members", async () => {
    // render ReportCenter with currentUser.isAdmin = false
    expect(container.textContent).toContain("本周周报");
    expect(container.textContent).not.toContain("生成本周周报");
  });
});
```

- [ ] **Step 2: Run the panel test to verify it fails**

Run:

```bash
npx vitest run __tests__/weekly-report-panel.test.tsx
```

Expected: FAIL with missing `WeeklyReportPanel` or missing admin actions in `ReportCenter`.

- [ ] **Step 3: Add thin client helpers**

```ts
export async function fetchWeeklyReportDraft() {
  const response = await fetch("/api/reports/weekly/draft", { cache: "no-store" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "获取本周周报草稿失败");
  }
  return body;
}

export async function generateWeeklyReportDraft() {
  const response = await fetch("/api/reports/weekly/draft", { method: "POST" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "生成本周周报失败");
  }
  return body;
}

export async function publishWeeklyReport() {
  const response = await fetch("/api/reports/weekly/publish", { method: "POST" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "发布本周周报失败");
  }
  return body;
}
```

- [ ] **Step 4: Implement `WeeklyReportPanel`**

```tsx
export function WeeklyReportPanel({ isAdmin }: { isAdmin: boolean }) {
  const [draft, setDraft] = useState<WeeklyReportDraftResponse | null>(null);
  const [loading, setLoading] = useState(isAdmin);
  const [error, setError] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<"idle" | "published">("idle");

  useEffect(() => {
    if (!isAdmin) return;
    void fetchWeeklyReportDraft()
      .then(setDraft)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (!isAdmin) {
    return <section className="weekly-report-panel">本周周报尚未发布</section>;
  }

  // render admin actions + draft preview + publish status
}
```

The panel should not auto-generate on mount. Only `GET /draft` for existing admin draft state.

- [ ] **Step 5: Mount the panel in `ReportCenter` below the trend / coffee block**

```tsx
<div className="grid grid-cols-1 gap-4 pb-2 xl:grid-cols-3">
  <TrendChart ... />
  <CoffeeReportPanel ... />
</div>
<WeeklyReportPanel isAdmin={state.currentUser?.isAdmin ?? false} />
```

- [ ] **Step 6: Update the existing Report Center component test**

Add fetch stubs:

```ts
if (String(input) === "/api/reports/weekly/draft") {
  return Promise.resolve(createJsonResponse({ error: "Draft not found" }));
}
```

Add assertions:

```ts
expect(container.textContent).toContain("本周周报");
expect(container.textContent).toContain("尚未发布");
```

- [ ] **Step 7: Add minimal weekly report styles**

```css
.weekly-report-panel {
  border: 3px solid #e2e8f0;
  border-radius: 1.5rem;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  box-shadow: 0 5px 16px rgba(15, 23, 42, 0.06);
  padding: 1.1rem;
}

.weekly-report-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
```

- [ ] **Step 8: Re-run the UI tests**

Run:

```bash
npx vitest run __tests__/weekly-report-panel.test.tsx __tests__/report-center-component.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/report-center/WeeklyReportPanel.tsx lib/weekly-report-client.ts components/report-center/ReportCenter.tsx app/globals.css __tests__/weekly-report-panel.test.tsx __tests__/report-center-component.test.tsx
git commit -m "feat: add report center weekly report panel"
```

---

### Task 5: Render Published Weekly Reports in Team Dynamics

**Files:**
- Create: `__tests__/weekly-report-dynamic-card.test.tsx`
- Create: `components/team-dynamics/WeeklyReportDynamicCard.tsx`
- Modify: `components/team-dynamics/TeamDynamicCard.tsx`
- Modify: `components/team-dynamics/TeamDynamicsTimeline.tsx`

- [ ] **Step 1: Write the failing Team Dynamics weekly report card test**

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TeamDynamicsTimeline } from "@/components/team-dynamics/TeamDynamicsTimeline";

describe("WeeklyReportDynamicCard", () => {
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

  it("renders a published weekly report snapshot in page mode", async () => {
    await act(async () => {
      root.render(
        <TeamDynamicsTimeline
          mode="page"
          items={[
            {
              id: "dyn-weekly-1",
              type: "WEEKLY_REPORT_CREATED",
              title: "2026-04-27 本周周报",
              summary: "本周打卡 9 次，全勤 2 天。",
              occurredAt: "2026-04-30T12:00:00.000+08:00",
              payload: {
                summary: "本周打卡 9 次，全勤 2 天。",
                metrics: { totalPunches: 9, fullAttendanceDays: 2 },
                highlights: { topMembers: [{ userId: "u1", label: "本周高光", value: "li · 4 次有效打卡" }] },
                sections: [{ id: "season", title: "赛季进度", summary: "当前赛季 5/8", bullets: ["距离目标还差 3 格"] }],
              },
              isRead: false,
              importance: "high",
            },
          ]}
        />,
      );
    });

    expect(container.textContent).toContain("本周打卡 9 次，全勤 2 天。");
    expect(container.textContent).toContain("li · 4 次有效打卡");
    expect(container.textContent).toContain("当前赛季 5/8");
  });
});
```

- [ ] **Step 2: Run the Team Dynamics weekly report test to verify it fails**

Run:

```bash
npx vitest run __tests__/weekly-report-dynamic-card.test.tsx
```

Expected: FAIL because page-mode Team Dynamics only renders generic summary cards.

- [ ] **Step 3: Pass `mode` through to `TeamDynamicCard`**

```tsx
<TeamDynamicCard key={item.id} item={item} mode={mode} onOpen={onOpenItem} />
```

- [ ] **Step 4: Implement a dedicated published weekly report card**

```tsx
export function WeeklyReportDynamicCard({
  item,
}: {
  item: TeamDynamicListItem;
}) {
  const payload = item.payload as {
    summary?: string;
    metrics?: { totalPunches?: number; fullAttendanceDays?: number };
    highlights?: { topMembers?: Array<{ label: string; value: string }> };
    sections?: Array<{ id: string; title: string; summary: string; bullets: string[] }>;
  };

  return (
    <article className="team-dynamic-card team-dynamic-card-unread text-left">
      <h3 className="mt-2 text-sm font-black text-main">{item.title}</h3>
      <p className="mt-1 text-sm font-bold text-slate-600">{payload.summary ?? item.summary}</p>
      {/* render key metrics + one or two section summaries */}
    </article>
  );
}
```

- [ ] **Step 5: Use the dedicated card only for `WEEKLY_REPORT_CREATED` in page mode**

```tsx
if (mode === "page" && item.type === "WEEKLY_REPORT_CREATED") {
  return <WeeklyReportDynamicCard item={item} />;
}
```

Keep panel mode summary compact and clickable.

- [ ] **Step 6: Re-run the weekly report dynamic test**

Run:

```bash
npx vitest run __tests__/weekly-report-dynamic-card.test.tsx __tests__/team-dynamics-page.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/team-dynamics/WeeklyReportDynamicCard.tsx components/team-dynamics/TeamDynamicCard.tsx components/team-dynamics/TeamDynamicsTimeline.tsx __tests__/weekly-report-dynamic-card.test.tsx
git commit -m "feat: render published weekly reports in team dynamics"
```

---

## Verification Pass

- [ ] Run the full weekly report suite:

```bash
npx vitest run \
  __tests__/weekly-report-service.test.ts \
  __tests__/weekly-report-api.test.ts \
  __tests__/weekly-report-panel.test.tsx \
  __tests__/weekly-report-dynamic-card.test.tsx \
  __tests__/report-center-component.test.tsx \
  __tests__/team-dynamics-api.test.ts
```

Expected: all tests pass.

- [ ] Run the existing docs / navbar safety suite to ensure no regression in adjacent surfaces:

```bash
npx vitest run \
  __tests__/profile-dropdown.test.tsx \
  __tests__/team-dynamics-bell.test.tsx \
  __tests__/docs-route-page.test.tsx
```

Expected: all tests pass.

- [ ] Manually verify in browser:

```text
1. Login as admin.
2. Open 战报中心 and generate current-week draft.
3. Confirm only admin sees draft preview.
4. Publish to 团队动态.
5. Switch to a member account and confirm the published weekly report appears in /dynamics.
6. Confirm no draft controls are visible for the member.
```

---

## Notes for Implementation

- Keep all weekly report calculations deterministic. No LLM calls, no probabilistic wording.
- Do not add a historical weekly-report index in v1.
- Do not auto-generate drafts on page load.
- Do not mutate any `PunchRecord`, `Season`, `CoffeeRecord`, `User.coins`, or Team Dynamic read-state logic while generating or publishing.
- If coffee aggregation proves awkward, prefer a simple week-window aggregate query over reusing client snapshot code.
- If a member opens Report Center and there is no published weekly report summary yet, show a neutral empty state instead of an error.

