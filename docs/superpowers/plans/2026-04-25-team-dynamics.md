# Team Dynamics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Team Dynamics v1 for “脱脂牛马”: a new persisted team timeline with unread state, a bell preview in Navbar, a full `/dynamics` page, and the first batch of automatic event sources from season and punch flows.

**Architecture:** Keep the existing `ActivityEvent` feed as the high-frequency real-time stream and introduce a separate `TeamDynamic` + `TeamDynamicReadState` persistence layer for curated, replayable events. The UI reads that layer through dedicated APIs, the bell preview shows only the newest items plus unread count, and a dedicated `/dynamics` page owns full timeline browsing. Weekly report generation and board-note reference creation stay in later plans, but this plan makes the data model and cards ready for `WEEKLY_REPORT_CREATED` and `BOARD_NOTICE_REFERENCE` items.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom.

---

## File Structure

- Create: `lib/team-dynamics.ts`
  - Shared constants, query normalization, DTO types, card copy helpers, and supported event payload shapes.
- Create: `lib/team-dynamics-refresh.ts`
  - Browser event name and dispatch helper for bell/page refresh after read mutations.
- Create: `lib/team-dynamics-service.ts`
  - Prisma-backed list, unread, mark-read, and idempotent create helpers.
- Modify: `prisma/schema.prisma`
  - Add `TeamDynamic` and `TeamDynamicReadState` models plus relations from `Team` and `User`.
- Modify: `prisma/dev.db`
  - SQLite schema synced after `db push`.
- Create: `app/api/team-dynamics/route.ts`
  - Read route for panel/page list loading and unread counts.
- Create: `app/api/team-dynamics/read/route.ts`
  - Mark-one and mark-all-as-read route.
- Modify: `lib/season-service.ts`
  - Emit `SEASON_STARTED` and `SEASON_ENDED` dynamics from the existing service layer.
- Modify: `app/api/board/punch/route.ts`
  - Emit `SEASON_TARGET_REACHED`, `TEAM_FULL_ATTENDANCE`, and `STREAK_MILESTONE`.
- Modify: `components/navbar/Navbar.tsx`
  - Insert the bell entry to the left of the profile button.
- Create: `components/navbar/TeamDynamicsBell.tsx`
  - Fetch unread/preview data, render the badge, and own panel open state.
- Create: `components/team-dynamics/TeamDynamicsPanel.tsx`
  - Lightweight preview list used by the bell.
- Create: `components/team-dynamics/TeamDynamicsPage.tsx`
  - Client shell for full timeline page data refresh and mark-all actions.
- Create: `components/team-dynamics/TeamDynamicsFilters.tsx`
  - Unread/all toggle and type filter chips.
- Create: `components/team-dynamics/TeamDynamicsTimeline.tsx`
  - Shared list layout for page and panel.
- Create: `components/team-dynamics/TeamDynamicCard.tsx`
  - Shared card row that renders all supported event types.
- Create: `app/(board)/dynamics/page.tsx`
  - Authenticated server page that loads the initial slice and mounts the client page shell.
- Modify: `app/globals.css`
  - Bell button, unread badge, panel, page, and mobile-safe timeline styles.
- Create: `__tests__/team-dynamics-helpers.test.ts`
  - Pure helper coverage for filter parsing and card metadata.
- Create: `__tests__/team-dynamics-service.test.ts`
  - Service-level persistence and dedupe coverage.
- Create: `__tests__/team-dynamics-api.test.ts`
  - API authentication, team scoping, filtering, and read-state coverage.
- Modify: `__tests__/admin-seasons-api.test.ts`
  - Assert season create/end writes dynamics.
- Modify: `__tests__/board-punch-api.test.ts`
  - Assert milestone/full-attendance/target-reached writes dynamics exactly once.
- Create: `__tests__/team-dynamics-bell.test.tsx`
  - Navbar bell badge, preview panel, and navigation coverage.
- Create: `__tests__/team-dynamics-page.test.tsx`
  - Full page filters, empty state, and mark-all-as-read coverage.

---

### Task 1: Shared Team Dynamics Helpers

**Files:**
- Create: `__tests__/team-dynamics-helpers.test.ts`
- Create: `lib/team-dynamics.ts`
- Create: `lib/team-dynamics-refresh.ts`

- [ ] **Step 1: Add failing helper tests for list query defaults, filter parsing, and card labels**

Create `__tests__/team-dynamics-helpers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  TEAM_DYNAMIC_TYPES,
  getTeamDynamicMeta,
  normalizeTeamDynamicsQuery,
} from "@/lib/team-dynamics";

describe("team-dynamics helpers", () => {
  it("uses panel defaults when query params are absent", () => {
    const query = normalizeTeamDynamicsQuery(new URLSearchParams());

    expect(query.view).toBe("panel");
    expect(query.unreadOnly).toBe(false);
    expect(query.type).toBe("ALL");
    expect(query.limit).toBe(8);
  });

  it("accepts page view, unread filter, and explicit event type", () => {
    const query = normalizeTeamDynamicsQuery(
      new URLSearchParams("view=page&filter=unread&type=SEASON_STARTED"),
    );

    expect(query.view).toBe("page");
    expect(query.unreadOnly).toBe(true);
    expect(query.type).toBe(TEAM_DYNAMIC_TYPES.SEASON_STARTED);
    expect(query.limit).toBe(50);
  });

  it("returns readable meta for report and season cards", () => {
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.WEEKLY_REPORT_CREATED)).toMatchObject({
      label: "周报",
      tone: "highlight",
    });
    expect(getTeamDynamicMeta(TEAM_DYNAMIC_TYPES.SEASON_TARGET_REACHED)).toMatchObject({
      label: "赛季里程碑",
      tone: "success",
    });
  });
});
```

- [ ] **Step 2: Run helper test to verify it fails**

Run:

```bash
npm test -- __tests__/team-dynamics-helpers.test.ts
```

Expected: FAIL because the helper module does not exist yet.

- [ ] **Step 3: Implement the shared team-dynamics helper module**

Create `lib/team-dynamics.ts`:

