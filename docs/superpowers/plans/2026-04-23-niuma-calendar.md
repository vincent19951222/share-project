# Niuma Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new top-level `牛马日历` tab that shows the current user a read-only monthly calendar combining fitness punch status and coffee cup counts.

**Architecture:** Keep the UI simple and read-only, but introduce one narrow month-scoped calendar snapshot flow because the existing `BoardState` and `CoffeeSnapshot` only cover the current month. The calendar UI should live under a dedicated `components/calendar/` module, with one server helper for month data, one API route for client month switching, and one pure UI derivation helper for month navigation and grid shaping.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, Tailwind CSS, Prisma + SQLite, Vitest + jsdom.

---

## File Structure

- Create: `lib/calendar-state.ts`
  - Server-side month snapshot builder for one user and one month.
  - Reads punch and coffee records by `dayKey` month prefix.
- Create: `app/api/calendar/state/route.ts`
  - Read-only endpoint that returns one month of `牛马日历` data.
  - Accepts `month=YYYY-MM`.
- Create: `components/calendar/calendar-data.ts`
  - Pure helpers for month labels, previous-month navigation, weekday offsets, and cell shaping.
- Create: `components/calendar/CalendarBoard.tsx`
  - Stateful page boundary for the calendar tab.
  - Fetches current month initially, then historical months on demand.
- Create: `components/calendar/CalendarHeader.tsx`
  - Title, month label, and month navigation controls.
- Create: `components/calendar/CalendarGrid.tsx`
  - Weekday row and month grid layout.
- Create: `components/calendar/CalendarDayCell.tsx`
  - One day cell showing date number, workout marker, and repeated coffee icons.
- Create: `__tests__/calendar-data.test.ts`
  - Unit tests for month navigation rules and grid shaping.
- Create: `__tests__/calendar-board.test.tsx`
  - Component test for top-level rendering and repeated coffee icon behavior.
- Modify: `lib/types.ts`
  - Add `calendar` to `AppTab`.
  - Add calendar-specific snapshot types.
- Modify: `lib/api.ts`
  - Add `fetchCalendarState(monthKey?: string)`.
- Modify: `components/navbar/Navbar.tsx`
  - Add the `牛马日历` tab button.
- Modify: `app/(board)/page.tsx`
  - Mount the new calendar page.
- Modify: `app/globals.css`
  - Add any narrow tab styling needed for the new nav entry.

## Implementation Note

The approved design said "reuse existing state and avoid new APIs." That works for the current month only. Historical month navigation cannot be implemented from the current client state because:

- `BoardState.gridData` is scoped to the current month
- `CoffeeSnapshot.gridData` is scoped to the current month
- historical month switching needs a different month slice from the database

So this plan introduces one narrow read-only route, `GET /api/calendar/state?month=YYYY-MM`, instead of stretching current-month state beyond what it can represent. Keep that route private to this feature and do not expand it into a generic reporting API.

## Shared Rules

- `牛马日历` is read-only: no edit, no backfill, no modal.
- Default month is the current Shanghai month.
- The user can move only to previous months and back to the current month.
- No navigation into future months.
- Empty days stay blank except for the date number.
- Coffee cups render as repeated pixel-art icons, not `3+`, not `☕ 2`, not numeric badges.
- Fitness stays binary: marker present or absent only.

---

### Task 1: Add Calendar Types and Pure Month Helpers

**Files:**
- Modify: `lib/types.ts`
- Create: `components/calendar/calendar-data.ts`
- Create: `__tests__/calendar-data.test.ts`

- [ ] **Step 1: Write the failing pure-helper tests**

