# GM-03 Supply Station Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first visible `牛马补给站` shell: navigation tab, read-only gamification state endpoint, and placeholder page sections for tasks, tickets, lottery, backpack, and weak social.

**Architecture:** Extend the existing single-page board tab architecture with a new `supply` tab. Add a read-only `GET /api/gamification/state` endpoint backed by a focused `lib/gamification/state.ts` aggregator that consumes GM-01 local content and GM-02 database state without creating or mutating game records.

**Tech Stack:** Next.js App Router, TypeScript strict mode, React 19, Prisma + SQLite, Vitest + jsdom, Tailwind CSS v4.

---

## File Structure

- Modify: `lib/types.ts`
  - Add `supply` to `AppTab`.
  - Add `GamificationStateSnapshot` and nested snapshot types.
- Modify: `lib/api.ts`
  - Add `fetchGamificationState`.
  - Add response parsing for gamification snapshots.
- Create: `lib/gamification/state.ts`
  - Build read-only gamification snapshot for the signed-in user.
- Create: `app/api/gamification/state/route.ts`
  - Authenticated API route that returns the gamification snapshot.
- Create: `components/gamification/SupplyStation.tsx`
  - Client page shell with loading, error, empty, and placeholder states.
- Modify: `components/navbar/Navbar.tsx`
  - Add desktop and mobile `牛马补给站` tab.
- Modify: `components/ui/AssetIcon.tsx`
  - Register the new supply station icon.
- Create: `public/assets/icons/supply-pixel.svg`
  - Pixel-style supply icon for the tab.
- Modify: `app/(board)/page.tsx`
  - Lazily mount the supply station panel after the tab is opened.
- Create: `__tests__/gamification-state-api.test.ts`
  - API snapshot tests.
- Create: `__tests__/supply-station-shell.test.tsx`
  - Component shell tests.
- Modify: `__tests__/coffee-tab.test.tsx`
  - Add supply tab navigation coverage and update expected nav icon list.

## Implementation Rules

- Do not implement task assignment generation.
- Do not implement task completion.
- Do not grant lottery tickets.
- Do not implement lottery draw actions.
- Do not implement backpack item use.
- Do not implement social invitation sending.
- Do not implement redemption.
- Do not add polling for `SupplyStation` in GM-03.
- API aggregation must be read-only.
- Any button for future behavior must be disabled and explain which future GM story unlocks it.

---

### Task 1: Add Failing API Snapshot Tests

**Files:**
- Create: `__tests__/gamification-state-api.test.ts`

- [ ] **Step 1: Write API tests**