```ts
export const TEAM_DYNAMIC_TYPES = {
  WEEKLY_REPORT_CREATED: "WEEKLY_REPORT_CREATED",
  SEASON_STARTED: "SEASON_STARTED",
  SEASON_TARGET_REACHED: "SEASON_TARGET_REACHED",
  SEASON_ENDED: "SEASON_ENDED",
  TEAM_FULL_ATTENDANCE: "TEAM_FULL_ATTENDANCE",
  STREAK_MILESTONE: "STREAK_MILESTONE",
  COFFEE_SUMMARY: "COFFEE_SUMMARY",
  BOARD_NOTICE_REFERENCE: "BOARD_NOTICE_REFERENCE",
} as const;

export type TeamDynamicType =
  (typeof TEAM_DYNAMIC_TYPES)[keyof typeof TEAM_DYNAMIC_TYPES];

export type TeamDynamicListView = "panel" | "page";
export type TeamDynamicFilterType = TeamDynamicType | "ALL";

export interface NormalizedTeamDynamicsQuery {
  view: TeamDynamicListView;
  unreadOnly: boolean;
  type: TeamDynamicFilterType;
  limit: number;
  cursor: string | null;
}

export function normalizeTeamDynamicsQuery(searchParams: URLSearchParams): NormalizedTeamDynamicsQuery {
  const view = searchParams.get("view") === "page" ? "page" : "panel";
  const unreadOnly = searchParams.get("filter") === "unread";
  const typeParam = searchParams.get("type");
  const type =
    typeParam && Object.values(TEAM_DYNAMIC_TYPES).includes(typeParam as TeamDynamicType)
      ? (typeParam as TeamDynamicType)
      : "ALL";

  return {
    view,
    unreadOnly,
    type,
    limit: view === "page" ? 50 : 8,
    cursor: searchParams.get("cursor"),
  };
}

export function getTeamDynamicMeta(type: TeamDynamicType) {
  switch (type) {
    case TEAM_DYNAMIC_TYPES.WEEKLY_REPORT_CREATED:
      return { label: "周报", tone: "highlight" } as const;
    case TEAM_DYNAMIC_TYPES.SEASON_TARGET_REACHED:
      return { label: "赛季里程碑", tone: "success" } as const;
    case TEAM_DYNAMIC_TYPES.SEASON_STARTED:
    case TEAM_DYNAMIC_TYPES.SEASON_ENDED:
      return { label: "赛季", tone: "default" } as const;
    case TEAM_DYNAMIC_TYPES.TEAM_FULL_ATTENDANCE:
      return { label: "全勤日", tone: "success" } as const;
    case TEAM_DYNAMIC_TYPES.STREAK_MILESTONE:
      return { label: "连签里程碑", tone: "highlight" } as const;
    case TEAM_DYNAMIC_TYPES.COFFEE_SUMMARY:
      return { label: "咖啡摘要", tone: "default" } as const;
    case TEAM_DYNAMIC_TYPES.BOARD_NOTICE_REFERENCE:
      return { label: "公告引用", tone: "default" } as const;
  }
}
```

Create `lib/team-dynamics-refresh.ts`:

```ts
export const TEAM_DYNAMICS_REFRESH_EVENT = "team-dynamics:refresh";

export function dispatchTeamDynamicsRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(TEAM_DYNAMICS_REFRESH_EVENT));
}
```

- [ ] **Step 4: Run helper test to verify it passes**

Run:

```bash
npm test -- __tests__/team-dynamics-helpers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the shared helper foundation**

```bash
git add __tests__/team-dynamics-helpers.test.ts lib/team-dynamics.ts lib/team-dynamics-refresh.ts
git commit -m "feat: add team dynamics helper module"
```

---

### Task 2: Prisma Models and Service Layer

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/dev.db`
- Create: `__tests__/team-dynamics-service.test.ts`
- Create: `lib/team-dynamics-service.ts`

- [ ] **Step 1: Extend Prisma schema for timeline entries and per-user read state**

Update `prisma/schema.prisma`:

```prisma
model Team {
  id               String                 @id @default(cuid())
  name             String
  code             String                 @unique
  createdAt        DateTime               @default(now())
  users            User[]
  boardNotes       BoardNote[]
  seasons          Season[]
  activityEvents   ActivityEvent[]
  coffeeRecords    CoffeeRecord[]
  teamDynamics     TeamDynamic[]
}

model User {
  id                    String                 @id @default(cuid())
  username              String                 @unique
  password              String
  avatarKey             String
  role                  String                 @default("MEMBER")
  currentStreak         Int                    @default(0)
  lastPunchDayKey       String?
  coins                 Int                    @default(0)
  teamId                String
  team                  Team                   @relation(fields: [teamId], references: [id])
  punchRecords          PunchRecord[]
  boardNotes            BoardNote[]
  seasonStats           SeasonMemberStat[]
  activityEvents        ActivityEvent[]
  coffeeRecords         CoffeeRecord[]
  teamDynamicReadStates TeamDynamicReadState[]
  createdAt             DateTime               @default(now())
}

model TeamDynamic {
  id           String                 @id @default(cuid())
  teamId       String
  team         Team                   @relation(fields: [teamId], references: [id])
  type         String
  title        String
  summary      String
  payloadJson  String
  actorUserId  String?
  sourceType   String?
  sourceId     String?
  importance   String                 @default("normal")
  occurredAt   DateTime
  createdAt    DateTime               @default(now())
  updatedAt    DateTime               @updatedAt
  readStates   TeamDynamicReadState[]

  @@index([teamId, occurredAt])
  @@index([teamId, type, occurredAt])
  @@unique([teamId, sourceType, sourceId])
}

model TeamDynamicReadState {
  id            String      @id @default(cuid())
  teamDynamicId String
  teamDynamic   TeamDynamic @relation(fields: [teamDynamicId], references: [id])
  userId        String
  user          User        @relation(fields: [userId], references: [id])
  readAt        DateTime    @default(now())

  @@unique([teamDynamicId, userId])
  @@index([userId, readAt])
}
```

- [ ] **Step 2: Sync the SQLite schema and Prisma client**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: Prisma updates `prisma/dev.db` and regenerates `lib/generated/prisma`.

- [ ] **Step 3: Add failing service tests for dedupe, unread counts, and mark-read behavior**

Create `__tests__/team-dynamics-service.test.ts`:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import {
  createOrReuseTeamDynamic,
  listTeamDynamicsForUser,
  markAllTeamDynamicsRead,
  markTeamDynamicRead,
} from "@/lib/team-dynamics-service";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";