Create `__tests__/calendar-data.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  buildCalendarGrid,
  formatCalendarMonthLabel,
  getPreviousMonthKey,
  isFutureMonthKey,
} from "@/components/calendar/calendar-data";
import type { CalendarMonthSnapshot } from "@/lib/types";

const aprilSnapshot: CalendarMonthSnapshot = {
  monthKey: "2026-04",
  todayDay: 23,
  totalDays: 30,
  currentMonthKey: "2026-04",
  workoutDays: 2,
  coffeeCupTotal: 4,
  days: [
    { day: 1, workedOut: true, coffeeCups: 0 },
    { day: 2, workedOut: false, coffeeCups: 2 },
    { day: 3, workedOut: true, coffeeCups: 2 },
  ],
};

describe("calendar-data", () => {
  it("formats month labels for the header", () => {
    expect(formatCalendarMonthLabel("2026-04")).toBe("2026年4月");
  });

  it("returns the previous month key across year boundaries", () => {
    expect(getPreviousMonthKey("2026-04")).toBe("2026-03");
    expect(getPreviousMonthKey("2026-01")).toBe("2025-12");
  });

  it("blocks future month navigation", () => {
    expect(isFutureMonthKey("2026-05", "2026-04")).toBe(true);
    expect(isFutureMonthKey("2026-04", "2026-04")).toBe(false);
    expect(isFutureMonthKey("2026-03", "2026-04")).toBe(false);
  });

  it("builds a month grid with leading blanks and merged day data", () => {
    const cells = buildCalendarGrid(aprilSnapshot, 3);

    expect(cells.slice(0, 3)).toEqual([
      { kind: "blank" },
      { kind: "blank" },
      { kind: "blank" },
    ]);
    expect(cells[3]).toMatchObject({
      kind: "day",
      day: 1,
      workedOut: true,
      coffeeCups: 0,
      isToday: false,
    });
    expect(cells[4]).toMatchObject({
      kind: "day",
      day: 2,
      workedOut: false,
      coffeeCups: 2,
    });
    expect(cells[5]).toMatchObject({
      kind: "day",
      day: 3,
      workedOut: true,
      coffeeCups: 2,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- __tests__/calendar-data.test.ts
```

Expected: FAIL because `calendar-data.ts` and `CalendarMonthSnapshot` do not exist.

- [ ] **Step 3: Add calendar types**

Update `lib/types.ts`:

```typescript
export type AppTab = "punch" | "board" | "coffee" | "calendar" | "dash";

export interface CalendarDayRecord {
  day: number;
  workedOut: boolean;
  coffeeCups: number;
}

export interface CalendarMonthSnapshot {
  monthKey: string;
  currentMonthKey: string;
  todayDay: number | null;
  totalDays: number;
  workoutDays: number;
  coffeeCupTotal: number;
  days: CalendarDayRecord[];
}
```

- [ ] **Step 4: Add the pure month helper module**

Create `components/calendar/calendar-data.ts`:

```typescript
import type { CalendarDayRecord, CalendarMonthSnapshot } from "@/lib/types";

export type CalendarGridCell =
  | { kind: "blank" }
  | {
      kind: "day";
      day: number;
      workedOut: boolean;
      coffeeCups: number;
      isToday: boolean;
    };

function parseMonthKey(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  return { year: Number(yearText), month: Number(monthText) };
}

export function formatCalendarMonthLabel(monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  return `${year}年${month}月`;
}

export function getPreviousMonthKey(monthKey: string) {
  const { year, month } = parseMonthKey(monthKey);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isFutureMonthKey(monthKey: string, currentMonthKey: string) {
  return monthKey > currentMonthKey;
}

export function buildCalendarGrid(
  snapshot: CalendarMonthSnapshot,
  firstDayOffset: number,
): CalendarGridCell[] {
  const dayMap = new Map<number, CalendarDayRecord>(
    snapshot.days.map((day) => [day.day, day]),
  );

  return [
    ...Array.from({ length: firstDayOffset }, () => ({ kind: "blank" as const })),
    ...Array.from({ length: snapshot.totalDays }, (_, index) => {
      const day = index + 1;
      const record = dayMap.get(day);

      return {
        kind: "day" as const,
        day,
        workedOut: record?.workedOut ?? false,
        coffeeCups: record?.coffeeCups ?? 0,
        isToday: snapshot.todayDay === day,
      };
    }),
  ];
}
```

- [ ] **Step 5: Run the pure-helper test and verify it passes**

Run:

```bash
npm test -- __tests__/calendar-data.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts components/calendar/calendar-data.ts __tests__/calendar-data.test.ts
git commit -m "feat: add calendar month helpers"
```

---

### Task 2: Add Month-Scoped Calendar Snapshot Reading

