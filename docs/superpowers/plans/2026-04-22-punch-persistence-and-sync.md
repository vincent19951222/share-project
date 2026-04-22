# Punch Persistence And Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make punch actions durable and shared by writing them to SQLite and syncing all open clients within 5 seconds.

**Architecture:** Move punch truth to the server by introducing one reusable board snapshot builder that is used by page preload, `GET /api/board/state`, and `POST /api/board/punch`. On the client, replace local-only punch mutation with “call API, replace snapshot, keep polling” while preserving tab state and activity logs as client concerns.

**Tech Stack:** Next.js 15 App Router route handlers, Prisma 7 + SQLite, React 19 client components, TypeScript, Vitest + jsdom.

---

## File Structure

- Create: `lib/board-state.ts`
  - Single server-side source for board snapshot derivation.
  - Exports `BOARD_TOTAL_DAYS`, `PUNCH_REWARD_COINS`, `getCurrentBoardDay(now?)`, and `buildBoardSnapshotForUser(userId, now?)`.
- Create: `__tests__/board-state.test.ts`
  - Unit coverage for time clamping, snapshot shape, future cells as `null`, and team coin aggregation.
- Create: `app/api/board/state/route.ts`
  - Authenticated snapshot reader for the current user’s team.
- Create: `__tests__/board-state-api.test.ts`
  - Route coverage for unauthenticated access and team-scoped snapshot reads.
- Create: `app/api/board/punch/route.ts`
  - Authenticated punch write route for the current user, duplicate guard, coin increment, snapshot response.
- Create: `__tests__/board-punch-api.test.ts`
  - Route coverage for success, duplicate rejection, and auth enforcement.
- Modify: `app/(board)/layout.tsx`
  - Stop assembling board state inline.
  - Reuse `buildBoardSnapshotForUser` so preload, polling, and punch responses all share one contract.
- Modify: `lib/types.ts`
  - Add `BoardSnapshot`.
  - Make `BoardState` extend `BoardSnapshot` with client-only fields.
  - Replace `PUNCH` and `SIMULATE_REMOTE_PUNCH` with `SYNC_REMOTE_STATE`.
- Modify: `lib/api.ts`
  - Replace mock board helpers with real `fetchBoardState()` and `submitTodayPunch()` wrappers.
- Modify: `lib/store.tsx`
  - Remove local fake punch simulation.
  - Add snapshot merge reducer path and 5-second polling in `BoardProvider`.
- Create: `__tests__/board-provider-sync.test.tsx`
  - Verifies polling interval, snapshot replacement, and preservation of `activeTab`.
- Modify: `components/ui/PunchPopup.tsx`
  - Support async confirmation, disabled state, and inline error text.
- Modify: `components/punch-board/HeatmapGrid.tsx`
  - Call the punch API, show busy/error state, dispatch `SYNC_REMOTE_STATE`, and append success/error logs.
- Create: `__tests__/heatmap-grid-punch.test.tsx`
  - Verifies punch confirmation calls the API and updates the rendered cell after the returned snapshot.

## Implementation Rules

- Keep the existing `coins` field name. Do not fold `coins -> gp` into this plan.
- Use `15` as the punch reward, matching the current reducer behavior.
- The authoritative punch state comes only from the server snapshot; the client must not locally mark a punch as successful before the API returns.
- `SYNC_REMOTE_STATE` must update only snapshot fields and preserve `logs` plus `activeTab`.
- Poll every `5000ms` while `BoardProvider` is mounted. Do not add WebSocket or SSE work.
- Keep the current route structure and current board UI layout.

---

### Task 1: Add The Shared Board Snapshot Builder

**Files:**
- Create: `lib/board-state.ts`
- Create: `__tests__/board-state.test.ts`
- Modify: `lib/types.ts`

- [ ] **Step 1: Write the failing snapshot tests**