Create `__tests__/gamification-state-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/gamification/state/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/gamification/state", {
    method: "GET",
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

describe("GET /api/gamification/state", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
  });

  it("returns a shell snapshot with four dimensions and empty assignments", async () => {
    const response = await GET(request(userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.snapshot).toMatchObject({
      currentUserId: userId,
      teamId,
      dayKey: getShanghaiDayKey(),
      ticketBalance: 0,
      ticketSummary: {
        maxFreeTicketsToday: 2,
        todayEarned: 0,
        todaySpent: 0,
        lifeTicketEarned: false,
        fitnessTicketEarned: false,
      },
      lottery: {
        status: "placeholder",
        singleDrawEnabled: false,
        tenDrawEnabled: false,
      },
      backpack: {
        totalQuantity: 0,
        previewItems: [],
      },
      social: {
        status: "placeholder",
        pendingSentCount: 0,
        pendingReceivedCount: 0,
      },
    });

    expect(body.snapshot.dimensions.map((dimension: { key: string }) => dimension.key)).toEqual([
      "movement",
      "hydration",
      "social",
      "learning",
    ]);
    expect(body.snapshot.dimensions.every((dimension: { assignment: unknown }) => dimension.assignment === null)).toBe(true);
  });

  it("includes existing task, inventory, draw, ticket, and social summaries", async () => {
    const dayKey = getShanghaiDayKey();
    const teammate = await prisma.user.findFirstOrThrow({
      where: {
        teamId,
        NOT: { id: userId },
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 3 },
    });

    await prisma.dailyTaskAssignment.create({
      data: {
        userId,
        teamId,
        dayKey,
        dimensionKey: "movement",
        taskCardId: "movement_001",
        completedAt: new Date(`${dayKey}T08:30:00.000Z`),
      },
    });

    await prisma.lotteryTicketLedger.createMany({
      data: [
        {
          userId,
          teamId,
          dayKey,
          delta: 1,
          balanceAfter: 1,
          reason: "DAILY_TASKS_GRANTED",
        },
        {
          userId,
          teamId,
          dayKey,
          delta: -1,
          balanceAfter: 0,
          reason: "LOTTERY_DRAW_SPENT",
        },
      ],
    });

    await prisma.inventoryItem.create({
      data: {
        userId,
        teamId,
        itemId: "task_reroll_coupon",
        quantity: 2,
      },
    });

    await prisma.lotteryDraw.create({
      data: {
        userId,
        teamId,
        drawType: "SINGLE",
        ticketSpent: 1,
        results: {
          create: {
            position: 1,
            rewardId: "coins_005",
            rewardTier: "coin",
            rewardKind: "coins",
            rewardSnapshotJson: JSON.stringify({ amount: 5 }),
          },
        },
      },
    });

    const sentUse = await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "drink_water_ping",
        dayKey,
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
      },
    });

    await prisma.socialInvitation.create({
      data: {
        teamId,
        senderUserId: userId,
        recipientUserId: teammate.id,
        invitationType: "DRINK_WATER",
        itemUseRecordId: sentUse.id,
        status: "PENDING",
        dayKey,
        message: "喝水，别把自己腌入味。",
      },
    });

    const receivedUse = await prisma.itemUseRecord.create({
      data: {
        userId: teammate.id,
        teamId,
        itemId: "walk_ping",
        dayKey,
        status: "PENDING",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
      },
    });

    await prisma.socialInvitation.create({
      data: {
        teamId,
        senderUserId: teammate.id,
        recipientUserId: userId,
        invitationType: "WALK",
        itemUseRecordId: receivedUse.id,
        status: "PENDING",
        dayKey,
        message: "出去溜达一圈。",
      },
    });

    const response = await GET(request(userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const movement = body.snapshot.dimensions.find((dimension: { key: string }) => dimension.key === "movement");

    expect(movement.assignment).toMatchObject({
      taskCardId: "movement_001",
      title: "工位重启",
      status: "completed",
    });
    expect(body.snapshot.ticketBalance).toBe(3);
    expect(body.snapshot.ticketSummary).toMatchObject({
      todayEarned: 1,
      todaySpent: 1,
      lifeTicketEarned: true,
    });
    expect(body.snapshot.backpack).toMatchObject({
      totalQuantity: 2,
      previewItems: [
        expect.objectContaining({
          itemId: "task_reroll_coupon",
          name: "任务换班券",
          quantity: 2,
        }),
      ],
    });
    expect(body.snapshot.lottery.recentDraws).toHaveLength(1);
    expect(body.snapshot.social).toMatchObject({
      pendingSentCount: 1,
      pendingReceivedCount: 1,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts
```

Expected: FAIL because `app/api/gamification/state/route.ts` does not exist yet.

---

### Task 2: Add Snapshot Types And API Client Helper

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/api.ts`

- [ ] **Step 1: Extend shared types**

Modify `lib/types.ts`:

```ts
export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";

export type GamificationTaskStatus = "pending" | "completed";
export type GamificationLotteryStatus = "placeholder";
export type GamificationSocialStatus = "placeholder";

export interface GamificationTaskAssignmentSnapshot {
  id: string;
  taskCardId: string;
  title: string;
  description: string;
  status: GamificationTaskStatus;
  completedAt: string | null;
}

export interface GamificationDimensionSnapshot {
  key: "movement" | "hydration" | "social" | "learning";
  title: string;
  subtitle: string;
  description: string;
  assignment: GamificationTaskAssignmentSnapshot | null;
}

export interface GamificationTicketSummary {
  maxFreeTicketsToday: 2;
  todayEarned: number;
  todaySpent: number;
  lifeTicketEarned: boolean;
  fitnessTicketEarned: boolean;
}