**Files:**
- Create: `lib/calendar-state.ts`
- Create: `app/api/calendar/state/route.ts`
- Modify: `lib/api.ts`

- [ ] **Step 1: Write the failing API helper test**

Append to `__tests__/calendar-data.test.ts`:

```typescript
import { readCalendarMonthKey } from "@/lib/calendar-state";

it("normalizes invalid or future month queries back to the current month", () => {
  expect(readCalendarMonthKey("2026-04", "2026-04")).toBe("2026-04");
  expect(readCalendarMonthKey("2026-13", "2026-04")).toBe("2026-04");
  expect(readCalendarMonthKey("not-a-month", "2026-04")).toBe("2026-04");
  expect(readCalendarMonthKey("2026-05", "2026-04")).toBe("2026-04");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm test -- __tests__/calendar-data.test.ts
```

Expected: FAIL because `lib/calendar-state.ts` does not exist.

- [ ] **Step 3: Add the server month snapshot builder**

Create `lib/calendar-state.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { getShanghaiDayKey } from "@/lib/economy";
import type { CalendarMonthSnapshot } from "@/lib/types";

function getMonthTotalDays(monthKey: string) {
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function readCalendarMonthKey(requestedMonthKey: string | null, currentMonthKey: string) {
  if (!requestedMonthKey || !/^\d{4}-\d{2}$/.test(requestedMonthKey)) {
    return currentMonthKey;
  }

  if (requestedMonthKey > currentMonthKey) {
    return currentMonthKey;
  }

  const [, monthText] = requestedMonthKey.split("-");
  const month = Number(monthText);

  return month >= 1 && month <= 12 ? requestedMonthKey : currentMonthKey;
}

export async function buildCalendarMonthSnapshotForUser(
  userId: string,
  monthKey: string,
  now: Date = new Date(),
): Promise<CalendarMonthSnapshot | null> {
  const currentMonthKey = getShanghaiDayKey(now).slice(0, 7);
  const todayDay = monthKey === currentMonthKey ? Number(getShanghaiDayKey(now).slice(8, 10)) : null;
  const totalDays = getMonthTotalDays(monthKey);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      punchRecords: {
        where: { dayKey: { startsWith: monthKey }, punched: true },
        select: { dayKey: true },
      },
      coffeeRecords: {
        where: { dayKey: { startsWith: monthKey }, deletedAt: null },
        select: { dayKey: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  const workoutDays = new Set(
    user.punchRecords.map((record) => Number(record.dayKey.slice(8, 10))),
  );
  const coffeeCounts = new Map<number, number>();

  for (const record of user.coffeeRecords) {
    const day = Number(record.dayKey.slice(8, 10));
    coffeeCounts.set(day, (coffeeCounts.get(day) ?? 0) + 1);
  }

  const days = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    return {
      day,
      workedOut: workoutDays.has(day),
      coffeeCups: coffeeCounts.get(day) ?? 0,
    };
  });

  return {
    monthKey,
    currentMonthKey,
    todayDay,
    totalDays,
    workoutDays: days.filter((day) => day.workedOut).length,
    coffeeCupTotal: days.reduce((sum, day) => sum + day.coffeeCups, 0),
    days,
  };
}
```

- [ ] **Step 4: Add the read-only calendar route and client fetch helper**

Create `app/api/calendar/state/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildCalendarMonthSnapshotForUser, readCalendarMonthKey } from "@/lib/calendar-state";
import { getShanghaiDayKey } from "@/lib/economy";

export async function GET(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);
    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const currentMonthKey = getShanghaiDayKey().slice(0, 7);
    const monthKey = readCalendarMonthKey(
      request.nextUrl.searchParams.get("month"),
      currentMonthKey,
    );
    const snapshot = await buildCalendarMonthSnapshotForUser(userId, monthKey);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
```

Update `lib/api.ts`:

```typescript
import type { BoardSnapshot, CalendarMonthSnapshot, CoffeeSnapshot } from "@/lib/types";

async function readCalendarSnapshot(response: Response): Promise<CalendarMonthSnapshot> {
  const payload = await response.json();

  if (!response.ok) {
    throw new ApiError(payload.error ?? "请求失败", response.status);
  }

  return payload.snapshot as CalendarMonthSnapshot;
}

export async function fetchCalendarState(monthKey?: string): Promise<CalendarMonthSnapshot> {
  const search = monthKey ? `?month=${monthKey}` : "";
  const response = await fetch(`/api/calendar/state${search}`, {
    cache: "no-store",
    credentials: "same-origin",
  });

  return readCalendarSnapshot(response);
}
```

- [ ] **Step 5: Run the test and a focused route smoke check**

Run:

```bash
npm test -- __tests__/calendar-data.test.ts
npm run lint
```

Expected: PASS for the test file, no TypeScript or ESLint errors from the new route and helper.

- [ ] **Step 6: Commit**

```bash
git add lib/calendar-state.ts app/api/calendar/state/route.ts lib/api.ts __tests__/calendar-data.test.ts
git commit -m "feat: add month-scoped calendar snapshot"
```

---

### Task 3: Build the Calendar UI Module

**Files:**
- Create: `components/calendar/CalendarBoard.tsx`
- Create: `components/calendar/CalendarHeader.tsx`
- Create: `components/calendar/CalendarGrid.tsx`
- Create: `components/calendar/CalendarDayCell.tsx`
- Modify: `app/(board)/page.tsx`
- Modify: `components/navbar/Navbar.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write the failing component test**

Create `__tests__/calendar-board.test.tsx`:

```typescript
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import { fetchCalendarState } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  fetchCalendarState: vi.fn(),
}));

const mockedFetchCalendarState = vi.mocked(fetchCalendarState);

describe("CalendarBoard", () => {
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
    vi.resetAllMocks();
  });

  it("renders a read-only monthly calendar with repeated coffee icons", async () => {
    mockedFetchCalendarState.mockResolvedValue({
      monthKey: "2026-04",
      currentMonthKey: "2026-04",
      todayDay: 23,
      totalDays: 30,
      workoutDays: 2,
      coffeeCupTotal: 3,
      days: [
        { day: 1, workedOut: true, coffeeCups: 0 },
        { day: 2, workedOut: false, coffeeCups: 2 },
        { day: 3, workedOut: true, coffeeCups: 1 },
      ],
    });

    await act(async () => {
      root.render(<CalendarBoard />);
    });

    expect(container.textContent).toContain("牛马日历");
    expect(container.textContent).toContain("2026年4月");
    expect(container.textContent).toContain("本月练了 2 天");
    expect(container.textContent).toContain("本月喝了 3 杯");
    expect(container.textContent).toContain("回到本月");
    expect(container.querySelectorAll("img[alt='咖啡记录']").length).toBe(3);
    expect(container.textContent).not.toContain("未打卡");
    expect(container.textContent).not.toContain("详情");
  });
});
```

- [ ] **Step 2: Run the component test to verify it fails**

Run:

```bash
npm test -- __tests__/calendar-board.test.tsx
```

Expected: FAIL because the calendar components do not exist.

- [ ] **Step 3: Build the read-only calendar UI**

Create `components/calendar/CalendarBoard.tsx`:

```typescript
"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchCalendarState } from "@/lib/api";
import type { CalendarMonthSnapshot } from "@/lib/types";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";
import { formatCalendarMonthLabel, getPreviousMonthKey } from "./calendar-data";