describe("team-dynamics service", () => {
  let userId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
  });

  beforeEach(async () => {
    await prisma.teamDynamicReadState.deleteMany();
    await prisma.teamDynamic.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("dedupes entries by source key", async () => {
    const first = await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
      title: "新赛季已开启",
      summary: "五月掉脂挑战开冲",
      payload: { goalName: "五月掉脂挑战" },
      sourceType: "season",
      sourceId: "season-1",
      occurredAt: new Date("2026-04-25T08:00:00+08:00"),
    });

    const second = await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
      title: "重复创建不应新增",
      summary: "should reuse",
      payload: { goalName: "五月掉脂挑战" },
      sourceType: "season",
      sourceId: "season-1",
      occurredAt: new Date("2026-04-25T08:00:00+08:00"),
    });

    expect(second.id).toBe(first.id);
    expect(await prisma.teamDynamic.count()).toBe(1);
  });

  it("returns unread count and filters out read entries in unread mode", async () => {
    const seasonEntry = await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
      title: "新赛季已开启",
      summary: "五月掉脂挑战开冲",
      payload: { goalName: "五月掉脂挑战" },
      sourceType: "season",
      sourceId: "season-2",
      occurredAt: new Date("2026-04-25T08:00:00+08:00"),
    });

    await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.STREAK_MILESTONE,
      title: "li 连续打卡 7 天",
      summary: "保持住了",
      payload: { username: "li", streak: 7 },
      sourceType: "streak",
      sourceId: "li-7-2026-04-25",
      occurredAt: new Date("2026-04-25T09:00:00+08:00"),
    });

    await markTeamDynamicRead({ userId, teamDynamicId: seasonEntry.id });

    const unreadOnly = await listTeamDynamicsForUser({
      userId,
      view: "page",
      unreadOnly: true,
      type: "ALL",
      limit: 50,
      cursor: null,
    });

    expect(unreadOnly.unreadCount).toBe(1);
    expect(unreadOnly.items).toHaveLength(1);
    expect(unreadOnly.items[0].type).toBe(TEAM_DYNAMIC_TYPES.STREAK_MILESTONE);
  });

  it("marks all entries as read for the viewer", async () => {
    await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_ENDED,
      title: "赛季已结束",
      summary: "五月掉脂挑战已封板",
      payload: { goalName: "五月掉脂挑战" },
      sourceType: "season",
      sourceId: "season-3-ended",
      occurredAt: new Date("2026-04-25T10:00:00+08:00"),
    });

    await markAllTeamDynamicsRead({ userId, teamId });

    const result = await listTeamDynamicsForUser({
      userId,
      view: "panel",
      unreadOnly: true,
      type: "ALL",
      limit: 8,
      cursor: null,
    });

    expect(result.unreadCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});
```

- [ ] **Step 4: Implement the Prisma-backed service layer**

Create `lib/team-dynamics-service.ts`:

```ts
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { TeamDynamicType, TeamDynamicFilterType, TeamDynamicListView } from "@/lib/team-dynamics";

type PrismaLike = typeof prisma | Prisma.TransactionClient;

interface CreateTeamDynamicInput {
  teamId: string;
  type: TeamDynamicType;
  title: string;
  summary: string;
  payload: unknown;
  actorUserId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  importance?: "normal" | "high";
  occurredAt: Date;
  client?: PrismaLike;
}

export async function createOrReuseTeamDynamic(input: CreateTeamDynamicInput) {
  const client = input.client ?? prisma;

  if (input.sourceType && input.sourceId) {
    const existing = await client.teamDynamic.findFirst({
      where: {
        teamId: input.teamId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    });

    if (existing) {
      return existing;
    }
  }

  return client.teamDynamic.create({
    data: {
      teamId: input.teamId,
      type: input.type,
      title: input.title,
      summary: input.summary,
      payloadJson: JSON.stringify(input.payload ?? {}),
      actorUserId: input.actorUserId ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      importance: input.importance ?? "normal",
      occurredAt: input.occurredAt,
    },
  });
}

export async function listTeamDynamicsForUser(input: {
  userId: string;
  view: TeamDynamicListView;
  unreadOnly: boolean;
  type: TeamDynamicFilterType;
  limit: number;
  cursor: string | null;
}) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { teamId: true },
  });

  const readStateWhere = { none: { userId: input.userId } };
  const where = {
    teamId: user.teamId,
    ...(input.type === "ALL" ? {} : { type: input.type }),
    ...(input.unreadOnly ? { readStates: readStateWhere } : {}),
    ...(input.cursor ? { occurredAt: { lt: new Date(input.cursor) } } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.teamDynamic.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: input.limit,
      include: {
        readStates: {
          where: { userId: input.userId },
          select: { readAt: true },
        },
      },
    }),
    prisma.teamDynamic.count({
      where: {
        teamId: user.teamId,
        readStates: readStateWhere,
      },
    }),
  ]);

  return {
    unreadCount,
    items: items.map((item) => ({
      ...item,
      payload: JSON.parse(item.payloadJson || "{}") as Record<string, unknown>,
      isRead: item.readStates.length > 0,
    })),
    nextCursor: items.length === input.limit ? items.at(-1)?.occurredAt.toISOString() ?? null : null,
  };
}

export async function markTeamDynamicRead(input: { userId: string; teamDynamicId: string }) {
  return prisma.teamDynamicReadState.upsert({
    where: {
      teamDynamicId_userId: {
        teamDynamicId: input.teamDynamicId,
        userId: input.userId,
      },
    },
    update: { readAt: new Date() },
    create: {
      teamDynamicId: input.teamDynamicId,
      userId: input.userId,
      readAt: new Date(),
    },
  });
}

export async function markAllTeamDynamicsRead(input: { userId: string; teamId: string }) {
  const unread = await prisma.teamDynamic.findMany({
    where: {
      teamId: input.teamId,
      readStates: { none: { userId: input.userId } },
    },
    select: { id: true },
  });

  if (unread.length === 0) {
    return 0;
  }

  await prisma.teamDynamicReadState.createMany({
    data: unread.map((item) => ({
      teamDynamicId: item.id,
      userId: input.userId,
      readAt: new Date(),
    })),
    skipDuplicates: true,
  });

  return unread.length;
}
```

- [ ] **Step 5: Run service test to verify it passes**

Run:

```bash
npm test -- __tests__/team-dynamics-service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the schema and service layer**

```bash
git add prisma/schema.prisma prisma/dev.db lib/team-dynamics-service.ts __tests__/team-dynamics-service.test.ts
git commit -m "feat: add team dynamics persistence layer"
```

---

### Task 3: Team Dynamics Read and Mark-Read APIs

**Files:**
- Create: `app/api/team-dynamics/route.ts`
- Create: `app/api/team-dynamics/read/route.ts`
- Create: `__tests__/team-dynamics-api.test.ts`

- [ ] **Step 1: Add failing API tests for auth, team scoping, filtering, and mark-read**

Create `__tests__/team-dynamics-api.test.ts`:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { GET as getTimeline } from "@/app/api/team-dynamics/route";
import { POST as postRead } from "@/app/api/team-dynamics/read/route";
import { createCookieValue } from "@/lib/auth";
import { createOrReuseTeamDynamic } from "@/lib/team-dynamics-service";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";