export interface GamificationLotteryRewardSnapshot {
  rewardId: string;
  rewardTier: string;
  rewardKind: string;
}

export interface GamificationLotteryDrawSnapshot {
  id: string;
  drawType: string;
  ticketSpent: number;
  coinSpent: number;
  createdAt: string;
  rewards: GamificationLotteryRewardSnapshot[];
}

export interface GamificationLotterySummary {
  status: GamificationLotteryStatus;
  singleDrawEnabled: false;
  tenDrawEnabled: false;
  message: string;
  recentDraws: GamificationLotteryDrawSnapshot[];
}

export interface GamificationBackpackItemSummary {
  itemId: string;
  name: string;
  quantity: number;
  category: string;
}

export interface GamificationBackpackSummary {
  totalQuantity: number;
  previewItems: GamificationBackpackItemSummary[];
  emptyMessage: string;
}

export interface GamificationSocialSummary {
  status: GamificationSocialStatus;
  pendingSentCount: number;
  pendingReceivedCount: number;
  message: string;
}

export interface GamificationStateSnapshot {
  currentUserId: string;
  teamId: string;
  dayKey: string;
  ticketBalance: number;
  dimensions: GamificationDimensionSnapshot[];
  ticketSummary: GamificationTicketSummary;
  lottery: GamificationLotterySummary;
  backpack: GamificationBackpackSummary;
  social: GamificationSocialSummary;
}
```

- [ ] **Step 2: Add client fetch helper**

Modify `lib/api.ts` imports:

```ts
import type {
  BoardSnapshot,
  CalendarMonthSnapshot,
  CoffeeSnapshot,
  GamificationStateSnapshot,
} from "@/lib/types";
```

Add these helpers near the other snapshot readers:

```ts
async function readGamificationSnapshot(
  response: Response,
): Promise<GamificationStateSnapshot> {
  const payload = await readJsonPayload(response, "响应解析失败");

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload.snapshot as GamificationStateSnapshot;
}