export function CalendarBoard() {
  const [snapshot, setSnapshot] = useState<CalendarMonthSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load(monthKey?: string) {
    setBusy(true);
    try {
      const next = await fetchCalendarState(monthKey);
      setSnapshot(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "牛马日历加载失败");
    } finally {
      setBusy(false);
    }
  }

  const canReturnToCurrentMonth =
    snapshot !== null && snapshot.monthKey !== snapshot.currentMonthKey;

  const monthLabel = snapshot ? formatCalendarMonthLabel(snapshot.monthKey) : "加载中";

  return (
    <section className="absolute inset-0 overflow-y-auto p-4 sm:p-6">
      <div className="flex min-h-full flex-col gap-4 rounded-[1.45rem] border-[6px] border-slate-100 bg-white p-4 shadow-sm sm:p-6">
        <CalendarHeader
          title="牛马日历"
          monthLabel={monthLabel}
          busy={busy}
          canReturnToCurrentMonth={canReturnToCurrentMonth}
          onPreviousMonth={() => snapshot && void load(getPreviousMonthKey(snapshot.monthKey))}
          onReturnToCurrentMonth={() => snapshot && void load(snapshot.currentMonthKey)}
        />
        {snapshot ? (
          <>
            <div className="flex flex-wrap gap-3 text-sm font-black text-slate-900">
              <div className="rounded-full border-[3px] border-slate-900 bg-yellow-200 px-4 py-2 shadow-[0_3px_0_0_#1f2937]">
                本月练了 {snapshot.workoutDays} 天
              </div>
              <div className="rounded-full border-[3px] border-slate-900 bg-orange-100 px-4 py-2 shadow-[0_3px_0_0_#1f2937]">
                本月喝了 {snapshot.coffeeCupTotal} 杯
              </div>
            </div>
            <CalendarGrid snapshot={snapshot} />
          </>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-[1.25rem] border-[3px] border-dashed border-slate-300 bg-slate-50 font-black text-slate-500">
            {error ?? "牛马日历加载中..."}
          </div>
        )}
      </div>
    </section>
  );
}
```

Create `components/calendar/CalendarHeader.tsx`:

```typescript
interface CalendarHeaderProps {
  title: string;
  monthLabel: string;
  busy: boolean;
  canReturnToCurrentMonth: boolean;
  onPreviousMonth: () => void;
  onReturnToCurrentMonth: () => void;
}

export function CalendarHeader({
  title,
  monthLabel,
  busy,
  canReturnToCurrentMonth,
  onPreviousMonth,
  onReturnToCurrentMonth,
}: CalendarHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b-[4px] border-slate-100 pb-4">
      <div>
        <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Monthly Record View</div>
        <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm font-bold text-slate-600">{monthLabel}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onPreviousMonth}
          className="rounded-full border-[3px] border-slate-900 bg-white px-4 py-2 text-sm font-black shadow-[0_3px_0_0_#1f2937] disabled:opacity-60"
        >
          上个月
        </button>
        {canReturnToCurrentMonth ? (
          <button
            type="button"
            disabled={busy}
            onClick={onReturnToCurrentMonth}
            className="rounded-full border-[3px] border-slate-900 bg-teal-200 px-4 py-2 text-sm font-black shadow-[0_3px_0_0_#1f2937] disabled:opacity-60"
          >
            回到本月
          </button>
        ) : null}
      </div>
    </header>
  );
}
```

Create `components/calendar/CalendarGrid.tsx` and `components/calendar/CalendarDayCell.tsx` around the same rules:

```typescript
// CalendarGrid.tsx
import type { CalendarMonthSnapshot } from "@/lib/types";
import { buildCalendarGrid } from "./calendar-data";
import { CalendarDayCell } from "./CalendarDayCell";

const WEEKDAY_LABELS = ["日", "一", "二", "三", "四", "五", "六"];

export function CalendarGrid({ snapshot }: { snapshot: CalendarMonthSnapshot }) {
  const firstDayOffset = new Date(`${snapshot.monthKey}-01T00:00:00+08:00`).getDay();
  const cells = buildCalendarGrid(snapshot, firstDayOffset);

  return (
    <section className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell, index) =>
          cell.kind === "blank" ? (
            <div key={`blank-${index}`} className="min-h-32 rounded-2xl opacity-0" />
          ) : (
            <CalendarDayCell key={cell.day} cell={cell} />
          ),
        )}
      </div>
    </section>
  );
}

// CalendarDayCell.tsx
import Image from "next/image";
import type { CalendarGridCell } from "./calendar-data";