function request(path: string, userId?: string, method: "GET" | "POST" = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("/api/team-dynamics", () => {
  let userId: string;
  let teammateId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const teammate = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    userId = user.id;
    teammateId = teammate.id;
    teamId = user.teamId;
  });

  beforeEach(async () => {
    await prisma.teamDynamicReadState.deleteMany();
    await prisma.teamDynamic.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await getTimeline(request("/api/team-dynamics"));
    expect(response.status).toBe(401);
  });

  it("returns the latest panel slice and unread count for the viewer team", async () => {
    await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
      title: "新赛季已开启",
      summary: "五月掉脂挑战开冲",
      payload: { goalName: "五月掉脂挑战" },
      sourceType: "season",
      sourceId: "season-panel",
      occurredAt: new Date("2026-04-25T08:00:00+08:00"),
    });

    const response = await getTimeline(request("/api/team-dynamics?view=panel", userId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.unreadCount).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      title: "新赛季已开启",
      isRead: false,
    });
  });

  it("supports unread filter and marks entries as read", async () => {
    const entry = await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.STREAK_MILESTONE,
      title: "li 连续打卡 7 天",
      summary: "保持住了",
      payload: { username: "li", streak: 7 },
      sourceType: "streak",
      sourceId: "li-7-2026-04-25",
      occurredAt: new Date("2026-04-25T09:00:00+08:00"),
    });

    const markResponse = await postRead(
      request("/api/team-dynamics/read", userId, "POST", {
        mode: "single",
        id: entry.id,
      }),
    );
    expect(markResponse.status).toBe(200);

    const response = await getTimeline(
      request("/api/team-dynamics?view=page&filter=unread", userId),
    );
    const body = await response.json();

    expect(body.unreadCount).toBe(0);
    expect(body.items).toHaveLength(0);
  });

  it("marks all entries as read for the current user only", async () => {
    await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_ENDED,
      title: "赛季已结束",
      summary: "五月掉脂挑战已封板",
      payload: { goalName: "五月掉脂挑战" },
      sourceType: "season",
      sourceId: "season-ended-page",
      occurredAt: new Date("2026-04-25T10:00:00+08:00"),
    });

    const response = await postRead(
      request("/api/team-dynamics/read", userId, "POST", {
        mode: "all",
      }),
    );
    expect(response.status).toBe(200);

    const teammateView = await getTimeline(request("/api/team-dynamics?view=panel", teammateId));
    const teammateBody = await teammateView.json();

    expect(teammateBody.unreadCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run API test to verify it fails**

Run:

```bash
npm test -- __tests__/team-dynamics-api.test.ts
```

Expected: FAIL because the routes do not exist yet.

- [ ] **Step 3: Implement the list and mark-read routes**

Create `app/api/team-dynamics/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import { normalizeTeamDynamicsQuery } from "@/lib/team-dynamics";
import { listTeamDynamicsForUser } from "@/lib/team-dynamics-service";

export async function GET(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const query = normalizeTeamDynamicsQuery(request.nextUrl.searchParams);
    const result = await listTeamDynamicsForUser({
      userId: user.id,
      ...query,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[team-dynamics] list failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

Create `app/api/team-dynamics/read/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import { markAllTeamDynamicsRead, markTeamDynamicRead } from "@/lib/team-dynamics-service";

export async function POST(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { mode?: "single"; id?: string }
      | { mode?: "all" }
      | null;

    if (!body?.mode) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (body.mode === "single") {
      if (!("id" in body) || typeof body.id !== "string" || body.id.trim() === "") {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }

      await markTeamDynamicRead({ userId: user.id, teamDynamicId: body.id });
      return NextResponse.json({ ok: true });
    }

    await markAllTeamDynamicsRead({ userId: user.id, teamId: user.teamId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[team-dynamics] mark-read failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run API test to verify it passes**

Run:

```bash
npm test -- __tests__/team-dynamics-api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the API layer**

```bash
git add app/api/team-dynamics/route.ts app/api/team-dynamics/read/route.ts __tests__/team-dynamics-api.test.ts
git commit -m "feat: add team dynamics api routes"
```

---

### Task 4: Emit Team Dynamics from Existing Season and Punch Flows

**Files:**
- Modify: `lib/season-service.ts`
- Modify: `app/api/board/punch/route.ts`
- Modify: `__tests__/admin-seasons-api.test.ts`
- Modify: `__tests__/board-punch-api.test.ts`

- [ ] **Step 1: Add failing season API assertions for `SEASON_STARTED` and `SEASON_ENDED` entries**

Append to `__tests__/admin-seasons-api.test.ts`:

```ts
  it("writes a team dynamic when a season starts", async () => {
    const { admin } = await getSeedUsers();

    const response = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "五月掉脂挑战",
        targetSlots: 80,
      }),
    );

    expect(response.status).toBe(201);

    const entry = await prisma.teamDynamic.findFirstOrThrow({
      where: { teamId: admin.teamId, type: "SEASON_STARTED" },
      orderBy: { occurredAt: "desc" },
    });

    expect(entry.title).toContain("新赛季");
    expect(entry.summary).toContain("五月掉脂挑战");
  });

  it("writes a team dynamic when the active season ends", async () => {
    const { admin } = await getSeedUsers();

    const createResponse = await POST(
      makeRequest("POST", "/api/admin/seasons", admin.id, {
        goalName: "五月掉脂挑战",
        targetSlots: 120,
      }),
    );
    expect(createResponse.status).toBe(201);

    const endResponse = await PATCH(makeRequest("PATCH", "/api/admin/seasons/current", admin.id));
    expect(endResponse.status).toBe(200);

    const entry = await prisma.teamDynamic.findFirstOrThrow({
      where: { teamId: admin.teamId, type: "SEASON_ENDED" },
      orderBy: { occurredAt: "desc" },
    });

    expect(entry.title).toContain("赛季已结束");
  });
```

Also extend `cleanupAdminSeasonArtifacts()` in the same file so the new tables are cleared during teardown:

```ts
  await prisma.teamDynamicReadState.deleteMany();
  await prisma.teamDynamic.deleteMany();
```

- [ ] **Step 2: Add failing punch API assertions for target reached, full attendance, and streak milestones**

Append to `__tests__/board-punch-api.test.ts`:

```ts
  it("writes a season target reached dynamic exactly once when the last slot fills", async () => {
    await resetState();
    await createActiveSeason({ filledSlots: 0, targetSlots: 1 });

    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const otherUser = await prisma.user.findFirstOrThrow({
      where: { teamId: currentUser.teamId, id: { not: userId } },
      orderBy: { createdAt: "asc" },
    });

    const [firstResponse, secondResponse] = await Promise.all([
      POST(request("POST", userId)),
      POST(request("POST", otherUser.id)),
    ]);

    expect([firstResponse.status, secondResponse.status].sort((a, b) => a - b)).toEqual([200, 200]);

    const entries = await prisma.teamDynamic.findMany({
      where: { teamId: currentUser.teamId, type: "SEASON_TARGET_REACHED" },
    });

    expect(entries).toHaveLength(1);
  });

  it("writes a full attendance dynamic when every member punches on the same day", async () => {
    await resetState();
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const teammates = await prisma.user.findMany({
      where: { teamId: currentUser.teamId },
      orderBy: { createdAt: "asc" },
    });

    for (const teammate of teammates) {
      const response = await POST(request("POST", teammate.id));
      expect(response.status).toBe(200);
    }

    const entry = await prisma.teamDynamic.findFirstOrThrow({
      where: { teamId: currentUser.teamId, type: "TEAM_FULL_ATTENDANCE" },
      orderBy: { occurredAt: "desc" },
    });

    expect(entry.summary).toContain("全勤");
  });

  it("writes a streak milestone dynamic when the current user reaches seven days", async () => {
    await resetState();
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 6,
        lastPunchDayKey: "2026-04-23",
      },
    });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const entry = await prisma.teamDynamic.findFirstOrThrow({
      where: { type: "STREAK_MILESTONE" },
      orderBy: { occurredAt: "desc" },
    });

    expect(entry.title).toContain("7 天");
  });