export async function fetchGamificationState(): Promise<GamificationStateSnapshot> {
  const response = await fetch("/api/gamification/state", {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readGamificationSnapshot(response);
}
```

- [ ] **Step 3: Run typecheck to confirm missing server route remains**

Run:

```bash
npm run lint
```

Expected: FAIL because later tasks have not created the route and component imports yet, or because `AppTab` consumers have not been updated.

---

### Task 3: Add Read-Only Gamification State Aggregator And Route

**Files:**
- Create: `lib/gamification/state.ts`
- Create: `app/api/gamification/state/route.ts`

- [ ] **Step 1: Create server-side state aggregator**

Create `lib/gamification/state.ts`:

```ts
import { getGamificationDimensions, getItemDefinition, getTaskCards } from "@/lib/gamification/content";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import type {
  GamificationBackpackItemSummary,
  GamificationDimensionSnapshot,
  GamificationStateSnapshot,
} from "@/lib/types";
import type { ItemDefinition } from "@/content/gamification/types";

function getSafeItemDefinition(itemId: string): ItemDefinition | null {
  try {
    return getItemDefinition(itemId);
  } catch {
    return null;
  }
}

export async function buildGamificationStateForUser(
  userId: string,
  now: Date = new Date(),
): Promise<GamificationStateSnapshot | null> {
  const dayKey = getShanghaiDayKey(now);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      teamId: true,
      ticketBalance: true,
      dailyTaskAssignments: {
        where: { dayKey },
        select: {
          id: true,
          dimensionKey: true,
          taskCardId: true,
          completedAt: true,
        },
      },
      lotteryTicketLedgers: {
        where: { dayKey },
        select: {
          delta: true,
          reason: true,
        },
      },
      inventoryItems: {
        where: {
          quantity: { gt: 0 },
        },
        orderBy: { updatedAt: "desc" },
        take: 4,
        select: {
          itemId: true,
          quantity: true,
        },
      },
      lotteryDraws: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          drawType: true,
          ticketSpent: true,
          coinSpent: true,
          createdAt: true,
          results: {
            orderBy: { position: "asc" },
            select: {
              rewardId: true,
              rewardTier: true,
              rewardKind: true,
            },
          },
        },
      },
      sentSocialInvitations: {
        where: {
          dayKey,
          status: "PENDING",
        },
        select: { id: true },
      },
      receivedSocialInvitations: {
        where: {
          dayKey,
          status: "PENDING",
        },
        select: { id: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  const taskCardsById = new Map(getTaskCards().map((card) => [card.id, card]));
  const assignmentsByDimension = new Map(
    user.dailyTaskAssignments.map((assignment) => [assignment.dimensionKey, assignment]),
  );

  const dimensions: GamificationDimensionSnapshot[] = getGamificationDimensions().map((dimension) => {
    const assignment = assignmentsByDimension.get(dimension.key);
    const taskCard = assignment ? taskCardsById.get(assignment.taskCardId) : null;

    return {
      key: dimension.key,
      title: dimension.title,
      subtitle: dimension.subtitle,
      description: dimension.description,
      assignment: assignment
        ? {
            id: assignment.id,
            taskCardId: assignment.taskCardId,
            title: taskCard?.title ?? "未知任务",
            description: taskCard?.description ?? "这张任务卡已经不在本地配置中。",
            status: assignment.completedAt ? "completed" : "pending",
            completedAt: assignment.completedAt?.toISOString() ?? null,
          }
        : null,
    };
  });

  const todayEarned = user.lotteryTicketLedgers
    .filter((ledger) => ledger.delta > 0)
    .reduce((sum, ledger) => sum + ledger.delta, 0);
  const todaySpent = user.lotteryTicketLedgers
    .filter((ledger) => ledger.delta < 0)
    .reduce((sum, ledger) => sum + Math.abs(ledger.delta), 0);

  const previewItems: GamificationBackpackItemSummary[] = user.inventoryItems.map((item) => {
    const definition = getSafeItemDefinition(item.itemId);

    return {
      itemId: item.itemId,
      name: definition?.name ?? item.itemId,
      quantity: item.quantity,
      category: definition?.category ?? "unknown",
    };
  });

  return {
    currentUserId: user.id,
    teamId: user.teamId,
    dayKey,
    ticketBalance: user.ticketBalance,
    dimensions,
    ticketSummary: {
      maxFreeTicketsToday: 2,
      todayEarned,
      todaySpent,
      lifeTicketEarned: user.lotteryTicketLedgers.some((ledger) => ledger.reason === "DAILY_TASKS_GRANTED"),
      fitnessTicketEarned: user.lotteryTicketLedgers.some((ledger) => ledger.reason === "FITNESS_PUNCH_GRANTED"),
    },
    lottery: {
      status: "placeholder",
      singleDrawEnabled: false,
      tenDrawEnabled: false,
      message: "抽奖机正在搬进办公室，GM-06 开放。",
      recentDraws: user.lotteryDraws.map((draw) => ({
        id: draw.id,
        drawType: draw.drawType,
        ticketSpent: draw.ticketSpent,
        coinSpent: draw.coinSpent,
        createdAt: draw.createdAt.toISOString(),
        rewards: draw.results.map((result) => ({
          rewardId: result.rewardId,
          rewardTier: result.rewardTier,
          rewardKind: result.rewardKind,
        })),
      })),
    },
    backpack: {
      totalQuantity: user.inventoryItems.reduce((sum, item) => sum + item.quantity, 0),
      previewItems,
      emptyMessage: "背包空空，等抽奖机上线后再来进货。",
    },
    social: {
      status: "placeholder",
      pendingSentCount: user.sentSocialInvitations.length,
      pendingReceivedCount: user.receivedSocialInvitations.length,
      message: "点名喝水、出门溜达等弱社交道具将在 GM-12 开放。",
    },
  };
}
```

- [ ] **Step 2: Create API route**

Create `app/api/gamification/state/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildGamificationStateForUser } from "@/lib/gamification/state";

export async function GET(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const snapshot = await buildGamificationStateForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Run API tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts
```

Expected: PASS after GM-01 and GM-02 have been implemented.

---

### Task 4: Add Supply Station Shell Component Tests

**Files:**
- Create: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Write shell component tests**

Create `__tests__/supply-station-shell.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GamificationStateSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function buildSnapshot(): GamificationStateSnapshot {
  return {
    currentUserId: "u1",
    teamId: "team1",
    dayKey: "2026-04-25",
    ticketBalance: 3,
    dimensions: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "站一站，不然屁股长根",
        description: "起身、走动、拉伸、短暂恢复。",
        assignment: null,
      },
      {
        key: "hydration",
        title: "把尿喝白",
        subtitle: "喝白白，别把自己腌入味",
        description: "补水、接水、无糖饮品。",
        assignment: null,
      },
      {
        key: "social",
        title: "把事办黄",
        subtitle: "聊两句，让班味散一散",
        description: "闲聊、吐槽、夸夸、情绪释放。",
        assignment: null,
      },
      {
        key: "learning",
        title: "把股看红",
        subtitle: "看一点，给脑子补仓",
        description: "信息输入、学习、看新闻、文章或工具。",
        assignment: null,
      },
    ],
    ticketSummary: {
      maxFreeTicketsToday: 2,
      todayEarned: 1,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: true,
    },
    lottery: {
      status: "placeholder",
      singleDrawEnabled: false,
      tenDrawEnabled: false,
      message: "抽奖机正在搬进办公室，GM-06 开放。",
      recentDraws: [],
    },
    backpack: {
      totalQuantity: 0,
      previewItems: [],
      emptyMessage: "背包空空，等抽奖机上线后再来进货。",
    },
    social: {
      status: "placeholder",
      pendingSentCount: 0,
      pendingReceivedCount: 0,
      message: "点名喝水、出门溜达等弱社交道具将在 GM-12 开放。",
    },
  };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("SupplyStation", () => {
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

  it("loads the gamification state and renders the shell sections", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ snapshot: buildSnapshot() }),
      }),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(fetch).toHaveBeenCalledWith(
      "/api/gamification/state",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
    expect(container.textContent).toContain("牛马补给站");
    expect(container.textContent).toContain("把电充绿");
    expect(container.textContent).toContain("把尿喝白");
    expect(container.textContent).toContain("把事办黄");
    expect(container.textContent).toContain("把股看红");
    expect(container.textContent).toContain("今日任务抽取将在 GM-04 开放");
    expect(container.textContent).toContain("抽奖机正在搬进办公室");
    expect(container.textContent).toContain("背包空空");
    expect(container.querySelectorAll("button[disabled]")).toHaveLength(6);
  });

  it("renders a login recovery state for 401 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: "未登录" }),
      }),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(container.textContent).toContain("登录状态过期，请重新登录");
    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: FAIL because `components/gamification/SupplyStation.tsx` does not exist yet.