export function CalendarDayCell({ cell }: { cell: Extract<CalendarGridCell, { kind: "day" }> }) {
  return (
    <div className="flex min-h-32 flex-col rounded-2xl border-[3px] border-slate-200 bg-slate-50 p-3">
      <div className={`text-sm font-black ${cell.isToday ? "text-teal-700" : "text-slate-500"}`}>{cell.day}</div>
      <div className="mt-3 flex flex-1 flex-col justify-between gap-3">
        <div className="min-h-6 text-lg font-black text-slate-900">
          {cell.workedOut ? "✓" : ""}
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: cell.coffeeCups }, (_, index) => (
            <Image
              key={`${cell.day}-coffee-${index}`}
              src="/assets/calendar/coffee-pixel-16bit-v1.png"
              alt="咖啡记录"
              width={18}
              height={18}
              className="h-[18px] w-[18px] image-render-pixel"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Mount the tab and page entry**

Update `components/navbar/Navbar.tsx` and `app/(board)/page.tsx`:

```typescript
// Navbar.tsx
<TabBtn
  active={state.activeTab === "calendar"}
  onClick={() => dispatch({ type: "SET_TAB", tab: "calendar" })}
>
  <span dangerouslySetInnerHTML={{ __html: SvgIcons.calendar }} />
  牛马日历
</TabBtn>

// page.tsx
import { CalendarBoard } from "@/components/calendar/CalendarBoard";

<div
  className={`absolute inset-0 transition-opacity duration-300 ${
    state.activeTab === "calendar" ? "opacity-100" : "opacity-0 pointer-events-none"
  }`}
>
  <CalendarBoard />
</div>
```

- [ ] **Step 5: Run the component test and lint**

Run:

```bash
npm test -- __tests__/calendar-board.test.tsx
npm run lint
```

Expected: PASS, with the rendered calendar containing repeated coffee icons and no detail UI.

- [ ] **Step 6: Commit**

```bash
git add components/calendar app/(board)/page.tsx components/navbar/Navbar.tsx app/globals.css __tests__/calendar-board.test.tsx
git commit -m "feat: add niuma calendar tab"
```

---

### Task 4: Verify End-to-End Feature Behavior

**Files:**
- Modify: `__tests__/calendar-board.test.tsx`
- Modify: `docs/superpowers/specs/2026-04-23-niuma-calendar-design.md` (only if the implementation-note deviation needs to be backfilled into the design doc)

- [ ] **Step 1: Add one navigation-focused regression test**

Append to `__tests__/calendar-board.test.tsx`:

```typescript
it("shows return-to-current-month only on historical months", async () => {
  mockedFetchCalendarState.mockResolvedValueOnce({
    monthKey: "2026-03",
    currentMonthKey: "2026-04",
    todayDay: null,
    totalDays: 31,
    workoutDays: 0,
    coffeeCupTotal: 0,
    days: [],
  });

  await act(async () => {
    root.render(<CalendarBoard />);
  });

  expect(container.textContent).toContain("回到本月");
});
```

- [ ] **Step 2: Run the full targeted verification**

Run:

```bash
npm test -- __tests__/calendar-data.test.ts __tests__/calendar-board.test.tsx
npm run lint
npm run build
```

Expected:

- both calendar test files PASS
- lint PASS
- build succeeds without route or type errors

- [ ] **Step 3: Backfill the design doc only if needed**

If the finished implementation required the month-scoped read route exactly as planned, update the design doc with a short note so the written spec matches reality:

```markdown
## Implementation Note

Historical month navigation uses a narrow read-only calendar route because the existing board and coffee snapshots are current-month-only.
```

If the design doc is still accurate enough without this note, skip this step.

- [ ] **Step 4: Commit**

```bash
git add __tests__/calendar-board.test.tsx docs/superpowers/specs/2026-04-23-niuma-calendar-design.md
git commit -m "test: verify niuma calendar behavior"
```

## Self-Review

- Spec coverage:
  - top-level tab: Task 3
  - current month default + previous month navigation + no future navigation: Tasks 1-3
  - read-only day cells: Task 3
  - equal-weight day cell with fitness marker and repeated coffee icons: Task 3
  - blank empty days: Tasks 1 and 3
  - targeted tests: Tasks 1, 3, and 4
- Placeholder scan: no `TODO`, `TBD`, or "implement later" gaps remain.
- Type consistency:
  - `AppTab` uses `calendar`
  - month payload type is `CalendarMonthSnapshot`
  - pure cell type is `CalendarGridCell`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-23-niuma-calendar.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