```

Also extend `resetState()` in the same file so punch tests start from a clean timeline:

```ts
    await prisma.teamDynamicReadState.deleteMany();
    await prisma.teamDynamic.deleteMany({
      where: {
        teamId: user.teamId,
      },
    });
```

- [ ] **Step 3: Run the season and punch API tests to verify they fail**

Run:

```bash
npm test -- __tests__/admin-seasons-api.test.ts __tests__/board-punch-api.test.ts
```

Expected: FAIL because no team dynamics are being created yet.

- [ ] **Step 4: Emit dynamics from season service and punch settlement paths**

Modify `lib/season-service.ts` to write dynamics inside the existing flow:

```ts
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";
import { createOrReuseTeamDynamic } from "@/lib/team-dynamics-service";

export async function createSeasonForTeam(...) {
  // existing season creation...
  const season = await prisma.season.findUniqueOrThrow({ where: { id: seasonId } });

  await createOrReuseTeamDynamic({
    teamId,
    type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
    title: `新赛季已开启：${goalName}`,
    summary: `${goalName} · ${targetSlots} 格冲刺已经开始`,
    payload: {
      seasonId: season.id,
      goalName: season.goalName,
      targetSlots: season.targetSlots,
      monthKey: season.monthKey,
    },
    sourceType: "season",
    sourceId: `${season.id}:started`,
    occurredAt: now,
  });

  return serializeSeason(season);
}

export async function endActiveSeasonForTeam(...) {
  // existing update...
  await createOrReuseTeamDynamic({
    teamId,
    type: TEAM_DYNAMIC_TYPES.SEASON_ENDED,
    title: `赛季已结束：${season.goalName}`,
    summary: `${season.goalName} 本期定格在 ${season.filledSlots}/${season.targetSlots}`,
    payload: {
      seasonId: season.id,
      goalName: season.goalName,
      filledSlots: season.filledSlots,
      targetSlots: season.targetSlots,
    },
    sourceType: "season",
    sourceId: `${season.id}:ended`,
    occurredAt: now,
  });

  return serializeSeason(season);
}
```

Modify `app/api/board/punch/route.ts` to emit milestone dynamics after the successful transaction:

```ts
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";
import { createOrReuseTeamDynamic } from "@/lib/team-dynamics-service";

const STREAK_MILESTONES = new Set([7, 14, 30]);

// after the punch transaction succeeds:
let recordCountedForSeasonSlot = false;
let nextFilledSlots = activeSeason?.filledSlots ?? 0;

// inside the existing transaction, right after season.updateMany:
recordCountedForSeasonSlot = countsForSeasonSlot;
nextFilledSlots = countsForSeasonSlot
  ? Math.min((activeSeason?.filledSlots ?? 0) + 1, activeSeason?.targetSlots ?? 0)
  : activeSeason?.filledSlots ?? 0;

// after the transaction commits:
const teamMemberCount = user.team.users.length;
const todayPunchCount = await prisma.punchRecord.count({
  where: {
    userId: { in: user.team.users.map((member) => member.id) },
    dayKey: todayDayKey,
    punched: true,
  },
});

if (STREAK_MILESTONES.has(nextStreak)) {
  await createOrReuseTeamDynamic({
    teamId: user.teamId,
    actorUserId: user.id,
    type: TEAM_DYNAMIC_TYPES.STREAK_MILESTONE,
    title: `${user.username} 连续打卡 ${nextStreak} 天`,
    summary: `${user.username} 把连签推进到了 ${nextStreak} 天`,
    payload: { userId: user.id, username: user.username, streak: nextStreak },
    sourceType: "streak",
    sourceId: `${user.id}:${nextStreak}:${todayDayKey}`,
    occurredAt: now,
  });
}

if (todayPunchCount === teamMemberCount) {
  await createOrReuseTeamDynamic({
    teamId: user.teamId,
    type: TEAM_DYNAMIC_TYPES.TEAM_FULL_ATTENDANCE,
    title: "今天全员完成打卡",
    summary: `${todayDayKey} 团队全勤，今天没有人掉队`,
    payload: { dayKey: todayDayKey, memberCount: teamMemberCount },
    sourceType: "attendance",
    sourceId: todayDayKey,
    occurredAt: now,
  });
}

if (activeSeason && recordCountedForSeasonSlot && nextFilledSlots === activeSeason.targetSlots) {
  await createOrReuseTeamDynamic({
    teamId: user.teamId,
    type: TEAM_DYNAMIC_TYPES.SEASON_TARGET_REACHED,
    title: `赛季目标已达成：${activeSeason.goalName}`,
    summary: `${activeSeason.goalName} 冲到了 ${activeSeason.targetSlots}/${activeSeason.targetSlots}`,
    payload: {
      seasonId: activeSeason.id,
      goalName: activeSeason.goalName,
      filledSlots: activeSeason.targetSlots,
      targetSlots: activeSeason.targetSlots,
    },
    sourceType: "season-target",
    sourceId: activeSeason.id,
    occurredAt: now,
  });
}
```

Implementation note:

- Track `recordCountedForSeasonSlot` and `nextFilledSlots` inside the existing transaction and return them to the outer scope.
- Do **not** create team dynamics for every normal punch or undo; this plan only adds curated milestone events.

- [ ] **Step 5: Run the season and punch API tests to verify they pass**

Run:

```bash
npm test -- __tests__/admin-seasons-api.test.ts __tests__/board-punch-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the event source integrations**

```bash
git add lib/season-service.ts app/api/board/punch/route.ts __tests__/admin-seasons-api.test.ts __tests__/board-punch-api.test.ts
git commit -m "feat: emit team dynamics from season and punch flows"
```

---

### Task 5: Navbar Bell and Preview Panel

**Files:**
- Modify: `components/navbar/Navbar.tsx`
- Create: `components/navbar/TeamDynamicsBell.tsx`
- Create: `components/team-dynamics/TeamDynamicsPanel.tsx`
- Modify: `app/globals.css`
- Create: `__tests__/team-dynamics-bell.test.tsx`

- [ ] **Step 1: Add failing bell tests for unread badge and preview panel**

Create `__tests__/team-dynamics-bell.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar/Navbar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const dispatch = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: {
      members: [{ id: "u1", name: "li", avatarKey: "male1" }],
      gridData: [[false]],
      teamVaultTotal: 0,
      currentUser: {
        assetBalance: 0,
        currentStreak: 0,
        nextReward: 10,
        seasonIncome: 0,
        isAdmin: false,
      },
      activeSeason: null,
      today: 1,
      totalDays: 1,
      currentUserId: "u1",
      logs: [],
      activeTab: "punch",
    },
    dispatch,
  }),
}));

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe("TeamDynamicsBell", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          unreadCount: 2,
          items: [
            {
              id: "dyn-1",
              type: "SEASON_STARTED",
              title: "新赛季已开启：五月掉脂挑战",
              summary: "五月掉脂挑战 · 80 格冲刺已经开始",
              occurredAt: "2026-04-25T08:00:00.000Z",
              payload: {},
              isRead: false,
            },
          ],
          nextCursor: null,
        }),
      ),
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("shows unread count on the bell and opens the preview panel", async () => {
    await act(async () => {
      root.render(<Navbar />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("2");

    const bellButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.getAttribute("aria-label")?.includes("团队动态"),
    );
    expect(bellButton).toBeDefined();

    await act(async () => {
      bellButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("查看全部动态");
    expect(container.textContent).toContain("新赛季已开启：五月掉脂挑战");
  });
});
```