Create `__tests__/board-state.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { BOARD_TOTAL_DAYS, PUNCH_REWARD_COINS, buildBoardSnapshotForUser, getCurrentBoardDay } from "@/lib/board-state";

describe("board-state", () => {
  let userId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("derives the current board day in Asia/Shanghai and clamps to total days", () => {
    expect(getCurrentBoardDay(new Date("2026-04-05T01:00:00Z"))).toBe(5);
    expect(getCurrentBoardDay(new Date("2026-05-31T18:30:00Z"))).toBe(BOARD_TOTAL_DAYS);
  });

  it("builds a normalized snapshot for the authenticated user's team", async () => {
    const snapshot = await buildBoardSnapshotForUser(userId, new Date("2026-04-18T09:00:00+08:00"));

    expect(snapshot).not.toBeNull();
    expect(snapshot!.currentUserId).toBe(userId);
    expect(snapshot!.members.length).toBe(5);
    expect(snapshot!.gridData).toHaveLength(snapshot!.members.length);
    expect(snapshot!.gridData[0]).toHaveLength(BOARD_TOTAL_DAYS);
    expect(snapshot!.today).toBe(18);
    expect(snapshot!.totalDays).toBe(BOARD_TOTAL_DAYS);
    expect(snapshot!.teamCoins).toBeGreaterThan(PUNCH_REWARD_COINS);
    expect(snapshot!.gridData[0][snapshot!.today - 1]).toBe(false);
    expect(snapshot!.gridData[0][snapshot!.today]).toBeNull();
  });

  it("returns null when the user does not exist", async () => {
    const snapshot = await buildBoardSnapshotForUser("missing-user", new Date("2026-04-18T09:00:00+08:00"));
    expect(snapshot).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run:

```bash
npm test -- __tests__/board-state.test.ts
```

Expected: FAIL because `@/lib/board-state` and the new exports in `lib/types.ts` do not exist yet.

- [ ] **Step 3: Add snapshot types**

Update `lib/types.ts`:

```typescript
export interface Member {
  id: string;
  name: string;
  avatarKey: string;
}

export type CellStatus = boolean | null;

export interface ActivityLog {
  id: string;
  text: string;
  type: "system" | "success" | "alert" | "highlight";
  timestamp: Date;
}

export interface BoardSnapshot {
  members: Member[];
  gridData: CellStatus[][];
  teamCoins: number;
  targetCoins: number;
  today: number;
  totalDays: number;
  currentUserId: string;
}

export interface BoardState extends BoardSnapshot {
  logs: ActivityLog[];
  activeTab: "punch" | "board" | "dash";
}

export type BoardAction =
  | { type: "ADD_LOG"; log: ActivityLog }
  | { type: "SET_TAB"; tab: "punch" | "board" | "dash" }
  | { type: "SYNC_REMOTE_STATE"; snapshot: BoardSnapshot };
```

- [ ] **Step 4: Implement the board snapshot builder**

Create `lib/board-state.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import type { BoardSnapshot, CellStatus } from "@/lib/types";

export const BOARD_TOTAL_DAYS = 30;
export const BOARD_TARGET_COINS = 2000;
export const PUNCH_REWARD_COINS = 15;

export function getCurrentBoardDay(now: Date = new Date()): number {
  const dayText = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    day: "numeric",
  }).format(now);

  const day = Number(dayText);
  return Math.max(1, Math.min(day, BOARD_TOTAL_DAYS));
}

export async function buildBoardSnapshotForUser(
  userId: string,
  now: Date = new Date(),
): Promise<BoardSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      team: {
        include: {
          users: {
            include: {
              punchRecords: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const today = getCurrentBoardDay(now);

  const members = user.team.users.map((member) => ({
    id: member.id,
    name: member.username,
    avatarKey: member.avatarKey,
  }));

  const gridData: CellStatus[][] = user.team.users.map((member) => {
    return Array.from({ length: BOARD_TOTAL_DAYS }, (_, index) => {
      const dayIndex = index + 1;

      if (dayIndex > today) {
        return null;
      }

      const record = member.punchRecords.find((item) => item.dayIndex === dayIndex);
      return record ? record.punched : false;
    });
  });

  return {
    members,
    gridData,
    teamCoins: user.team.users.reduce((sum, member) => sum + member.coins, 0),
    targetCoins: BOARD_TARGET_COINS,
    today,
    totalDays: BOARD_TOTAL_DAYS,
    currentUserId: user.id,
  };
}
```

- [ ] **Step 5: Re-run the snapshot tests**

Run:

```bash
npm test -- __tests__/board-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/board-state.ts __tests__/board-state.test.ts
git commit -m "feat: add reusable board snapshot builder"
```

---

### Task 2: Expose The Shared Snapshot Through Layout And GET API

**Files:**
- Create: `app/api/board/state/route.ts`
- Create: `__tests__/board-state-api.test.ts`
- Modify: `app/(board)/layout.tsx`

- [ ] **Step 1: Write the failing route tests**

Create `__tests__/board-state-api.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/board/state/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/board/state", {
    method: "GET",
    headers: userId ? { Cookie: `userId=${userId}` } : undefined,
  });
}