---

### Task 5: Add Supply Station Shell Component

**Files:**
- Create: `components/gamification/SupplyStation.tsx`

- [ ] **Step 1: Implement the client shell**

Create `components/gamification/SupplyStation.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchGamificationState } from "@/lib/api";
import type {
  GamificationDimensionSnapshot,
  GamificationStateSnapshot,
} from "@/lib/types";

function getSupplyErrorMessage(caught: unknown) {
  if (caught instanceof ApiError && caught.status === 401) {
    return "登录状态过期，请重新登录。";
  }

  return caught instanceof Error ? caught.message : "牛马补给站加载失败，稍后再试。";
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className={`rounded-[1.25rem] border-[3px] border-slate-900 px-4 py-3 shadow-[0_4px_0_0_#1f2937] ${tone}`}>
      <div className="text-xs font-black text-slate-700">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
    </div>
  );
}

function DimensionCard({ dimension }: { dimension: GamificationDimensionSnapshot }) {
  const assignment = dimension.assignment;

  return (
    <article className="supply-dimension-card rounded-[1.35rem] border-[4px] border-slate-900 bg-white p-4 shadow-[0_5px_0_0_#1f2937]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-black text-slate-950">{dimension.title}</h3>
          <p className="mt-1 text-sm font-black text-amber-700">{dimension.subtitle}</p>
        </div>
        <span className="rounded-full border-2 border-slate-900 bg-yellow-200 px-3 py-1 text-xs font-black text-slate-900">
          {assignment?.status === "completed" ? "已完成" : "待开工"}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">
        {assignment ? assignment.description : dimension.description}
      </p>
      <div className="mt-4 rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
        {assignment ? assignment.title : "今日任务抽取将在 GM-04 开放。"}
      </div>
      <button
        type="button"
        disabled
        className="mt-4 w-full cursor-not-allowed rounded-full border-[3px] border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-400"
      >
        任务打卡 GM-04 开放
      </button>
    </article>
  );
}