- [ ] **Step 2: Run bell test to verify it fails**

Run:

```bash
npm test -- __tests__/team-dynamics-bell.test.tsx
```

Expected: FAIL because the bell component does not exist yet.

- [ ] **Step 3: Implement the bell button, preview panel, and shared refresh behavior**

Create `components/navbar/TeamDynamicsBell.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TEAM_DYNAMICS_REFRESH_EVENT } from "@/lib/team-dynamics-refresh";
import { TeamDynamicsPanel } from "@/components/team-dynamics/TeamDynamicsPanel";

interface TeamDynamicPreviewItem {
  id: string;
  type: string;
  title: string;
  summary: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  isRead: boolean;
}

export function TeamDynamicsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<TeamDynamicPreviewItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchPreview = useCallback(async () => {
    const response = await fetch("/api/team-dynamics?view=panel", { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const body = await response.json() as {
      unreadCount: number;
      items: TeamDynamicPreviewItem[];
    };

    setUnreadCount(body.unreadCount);
    setItems(body.items);
  }, []);

  useEffect(() => {
    void fetchPreview();
    const timer = window.setInterval(() => void fetchPreview(), 30000);
    const handleRefresh = () => void fetchPreview();
    window.addEventListener(TEAM_DYNAMICS_REFRESH_EVENT, handleRefresh);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener(TEAM_DYNAMICS_REFRESH_EVENT, handleRefresh);
    };
  }, [fetchPreview]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`团队动态，未读 ${unreadCount} 条`}
        onClick={() => setOpen((value) => !value)}
        className="team-dynamics-bell-btn"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 ? <span className="team-dynamics-bell-badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <TeamDynamicsPanel
          items={items}
          unreadCount={unreadCount}
          onOpenItem={async (itemId) => {
            await fetch("/api/team-dynamics/read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode: "single", id: itemId }),
            });
            setOpen(false);
            router.push("/dynamics");
          }}
          onOpenAll={() => {
            setOpen(false);
            router.push("/dynamics");
          }}
        />
      ) : null}
    </div>
  );
}
```

Create `components/team-dynamics/TeamDynamicsPanel.tsx`:

```tsx
import { TeamDynamicsTimeline } from "./TeamDynamicsTimeline";

export function TeamDynamicsPanel({
  items,
  unreadCount,
  onOpenItem,
  onOpenAll,
}: {
  items: Array<{
    id: string;
    type: string;
    title: string;
    summary: string;
    occurredAt: string;
    payload: Record<string, unknown>;
    isRead: boolean;
  }>;
  unreadCount: number;
  onOpenItem: (itemId: string) => void | Promise<void>;
  onOpenAll: () => void;
}) {
  return (
    <div className="team-dynamics-panel dropdown-menu show p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-main">团队动态</h2>
          <p className="text-xs font-bold text-sub">未读 {unreadCount} 条</p>
        </div>
        <button type="button" className="quest-btn px-3 py-1 text-xs" onClick={onOpenAll}>
          查看全部动态
        </button>
      </div>
      <TeamDynamicsTimeline items={items} mode="panel" onOpenItem={onOpenItem} />
    </div>
  );
}
```

Modify the right-side action area in `components/navbar/Navbar.tsx`:

```tsx
import { TeamDynamicsBell } from "./TeamDynamicsBell";

// inside the right-side controls:
<div className="relative flex shrink-0 items-center gap-2">
  <button ...>...</button>
  <TeamDynamicsBell />
  <button onClick={handleProfileClick} ...>...</button>
</div>
```

Add to `app/globals.css`:

```css
.team-dynamics-bell-btn {
  position: relative;
  display: inline-flex;
  width: 2.5rem;
  height: 2.5rem;
  align-items: center;
  justify-content: center;
  border: 2px solid #1f2937;
  border-radius: 9999px;
  background: #fff7cc;
  box-shadow: 0 3px 0 0 #1f2937;
  font-size: 1rem;
  font-weight: 900;
}

.team-dynamics-bell-badge {
  position: absolute;
  top: -0.25rem;
  right: -0.25rem;
  min-width: 1.15rem;
  height: 1.15rem;
  padding-inline: 0.2rem;
  border: 2px solid #1f2937;
  border-radius: 9999px;
  background: #ef4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 900;
  line-height: 0.85rem;
}

.team-dynamics-panel {
  right: 0;
  width: min(24rem, calc(100vw - 2rem));
  max-height: min(32rem, calc(100vh - 6rem));
  overflow: auto;
}
```

- [ ] **Step 4: Run bell test to verify it passes**

Run:

```bash
npm test -- __tests__/team-dynamics-bell.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the Navbar bell preview**

```bash
git add components/navbar/Navbar.tsx components/navbar/TeamDynamicsBell.tsx components/team-dynamics/TeamDynamicsPanel.tsx app/globals.css __tests__/team-dynamics-bell.test.tsx
git commit -m "feat: add team dynamics bell preview"
```

---

### Task 6: Full `/dynamics` Page, Shared Cards, and Read Controls

**Files:**
- Create: `app/(board)/dynamics/page.tsx`
- Create: `components/team-dynamics/TeamDynamicsPage.tsx`
- Create: `components/team-dynamics/TeamDynamicsFilters.tsx`
- Create: `components/team-dynamics/TeamDynamicsTimeline.tsx`
- Create: `components/team-dynamics/TeamDynamicCard.tsx`
- Modify: `app/globals.css`
- Create: `__tests__/team-dynamics-page.test.tsx`

- [ ] **Step 1: Add failing page test for filters, empty state, and mark-all-as-read**

Create `__tests__/team-dynamics-page.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamDynamicsPage } from "@/components/team-dynamics/TeamDynamicsPage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