describe("GET /api/board/state", () => {
  let userId: string;

  beforeAll(async () => {
    await seedDatabase();
    userId = (await prisma.user.findUniqueOrThrow({ where: { username: "li" } })).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
  });

  it("returns the latest board snapshot for the current user's team", async () => {
    const response = await GET(request(userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.members).toHaveLength(5);
    expect(body.snapshot.gridData).toHaveLength(5);
    expect(body.snapshot.teamCoins).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the route test to confirm it fails**

Run:

```bash
npm test -- __tests__/board-state-api.test.ts
```

Expected: FAIL because `app/api/board/state/route.ts` does not exist.

- [ ] **Step 3: Add the board state route**

Create `app/api/board/state/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { buildBoardSnapshotForUser } from "@/lib/board-state";

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const snapshot = await buildBoardSnapshotForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Reuse the builder in board preload**

Update `app/(board)/layout.tsx`:

```typescript
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { buildBoardSnapshotForUser } from "@/lib/board-state";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

export default async function BoardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("userId")?.value;

  if (!userId) {
    redirect("/login");
  }

  const snapshot = await buildBoardSnapshotForUser(userId);

  if (!snapshot) {
    redirect("/login");
  }

  const initialState: BoardState = {
    ...snapshot,
    logs: [
      {
        id: "seed-1",
        text: "已连接共享战场，当前数据来自服务器快照。",
        type: "system",
        timestamp: new Date(0),
      },
    ],
    activeTab: "punch",
  };

  return <BoardProvider initialState={initialState}>{children}</BoardProvider>;
}
```

- [ ] **Step 5: Re-run the route test**

Run:

```bash
npm test -- __tests__/board-state-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/board/state/route.ts app/(board)/layout.tsx __tests__/board-state-api.test.ts
git commit -m "feat: expose board snapshot read path"
```

---

### Task 3: Add The Punch Write API

**Files:**
- Create: `app/api/board/punch/route.ts`
- Create: `__tests__/board-punch-api.test.ts`

- [ ] **Step 1: Write the failing punch route tests**

Create `__tests__/board-punch-api.test.ts`:

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/board/punch/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { PUNCH_REWARD_COINS, getCurrentBoardDay } from "@/lib/board-state";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/board/punch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
    },
    body: JSON.stringify({}),
  });
}

describe("POST /api/board/punch", () => {
  let userId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;

    await prisma.punchRecord.deleteMany({
      where: {
        userId,
        dayIndex: getCurrentBoardDay(new Date()),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("creates today's punch, increments coins once, and returns the latest snapshot", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request(userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const today = body.snapshot.today;

    const record = await prisma.punchRecord.findUnique({
      where: { userId_dayIndex: { userId, dayIndex: today } },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(record?.punched).toBe(true);
    expect(after.coins).toBe(before.coins + PUNCH_REWARD_COINS);
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.gridData[0][today - 1]).toBe(true);
  });

  it("rejects a second punch on the same day without double-incrementing coins", async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request(userId));
    expect(response.status).toBe(409);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.coins).toBe(before.coins);
  });
});
```

- [ ] **Step 2: Run the punch route test to confirm it fails**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: FAIL because `app/api/board/punch/route.ts` does not exist.

- [ ] **Step 3: Implement the punch route**

Create `app/api/board/punch/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUNCH_REWARD_COINS, buildBoardSnapshotForUser, getCurrentBoardDay } from "@/lib/board-state";

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, teamId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    const today = getCurrentBoardDay();

    const existing = await prisma.punchRecord.findUnique({
      where: {
        userId_dayIndex: {
          userId: user.id,
          dayIndex: today,
        },
      },
    });

    if (existing?.punched) {
      return NextResponse.json({ error: "今天已经打过卡了" }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.punchRecord.upsert({
        where: {
          userId_dayIndex: {
            userId: user.id,
            dayIndex: today,
          },
        },
        update: {
          punched: true,
          punchType: "default",
        },
        create: {
          userId: user.id,
          dayIndex: today,
          punched: true,
          punchType: "default",
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          coins: {
            increment: PUNCH_REWARD_COINS,
          },
        },
      });
    });

    const snapshot = await buildBoardSnapshotForUser(user.id);

    if (!snapshot) {
      return NextResponse.json({ error: "快照生成失败" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Re-run the punch route test**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/board/punch/route.ts __tests__/board-punch-api.test.ts
git commit -m "feat: persist daily punch to sqlite"
```

---

### Task 4: Replace Local-Only Board Mutation With Snapshot Sync

**Files:**
- Modify: `lib/api.ts`
- Modify: `lib/store.tsx`
- Create: `__tests__/board-provider-sync.test.tsx`

- [ ] **Step 1: Write the failing provider sync test**

Create `__tests__/board-provider-sync.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardProvider, useBoard } from "@/lib/store";
import type { BoardState } from "@/lib/types";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const initialState: BoardState = {
  members: [{ id: "user-1", name: "Li", avatarKey: "male1" }],
  gridData: [[false, null]],
  teamCoins: 0,
  targetCoins: 100,
  today: 1,
  totalDays: 2,
  logs: [],
  activeTab: "dash",
  currentUserId: "user-1",
};

function Probe() {
  const { state } = useBoard();
  return <div data-testid="state">{JSON.stringify(state)}</div>;
}

describe("BoardProvider sync", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          snapshot: {
            members: [{ id: "user-1", name: "Li", avatarKey: "male1" }],
            gridData: [[true, null]],
            teamCoins: 15,
            targetCoins: 100,
            today: 1,
            totalDays: 2,
            currentUserId: "user-1",
          },
        }),
      }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("polls every five seconds and keeps client-only state while replacing the snapshot", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <Probe />
        </BoardProvider>,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/board/state", { cache: "no-store" });

    const state = JSON.parse(container.querySelector("[data-testid='state']")!.textContent ?? "{}");
    expect(state.gridData[0][0]).toBe(true);
    expect(state.teamCoins).toBe(15);
    expect(state.activeTab).toBe("dash");
  });
});
```

- [ ] **Step 2: Run the provider sync test to confirm it fails**

Run:

```bash
npm test -- __tests__/board-provider-sync.test.tsx
```

Expected: FAIL because `BoardProvider` does not poll and `lib/api.ts` does not expose real board fetch helpers.

- [ ] **Step 3: Replace the mock board API helpers**

Update `lib/api.ts`:

```typescript
import type { BoardSnapshot } from "@/lib/types";

async function readSnapshot(response: Response): Promise<BoardSnapshot> {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "请求失败");
  }

  return payload.snapshot as BoardSnapshot;
}

export async function fetchBoardState(): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/state", {
    cache: "no-store",
  });

  return readSnapshot(response);
}

export async function submitTodayPunch(): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/punch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  return readSnapshot(response);
}
```

- [ ] **Step 4: Update the store reducer and provider polling**

Update `lib/store.tsx`:

```typescript
"use client";

import { createContext, useContext, useEffect, useReducer, type ReactNode } from "react";
import { fetchBoardState } from "@/lib/api";
import type { BoardAction, BoardState } from "./types";

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "ADD_LOG":
      return { ...state, logs: [...state.logs, action.log] };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SYNC_REMOTE_STATE":
      return {
        ...state,
        ...action.snapshot,
      };
    default:
      return state;
  }
}

interface BoardContextType {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
}

const BoardContext = createContext<BoardContextType | null>(null);

export function BoardProvider({
  initialState,
  children,
}: {
  initialState: BoardState;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(boardReducer, initialState);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const snapshot = await fetchBoardState();
        if (!cancelled) {
          dispatch({ type: "SYNC_REMOTE_STATE", snapshot });
        }
      } catch {
        // Keep the current UI usable when polling fails.
      }
    };

    const timer = window.setInterval(sync, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return <BoardContext.Provider value={{ state, dispatch }}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error("useBoard must be used within BoardProvider");
  return context;
}
```

- [ ] **Step 5: Re-run the provider sync test**

Run:

```bash
npm test -- __tests__/board-provider-sync.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/api.ts lib/store.tsx __tests__/board-provider-sync.test.tsx
git commit -m "refactor: sync board state from server snapshots"
```

---

### Task 5: Wire The Punch UI To The New API

**Files:**
- Modify: `components/ui/PunchPopup.tsx`
- Modify: `components/punch-board/HeatmapGrid.tsx`
- Create: `__tests__/heatmap-grid-punch.test.tsx`

- [ ] **Step 1: Write the failing punch UI test**

Create `__tests__/heatmap-grid-punch.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeatmapGrid } from "@/components/punch-board/HeatmapGrid";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const initialState: BoardState = {
  members: [
    { id: "user-1", name: "Li", avatarKey: "male1" },
    { id: "user-2", name: "Luo", avatarKey: "male2" },
  ],
  gridData: [[false, null], [false, null]],
  teamCoins: 0,
  targetCoins: 100,
  today: 1,
  totalDays: 2,
  logs: [],
  activeTab: "punch",
  currentUserId: "user-1",
};

describe("HeatmapGrid punch flow", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            snapshot: {
              members: initialState.members,
              gridData: [[true, null], [false, null]],
              teamCoins: 15,
              targetCoins: 100,
              today: 1,
              totalDays: 2,
              currentUserId: "user-1",
            },
          }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({ snapshot: initialState }),
        }),
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

  it("confirms today's punch through the API and replaces the rendered cell from the returned snapshot", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <HeatmapGrid />
        </BoardProvider>,
      );
    });

    const plusButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");
    expect(plusButton).toBeDefined();

    await act(async () => {
      plusButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirmButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("确认打卡"));
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/board/punch", expect.objectContaining({ method: "POST" }));
    expect(container.textContent).not.toContain("+");
    expect(container.textContent).toContain("✓");
  });
});
```

- [ ] **Step 2: Run the punch UI test to confirm it fails**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: FAIL because `HeatmapGrid` still dispatches a local `PUNCH` action.

- [ ] **Step 3: Make the popup support async confirm states**

Update `components/ui/PunchPopup.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { QuestBtn } from "./QuestBtn";

interface PunchPopupProps {
  onConfirm: () => Promise<boolean> | boolean;
  busy?: boolean;
  error?: string | null;
}

export function PunchPopup({ onConfirm, busy = false, error = null }: PunchPopupProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setShow(false);
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [show, busy]);

  return (
    <div style={{ position: "relative" }}>
      <button
        className="cell my-punch-btn text-xl cursor-pointer disabled:opacity-50"
        disabled={busy}
        onClick={(event) => {
          event.stopPropagation();
          setShow(true);
        }}
      >
        +
      </button>
      {show && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[200]" onClick={() => !busy && setShow(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-slate-800 rounded-2xl shadow-[4px_4px_0_0_#1f2937] z-[201] w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-black text-slate-800">确认打卡</h3>
              <button
                type="button"
                onClick={() => !busy && setShow(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border-2 border-slate-200 hover:border-slate-800 transition-colors text-slate-400 hover:text-slate-800"
              >
                ✕
              </button>
            </div>
            <p className="text-sm font-bold text-main leading-relaxed">确认打卡今天吗？</p>
            <p className="text-xs font-bold text-sub mt-2">确认后会直接记为今日健身打卡。</p>
            {error ? <p className="mt-3 text-xs font-bold text-orange-500">{error}</p> : null}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => !busy && setShow(false)}
                className="flex-1 py-3 text-sm font-bold border-2 border-slate-200 rounded-xl hover:border-slate-800 transition-colors"
              >
                取消
              </button>
              <QuestBtn
                type="button"
                className="flex-1 py-3 text-sm"
                disabled={busy}
                onClick={async () => {
                  const ok = await onConfirm();
                  if (ok) {
                    setShow(false);
                  }
                }}
              >
                {busy ? "提交中..." : "确认打卡"}
              </QuestBtn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Replace local dispatch in the heatmap with the punch API**

Update `components/punch-board/HeatmapGrid.tsx`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { submitTodayPunch } from "@/lib/api";
import { PunchPopup } from "@/components/ui/PunchPopup";
import { getAvatarUrl } from "@/lib/avatars";

export function HeatmapGrid() {
  const { state, dispatch } = useBoard();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentUserIndex = state.members.findIndex((member) => member.id === state.currentUserId);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = (state.today - 2) * 60;
    }
  }, [state.today]);

  async function handlePunchConfirm() {
    setSubmitting(true);
    setError(null);

    try {
      const snapshot = await submitTodayPunch();

      dispatch({ type: "SYNC_REMOTE_STATE", snapshot });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `punch-${Date.now()}`,
          text: "<b>你</b> 已完成今日健身打卡，服务器状态已同步。",
          type: "success",
          timestamp: new Date(),
        },
      });
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "打卡失败";
      setError(message);
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `punch-error-${Date.now()}`,
          text: `打卡失败：${message}`,
          type: "alert",
          timestamp: new Date(),
        },
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 w-full soft-card flex relative overflow-hidden">
      <div className="w-28 border-r-2 border-slate-100 flex flex-col bg-white z-10 shrink-0 rounded-l-[1.25rem]">
        <div className="h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-center font-bold text-xs text-sub rounded-tl-[1.25rem]">
          MEMBERS
        </div>
        <div className="flex-1 flex flex-col py-2 justify-between items-center">
          {state.members.map((member, index) => (
            <div key={member.id} className="flex flex-col items-center gap-1 relative">
              <div
                className={`h-10 w-10 flex items-center justify-center rounded-full shadow-sm border overflow-hidden bg-slate-50 ${
                  index === currentUserIndex ? "border-2 border-slate-800 ring-2 ring-yellow-300" : "border-slate-200"
                } relative`}
              >
                <img src={getAvatarUrl(member.avatarKey)} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] font-bold text-sub truncate max-w-[4rem] text-center">{member.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar relative flex flex-col scroll-smooth">
        <div className="h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center px-4 gap-3 shrink-0 w-max sticky top-0 z-0">
          {Array.from({ length: state.totalDays }, (_, index) => {
            const day = index + 1;
            const isToday = day === state.today;

            return (
              <div
                key={day}
                className={`w-12 flex justify-center items-center text-xs font-bold rounded-full h-6 ${
                  isToday
                    ? "bg-yellow-300 text-slate-900 border-2 border-slate-800 shadow-[0_2px_0_0_rgba(31,41,55,1)]"
                    : "text-slate-400"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
        <div className="flex-1 py-2 px-4 w-max relative">
          <div className="flex flex-col justify-between h-full relative z-10">
            {state.members.map((member, rowIndex) => (
              <div key={member.id} className="flex gap-3 h-12 items-center">
                {Array.from({ length: state.totalDays }, (_, index) => {
                  const day = index + 1;
                  const status = state.gridData[rowIndex][index];
                  const isCurrentUser = rowIndex === currentUserIndex;

                  if (day < state.today) {
                    return <div key={day} className={`cell ${status ? "cell-punched" : "cell-missed"}`}>{status ? "✓" : ""}</div>;
                  }

                  if (day === state.today && !status && isCurrentUser) {
                    return (
                      <PunchPopup
                        key={day}
                        busy={submitting}
                        error={error}
                        onConfirm={handlePunchConfirm}
                      />
                    );
                  }

                  if (day === state.today && status) {
                    return <div key={day} className="cell cell-punched">✓</div>;
                  }

                  return <div key={day} className="cell cell-future opacity-50" />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Re-run the punch UI test**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run the focused regression suite**

Run:

```bash
npm test -- __tests__/board-state.test.ts __tests__/board-state-api.test.ts __tests__/board-punch-api.test.ts __tests__/board-provider-sync.test.tsx __tests__/heatmap-grid-punch.test.tsx
```

Expected: PASS for all five files.

- [ ] **Step 7: Run the full project verification**

Run:

```bash
npm test
npm run build
```

Expected:
- `npm test`: PASS
- `npm run build`: PASS

- [ ] **Step 8: Commit**

```bash
git add components/ui/PunchPopup.tsx components/punch-board/HeatmapGrid.tsx __tests__/heatmap-grid-punch.test.tsx
git commit -m "feat: sync punch UI with persistent board state"
```