function PlaceholderButton({ children }: { children: string }) {
  return (
    <button
      type="button"
      disabled
      className="cursor-not-allowed rounded-full border-[3px] border-slate-300 bg-slate-100 px-4 py-2 text-sm font-black text-slate-400"
    >
      {children}
    </button>
  );
}

export function SupplyStation() {
  const [snapshot, setSnapshot] = useState<GamificationStateSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadState() {
    setBusy(true);
    setError(null);

    try {
      setSnapshot(await fetchGamificationState());
    } catch (caught) {
      setError(getSupplyErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  if (!snapshot) {
    return (
      <section className="supply-station-viewport absolute inset-0 overflow-y-auto p-4 sm:p-6">
        <div className="grid min-h-full place-items-center rounded-[1.5rem] border-[6px] border-amber-200 bg-amber-50 p-6 text-center">
          <div className="max-w-md">
            <h2 className="text-3xl font-black text-slate-950">牛马补给站</h2>
            <p className="mt-3 text-sm font-black text-amber-800">
              {error ?? "正在搬运补给箱..."}
            </p>
            {error ? (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {error.includes("登录状态过期") ? (
                  <a
                    href="/login"
                    className="rounded-full border-[3px] border-slate-900 bg-yellow-200 px-5 py-3 text-sm font-black shadow-[0_4px_0_0_#1f2937]"
                  >
                    重新登录
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => void loadState()}
                  className="rounded-full border-[3px] border-slate-900 bg-white px-5 py-3 text-sm font-black shadow-[0_4px_0_0_#1f2937]"
                >
                  刷新重试
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="supply-station-viewport absolute inset-0 overflow-y-auto p-4 sm:p-6">
      <div className="supply-station-shell mx-auto flex min-h-full max-w-7xl flex-col gap-4">
        <header className="rounded-[1.75rem] border-[5px] border-slate-900 bg-yellow-200 p-5 shadow-[0_7px_0_0_#1f2937]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-800">Supply Station</p>
              <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950">牛马补给站</h1>
              <p className="mt-2 max-w-2xl text-sm font-black text-slate-700">
                今日补给单已生成，先把身体照顾好，再来薅一点运气。
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="抽奖券" value={snapshot.ticketBalance} tone="bg-white" />
              <StatCard label="今日进账" value={`+${snapshot.ticketSummary.todayEarned}`} tone="bg-lime-100" />
              <StatCard label="背包库存" value={snapshot.backpack.totalQuantity} tone="bg-sky-100" />
              <StatCard label="待响应" value={snapshot.social.pendingReceivedCount} tone="bg-orange-100" />
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-[1rem] border-[3px] border-rose-300 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700">
            {error}
          </div>
        ) : null}

        <main className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.8fr)]">
          <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">今日四维</h2>
                <p className="text-sm font-bold text-slate-500">四项都完成后，GM-04 会解锁四维任务券。</p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">
                {snapshot.dayKey}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {snapshot.dimensions.map((dimension) => (
                <DimensionCard key={dimension.key} dimension={dimension} />
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">今日券路</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1rem] border-2 border-slate-200 bg-lime-50 p-3 text-sm font-black text-slate-700">
                  健身打卡券：{snapshot.ticketSummary.fitnessTicketEarned ? "已到账" : "GM-05 开放"}
                </div>
                <div className="rounded-[1rem] border-2 border-slate-200 bg-yellow-50 p-3 text-sm font-black text-slate-700">
                  四维任务券：{snapshot.ticketSummary.lifeTicketEarned ? "已到账" : "GM-04 开放"}
                </div>
                <div className="rounded-[1rem] border-2 border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-700">
                  今日最多免费 {snapshot.ticketSummary.maxFreeTicketsToday} 张，已花 {snapshot.ticketSummary.todaySpent} 张。
                </div>
              </div>
            </section>

            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">抽奖机</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">{snapshot.lottery.message}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <PlaceholderButton>单抽 GM-06</PlaceholderButton>
                <PlaceholderButton>十连 GM-06</PlaceholderButton>
              </div>
              <div className="mt-4 rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
                {snapshot.lottery.recentDraws.length > 0
                  ? `最近 ${snapshot.lottery.recentDraws.length} 次抽奖记录已归档。`
                  : "暂时没有抽奖记录。"}
              </div>
            </section>

            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">背包</h2>
              {snapshot.backpack.previewItems.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {snapshot.backpack.previewItems.map((item) => (
                    <div key={item.itemId} className="flex items-center justify-between rounded-[1rem] border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black">
                      <span>{item.name}</span>
                      <span>x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-black text-slate-500">
                  {snapshot.backpack.emptyMessage}
                </p>
              )}
              <div className="mt-4">
                <PlaceholderButton>背包详情 GM-07</PlaceholderButton>
              </div>
            </section>

            <section className="rounded-[1.5rem] border-[5px] border-slate-900 bg-white p-4 shadow-[0_6px_0_0_#1f2937]">
              <h2 className="text-2xl font-black text-slate-950">弱社交雷达</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">{snapshot.social.message}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm font-black">
                <div className="rounded-[1rem] bg-orange-100 p-3">我发出的 {snapshot.social.pendingSentCount}</div>
                <div className="rounded-[1rem] bg-sky-100 p-3">我收到的 {snapshot.social.pendingReceivedCount}</div>
              </div>
              <div className="mt-4">
                <PlaceholderButton>响应 GM-12</PlaceholderButton>
              </div>
            </section>
          </aside>
        </main>
      </div>
      {busy ? <span className="sr-only">牛马补给站刷新中</span> : null}
    </section>
  );
}
```

- [ ] **Step 2: Run shell component tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

---

### Task 6: Add Navigation Entry And Page Panel

**Files:**
- Modify: `components/ui/AssetIcon.tsx`
- Create: `public/assets/icons/supply-pixel.svg`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/(board)/page.tsx`
- Modify: `__tests__/coffee-tab.test.tsx`

- [ ] **Step 1: Add supply icon asset**

Create `public/assets/icons/supply-pixel.svg`:

```svg
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect width="32" height="32" fill="none"/>
  <rect x="6" y="10" width="20" height="16" fill="#FDE047"/>
  <rect x="6" y="10" width="20" height="4" fill="#F97316"/>
  <rect x="6" y="10" width="20" height="16" fill="none" stroke="#1F2937" stroke-width="2"/>
  <rect x="10" y="6" width="12" height="6" fill="#FFFFFF" stroke="#1F2937" stroke-width="2"/>
  <rect x="14" y="15" width="4" height="8" fill="#1F2937"/>
  <rect x="11" y="18" width="10" height="2" fill="#1F2937"/>
  <rect x="8" y="24" width="16" height="2" fill="#1F2937" opacity="0.25"/>
</svg>
```

Modify `components/ui/AssetIcon.tsx`:

```ts
export const assetIconSources = {
  workout: "/assets/icons/workout-pixel.svg",
  board: "/assets/icons/board-pixel.svg",
  coffee: "/assets/icons/coffee-pixel.svg",
  supply: "/assets/icons/supply-pixel.svg",
  calendar: "/assets/icons/calendar-pixel.svg",
  report: "/assets/icons/report-pixel.svg",
  vaultTrophy: "/assets/icons/vault-trophy-pixel.svg",
} as const;
```

- [ ] **Step 2: Add desktop and mobile tab**

Modify `components/navbar/Navbar.tsx` imports:

```ts
import type { AppTab } from "@/lib/types";
```

Change `handleTabChange` signature:

```ts
function handleTabChange(tab: AppTab) {
  dispatch({ type: "SET_TAB", tab });
  setMobileTabsOpen(false);
}
```

Add this desktop tab between `续命咖啡` and `牛马日历`:

```tsx
<TabBtn
  active={state.activeTab === "supply"}
  className="supply-tab"
  onClick={() => handleTabChange("supply")}
>
  <AssetIcon name="supply" className="h-4 w-4 object-contain" />
  牛马补给站
</TabBtn>
```

Add this mobile tab between `续命咖啡` and `牛马日历`:

```tsx
<TabBtn
  active={state.activeTab === "supply"}
  className="mobile-tab-btn supply-tab justify-between"
  onClick={() => handleTabChange("supply")}
>
  <span className="flex items-center gap-2">
    <AssetIcon name="supply" className="h-4 w-4 object-contain" />
    牛马补给站
  </span>
</TabBtn>
```

- [ ] **Step 3: Add supply panel to board page**

Modify `app/(board)/page.tsx` imports:

```tsx
import { SupplyStation } from "@/components/gamification/SupplyStation";
```

Add state:

```tsx
const [hasVisitedSupply, setHasVisitedSupply] = useState(false);
const shouldRenderSupply = state.activeTab === "supply" || hasVisitedSupply;
```

Add effect:

```tsx
useEffect(() => {
  if (state.activeTab === "supply") {
    setHasVisitedSupply(true);
  }
}, [state.activeTab]);
```

Add panel between coffee and calendar:

```tsx
{shouldRenderSupply ? (
  <div
    className={`board-tab-panel absolute inset-0 transition-opacity duration-300 ${
      state.activeTab === "supply" ? "board-tab-panel-active opacity-100" : "opacity-0 pointer-events-none"
    }`}
  >
    <SupplyStation />
  </div>
) : null}
```

- [ ] **Step 4: Update existing navbar icon test**

Modify the expected icon list in `__tests__/coffee-tab.test.tsx`:

```ts
expect(tabIconSources).toEqual([
  "/assets/icons/workout-pixel.svg",
  "/assets/icons/board-pixel.svg",
  "/assets/icons/coffee-pixel.svg",
  "/assets/icons/supply-pixel.svg",
  "/assets/icons/calendar-pixel.svg",
  "/assets/icons/report-pixel.svg",
]);
```

Add a focused supply tab assertion to the same file:

```ts
it("dispatches the supply station tab selection from the navbar", async () => {
  const { Navbar } = await import("@/components/navbar/Navbar");

  await act(async () => {
    root.render(<Navbar />);
  });

  const supplyButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("牛马补给站"),
  );

  expect(supplyButton).toBeDefined();
  expect(
    supplyButton!.querySelector('img[src*="/assets/icons/supply-pixel.svg"]'),
  ).not.toBeNull();

  await act(async () => {
    supplyButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(dispatch).toHaveBeenCalledWith({ type: "SET_TAB", tab: "supply" });
});
```

- [ ] **Step 5: Run navbar tests**

Run:

```bash
npm test -- __tests__/coffee-tab.test.tsx
```

Expected: PASS.

---

### Task 7: Verification

**Files:**
- No new files beyond previous tasks.

- [ ] **Step 1: Run GM-03 API tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run GM-03 component tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run navigation regression tests**

Run:

```bash
npm test -- __tests__/coffee-tab.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit GM-03**

```bash
git add lib/types.ts lib/api.ts lib/gamification/state.ts app/api/gamification/state/route.ts components/gamification/SupplyStation.tsx components/navbar/Navbar.tsx components/ui/AssetIcon.tsx public/assets/icons/supply-pixel.svg 'app/(board)/page.tsx' __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx __tests__/coffee-tab.test.tsx
git commit -m "feat: add supply station shell"
```

## Self-Review Checklist

- GM-03 adds a visible shell only.
- GM-03 does not create task assignments.
- GM-03 does not create or spend lottery tickets.
- GM-03 does not execute lottery draws.
- GM-03 does not mutate inventory.
- GM-03 does not send social invitations.
- GM-03 does not require Team Dynamics, weekly reports, or Enterprise WeChat.
- `GET /api/gamification/state` returns four dimensions even with no assignments.
- Mobile navigation includes `牛马补给站`.
- All future feature buttons are disabled and have clear GM story copy.