describe("TeamDynamicsPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          createJsonResponse({
            unreadCount: 1,
            nextCursor: null,
            items: [
              {
                id: "dyn-1",
                type: "WEEKLY_REPORT_CREATED",
                title: "本周战报已生成",
                summary: "本周打卡 18 次，全勤 2 天",
                occurredAt: "2026-04-25T08:00:00.000Z",
                payload: { headline: "本周打卡 18 次" },
                isRead: false,
              },
            ],
          }),
        )
        .mockResolvedValueOnce(createJsonResponse({ ok: true }))
        .mockResolvedValueOnce(
          createJsonResponse({
            unreadCount: 0,
            nextCursor: null,
            items: [],
          }),
        ),
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders timeline items, supports mark-all, and shows the empty unread state", async () => {
    await act(async () => {
      root.render(
        <TeamDynamicsPage
          initialItems={[
            {
              id: "dyn-1",
              type: "WEEKLY_REPORT_CREATED",
              title: "本周战报已生成",
              summary: "本周打卡 18 次，全勤 2 天",
              occurredAt: "2026-04-25T08:00:00.000Z",
              payload: { headline: "本周打卡 18 次" },
              isRead: false,
            },
          ]}
          initialUnreadCount={1}
          initialNextCursor={null}
        />,
      );
    });

    expect(container.textContent).toContain("本周战报已生成");
    expect(container.textContent).toContain("周报");

    const unreadButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("只看未读"),
    );
    expect(unreadButton).toBeDefined();

    await act(async () => {
      unreadButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const markAllButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("全部标为已读"),
    );
    expect(markAllButton).toBeDefined();

    await act(async () => {
      markAllButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("未读动态已经清空");
  });
});
```

- [ ] **Step 2: Run page test to verify it fails**

Run:

```bash
npm test -- __tests__/team-dynamics-page.test.tsx
```

Expected: FAIL because the page components do not exist yet.

- [ ] **Step 3: Implement the full page shell, filters, timeline, and shared card rendering**

Create `app/(board)/dynamics/page.tsx`:

```tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { loadCurrentUser } from "@/lib/session";
import { listTeamDynamicsForUser } from "@/lib/team-dynamics-service";
import { TeamDynamicsPage } from "@/components/team-dynamics/TeamDynamicsPage";

export default async function DynamicsPage() {
  const cookieStore = await cookies();
  const user = await loadCurrentUser(cookieStore);

  if (!user) {
    redirect("/login");
  }

  const initial = await listTeamDynamicsForUser({
    userId: user.id,
    view: "page",
    unreadOnly: false,
    type: "ALL",
    limit: 50,
    cursor: null,
  });

  return (
    <div className="p-4 sm:p-6">
      <TeamDynamicsPage
        initialItems={initial.items}
        initialUnreadCount={initial.unreadCount}
        initialNextCursor={initial.nextCursor}
      />
    </div>
  );
}
```

Create `components/team-dynamics/TeamDynamicCard.tsx`:

```tsx
import { getTeamDynamicMeta } from "@/lib/team-dynamics";

export function TeamDynamicCard({
  item,
  onOpen,
}: {
  item: {
    id: string;
    type: string;
    title: string;
    summary: string;
    occurredAt: string;
    payload: Record<string, unknown>;
    isRead: boolean;
  };
  onOpen?: (id: string) => void | Promise<void>;
}) {
  const meta = getTeamDynamicMeta(item.type as never);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(item.id)}
      className={`team-dynamic-card text-left ${item.isRead ? "team-dynamic-card-read" : "team-dynamic-card-unread"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`team-dynamic-pill team-dynamic-pill-${meta.tone}`}>{meta.label}</span>
        <span className="text-[11px] font-bold text-sub">
          {new Date(item.occurredAt).toLocaleString("zh-CN", {
            timeZone: "Asia/Shanghai",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-black text-main">{item.title}</h3>
      <p className="mt-1 text-sm font-bold text-slate-600">{item.summary}</p>
    </button>
  );
}
```

Create `components/team-dynamics/TeamDynamicsTimeline.tsx`:

```tsx
import { TeamDynamicCard } from "./TeamDynamicCard";

export function TeamDynamicsTimeline({
  items,
  mode,
  onOpenItem,
}: {
  items: Array<{
    id: string;
    type: string;
    title: string;
    summary: string;
    occurredAt: string;
    payload: Record<string, unknown>;
    isRead: boolean;
  }>;
  mode: "panel" | "page";
  onOpenItem?: (id: string) => void | Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-sub">
        {mode === "panel" ? "最近还没有值得沉淀的团队动态" : "未读动态已经清空"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <TeamDynamicCard key={item.id} item={item} onOpen={onOpenItem} />
      ))}
    </div>
  );
}
```

Create `components/team-dynamics/TeamDynamicsFilters.tsx`:

```tsx
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";

const FILTER_OPTIONS = [
  { value: "ALL", label: "全部类型" },
  { value: TEAM_DYNAMIC_TYPES.SEASON_STARTED, label: "赛季" },
  { value: TEAM_DYNAMIC_TYPES.SEASON_TARGET_REACHED, label: "里程碑" },
  { value: TEAM_DYNAMIC_TYPES.WEEKLY_REPORT_CREATED, label: "周报" },
  { value: TEAM_DYNAMIC_TYPES.STREAK_MILESTONE, label: "连签" },
] as const;

export function TeamDynamicsFilters({
  unreadOnly,
  activeType,
  onToggleUnread,
  onTypeChange,
}: {
  unreadOnly: boolean;
  activeType: string;
  onToggleUnread: () => void;
  onTypeChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="quest-btn px-3 py-1 text-xs" onClick={onToggleUnread}>
        {unreadOnly ? "查看全部" : "只看未读"}
      </button>
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`team-dynamic-filter ${activeType === option.value ? "team-dynamic-filter-active" : ""}`}
          onClick={() => onTypeChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
```

Create `components/team-dynamics/TeamDynamicsPage.tsx`:

```tsx
"use client";

import { useState } from "react";
import { dispatchTeamDynamicsRefresh } from "@/lib/team-dynamics-refresh";
import { TeamDynamicsFilters } from "./TeamDynamicsFilters";
import { TeamDynamicsTimeline } from "./TeamDynamicsTimeline";

export function TeamDynamicsPage({
  initialItems,
  initialUnreadCount,
  initialNextCursor,
}: {
  initialItems: Array<{
    id: string;
    type: string;
    title: string;
    summary: string;
    occurredAt: string;
    payload: Record<string, unknown>;
    isRead: boolean;
  }>;
  initialUnreadCount: number;
  initialNextCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [activeType, setActiveType] = useState("ALL");
  const [_nextCursor] = useState(initialNextCursor);

  async function reload(nextUnreadOnly: boolean, nextType: string) {
    const query = new URLSearchParams({
      view: "page",
      ...(nextUnreadOnly ? { filter: "unread" } : {}),
      ...(nextType !== "ALL" ? { type: nextType } : {}),
    });

    const response = await fetch(`/api/team-dynamics?${query.toString()}`, { cache: "no-store" });
    const body = await response.json() as {
      unreadCount: number;
      items: typeof initialItems;
    };

    setItems(body.items);
    setUnreadCount(body.unreadCount);
  }

  return (
    <section className="team-dynamics-page soft-card p-5">
      <div className="flex flex-col gap-4 border-b-2 border-slate-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-sub">TEAM DYNAMICS</p>
            <h1 className="mt-1 text-3xl font-black text-main">团队动态</h1>
            <p className="mt-2 text-sm font-bold text-sub">
              最近发生了什么，以及哪些内容值得团队回看。
            </p>
          </div>
          <button
            type="button"
            className="quest-btn px-4 py-2 text-sm"
            onClick={async () => {
              await fetch("/api/team-dynamics/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "all" }),
              });
              await reload(unreadOnly, activeType);
              dispatchTeamDynamicsRefresh();
            }}
          >
            全部标为已读
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="team-dynamic-stat">未读 {unreadCount} 条</span>
          <TeamDynamicsFilters
            unreadOnly={unreadOnly}
            activeType={activeType}
            onToggleUnread={async () => {
              const nextUnreadOnly = !unreadOnly;
              setUnreadOnly(nextUnreadOnly);
              await reload(nextUnreadOnly, activeType);
            }}
            onTypeChange={async (nextType) => {
              setActiveType(nextType);
              await reload(unreadOnly, nextType);
            }}
          />
        </div>
      </div>

      <div className="mt-5">
        <TeamDynamicsTimeline items={items} mode="page" />
      </div>
    </section>
  );
}
```

Add to `app/globals.css`:

```css
.team-dynamics-page {
  border-color: #f1f5f9;
}

.team-dynamic-card {
  width: 100%;
  border: 3px solid #e2e8f0;
  border-radius: 1.25rem;
  background: #fff;
  padding: 1rem;
  box-shadow: 0 4px 0 0 #e2e8f0;
}

.team-dynamic-card-unread {
  border-color: #fde047;
  box-shadow: 0 4px 0 0 #1f2937;
}

.team-dynamic-pill {
  display: inline-flex;
  align-items: center;
  border: 2px solid #1f2937;
  border-radius: 9999px;
  padding: 0.15rem 0.6rem;
  font-size: 0.65rem;
  font-weight: 900;
}

.team-dynamic-pill-highlight {
  background: #fde047;
  color: #1f2937;
}

.team-dynamic-pill-success {
  background: #dcfce7;
  color: #166534;
}

.team-dynamic-pill-default {
  background: #f8fafc;
  color: #334155;
}

.team-dynamic-filter,
.team-dynamic-stat {
  border: 2px solid #cbd5e1;
  border-radius: 9999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 800;
}

.team-dynamic-filter-active {
  background: #1f2937;
  color: #fff7cc;
  border-color: #1f2937;
}

@media (max-width: 760px) {
  .team-dynamics-panel {
    width: calc(100vw - 2rem);
    max-height: calc(100vh - 7rem);
  }

  .team-dynamics-page {
    border-width: 4px;
    border-radius: 1.2rem;
    padding: 1rem;
  }

  .team-dynamic-card {
    border-width: 2px;
    border-radius: 1rem;
    padding: 0.85rem;
  }
}
```

Implementation note:

- `TeamDynamicCard` should render cleanly for `WEEKLY_REPORT_CREATED` and `BOARD_NOTICE_REFERENCE` fixture entries even before those producers exist.
- Keep the full page read-only; it should not become an editor surface.

- [ ] **Step 4: Run the page test to verify it passes**

Run:

```bash
npm test -- __tests__/team-dynamics-page.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the full timeline page**

```bash
git add app/(board)/dynamics/page.tsx components/team-dynamics/TeamDynamicsPage.tsx components/team-dynamics/TeamDynamicsFilters.tsx components/team-dynamics/TeamDynamicsTimeline.tsx components/team-dynamics/TeamDynamicCard.tsx app/globals.css __tests__/team-dynamics-page.test.tsx
git commit -m "feat: add team dynamics timeline page"
```

---

### Task 7: Verification

**Files:**
- No source changes expected unless verification finds regressions.

- [ ] **Step 1: Run all targeted team dynamics tests**

Run:

```bash
npm test -- __tests__/team-dynamics-helpers.test.ts __tests__/team-dynamics-service.test.ts __tests__/team-dynamics-api.test.ts __tests__/team-dynamics-bell.test.tsx __tests__/team-dynamics-page.test.tsx __tests__/admin-seasons-api.test.ts __tests__/board-punch-api.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run lint and type validation**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Do a quick browser acceptance check**

Run:

```bash
npm run dev
```

Verify manually:

- Navbar desktop: bell sits to the left of the profile button and unread badge is visible.
- Navbar mobile: bell and profile still fit on one line and the preview panel stays inside the viewport.
- Bell preview: recent items render with clear labels and the “查看全部动态” CTA.
- `/dynamics`: unread toggle, type chips, and “全部标为已读” all work without layout overflow.
- Season create/end and punch milestone flows create visible timeline cards after refresh.

- [ ] **Step 5: Stop the dev server**

Stop the `npm run dev` process with `Ctrl-C`.

- [ ] **Step 6: Commit only if verification required follow-up fixes**

If verification exposed issues and you fixed them:

```bash
git add app/(board)/dynamics/page.tsx app/api/team-dynamics/route.ts app/api/team-dynamics/read/route.ts app/api/board/punch/route.ts app/globals.css components/navbar/Navbar.tsx components/navbar/TeamDynamicsBell.tsx components/team-dynamics/TeamDynamicCard.tsx components/team-dynamics/TeamDynamicsFilters.tsx components/team-dynamics/TeamDynamicsPage.tsx components/team-dynamics/TeamDynamicsPanel.tsx components/team-dynamics/TeamDynamicsTimeline.tsx lib/season-service.ts lib/team-dynamics-refresh.ts lib/team-dynamics-service.ts lib/team-dynamics.ts prisma/dev.db prisma/schema.prisma __tests__/admin-seasons-api.test.ts __tests__/board-punch-api.test.ts __tests__/team-dynamics-api.test.ts __tests__/team-dynamics-bell.test.tsx __tests__/team-dynamics-helpers.test.ts __tests__/team-dynamics-page.test.tsx __tests__/team-dynamics-service.test.ts
git commit -m "fix team dynamics verification issues"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review Notes

- Spec coverage:
  - Bell entry, preview panel, and `/dynamics` page are covered in Task 5 and Task 6.
  - Separate `TeamDynamic` and per-user read state models are covered in Task 2.
  - Unread, filters, and read controls are covered in Task 3, Task 5, and Task 6.
  - Season and punch-based curated event sources are covered in Task 4.
  - `WEEKLY_REPORT_CREATED` and `BOARD_NOTICE_REFERENCE` rendering support is covered in Task 1 and Task 6, while producers remain deferred on purpose.
- Scope check:
  - This plan intentionally does not implement weekly report generation, board note reference authoring UI, or enterprise WeCom push.
  - This plan intentionally keeps `ActivityEvent` alive as the real-time stream instead of merging the two systems.
- Type consistency:
  - All routes, components, and tests use `TEAM_DYNAMIC_TYPES`, `normalizeTeamDynamicsQuery`, `listTeamDynamicsForUser`, `markTeamDynamicRead`, and `markAllTeamDynamicsRead`.
  - The UI reads the same DTO fields (`id`, `type`, `title`, `summary`, `occurredAt`, `payload`, `isRead`) across panel and page modes.
