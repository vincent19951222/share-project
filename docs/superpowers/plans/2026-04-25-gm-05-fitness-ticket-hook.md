# GM-05 Fitness Ticket Hook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Award one lottery ticket from a real fitness punch and protect punch undo when that ticket can no longer be safely revoked.

**Architecture:** Keep the existing `/api/board/punch` API as the integration point. Add a small gamification helper for fitness ticket constants/errors, then update the punch POST/DELETE transactions to write ticket ledgers and adjust `User.ticketBalance` atomically with existing punch settlement.

**Tech Stack:** Next.js App Router API Routes, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom, React 19.

---

## File Structure

- Create: `lib/gamification/fitness-ticket.ts`
  - Constants, source builders, and `FitnessTicketAlreadySpentError`.
- Modify: `app/api/board/punch/route.ts`
  - Grant `FITNESS_PUNCH_GRANTED` inside punch creation transaction.
  - Revoke with `FITNESS_PUNCH_REVOKED` inside undo transaction when possible.
  - Block undo with `409` when ticket balance is insufficient.
- Modify: `components/punch-board/HeatmapGrid.tsx`
  - Update punch / undo helper copy and success log copy.
- Create: `__tests__/board-punch-fitness-ticket.test.ts`
  - Focused API tests for ticket grant and undo protection.
- Modify: `__tests__/heatmap-grid-punch.test.tsx`
  - Assert the updated helper copy and server error display.

## Implementation Rules

- Do not add a new HTTP endpoint.
- Do not implement lottery draw.
- Do not implement backpack UI.
- Do not implement leave coupon.
- Do not change four-dimension life-ticket logic.
- Do not change season slot or coin reward rules.
- Keep punch settlement and ticket grant in the same transaction.
- Keep punch undo and ticket revoke in the same transaction.
- When undo is blocked because the ticket cannot be revoked, leave all punch state unchanged.

---

### Task 1: Add Failing Fitness Ticket API Tests

**Files:**
- Create: `__tests__/board-punch-fitness-ticket.test.ts`

- [ ] **Step 1: Write focused API tests**

Create `__tests__/board-punch-fitness-ticket.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, POST } from "@/app/api/board/punch/route";
import { createCookieValue } from "@/lib/auth";
import { getCurrentBoardDay } from "@/lib/board-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(method: "POST" | "DELETE", userId?: string) {
  return new NextRequest("http://localhost/api/board/punch", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify({}),
  });
}

describe("fitness punch ticket hook", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let teamId: string;
  let today: number;
  let todayDayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    today = getCurrentBoardDay(fixedNow);
    todayDayKey = getShanghaiDayKey(fixedNow);

    await prisma.lotteryTicketLedger.deleteMany({ where: { userId } });
    await prisma.punchRecord.deleteMany({ where: { userId } });
    await prisma.activityEvent.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 10,
        currentStreak: 0,
        lastPunchDayKey: null,
        ticketBalance: 0,
      },
    });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("grants one fitness ticket with a ledger when a real punch succeeds", async () => {
    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: {
        userId,
        dayKey: todayDayKey,
        reason: "FITNESS_PUNCH_GRANTED",
      },
    });

    expect(punch.punchType).toBe("default");
    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
    expect(ledgers[0]).toMatchObject({
      teamId,
      delta: 1,
      balanceAfter: 1,
      sourceType: "fitness_punch",
      sourceId: punch.id,
    });
  });

  it("does not grant a second fitness ticket when duplicate punch is rejected", async () => {
    const firstResponse = await POST(request("POST", userId));
    const secondResponse = await POST(request("POST", userId));

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(409);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: {
        userId,
        dayKey: todayDayKey,
        reason: "FITNESS_PUNCH_GRANTED",
      },
    });

    expect(user.ticketBalance).toBe(1);
    expect(ledgers).toHaveLength(1);
  });

  it("revokes the unused fitness ticket when today's punch is undone", async () => {
    const punchResponse = await POST(request("POST", userId));
    expect(punchResponse.status).toBe(200);

    const undoResponse = await DELETE(request("DELETE", userId));
    expect(undoResponse.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const todayPunch = await prisma.punchRecord.findUnique({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });
    const revokeLedger = await prisma.lotteryTicketLedger.findFirst({
      where: {
        userId,
        dayKey: todayDayKey,
        reason: "FITNESS_PUNCH_REVOKED",
      },
    });

    expect(todayPunch).toBeNull();
    expect(user.ticketBalance).toBe(0);
    expect(revokeLedger).toMatchObject({
      delta: -1,
      balanceAfter: 0,
      sourceType: "fitness_punch_reversal",
    });
  });

  it("blocks undo when the granted fitness ticket has already been spent from the balance pool", async () => {
    const punchResponse = await POST(request("POST", userId));
    expect(punchResponse.status).toBe(200);

    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });
    const userBeforeSpend = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 0 },
    });
    await prisma.lotteryTicketLedger.create({
      data: {
        userId,
        teamId,
        dayKey: todayDayKey,
        delta: -1,
        balanceAfter: 0,
        reason: "LOTTERY_DRAW_SPENT",
        sourceType: "lottery_draw",
        sourceId: "draw-that-spent-fitness-ticket",
      },
    });

    const undoResponse = await DELETE(request("DELETE", userId));
    expect(undoResponse.status).toBe(409);
    await expect(undoResponse.json()).resolves.toMatchObject({
      error: "今天打卡送出的健身券已经花掉了，不能撤销打卡。",
    });

    const punchAfterUndoAttempt = await prisma.punchRecord.findUnique({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });
    const userAfterUndoAttempt = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const revokeLedger = await prisma.lotteryTicketLedger.findFirst({
      where: {
        userId,
        dayKey: todayDayKey,
        reason: "FITNESS_PUNCH_REVOKED",
      },
    });

    expect(punchAfterUndoAttempt?.id).toBe(punch.id);
    expect(userAfterUndoAttempt.coins).toBe(userBeforeSpend.coins);
    expect(userAfterUndoAttempt.currentStreak).toBe(userBeforeSpend.currentStreak);
    expect(userAfterUndoAttempt.lastPunchDayKey).toBe(todayDayKey);
    expect(userAfterUndoAttempt.ticketBalance).toBe(0);
    expect(revokeLedger).toBeNull();
  });

  it("keeps legacy punch undo working when no fitness ticket grant ledger exists", async () => {
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today,
        dayKey: todayDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
        countedForSeasonSlot: false,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 20,
        currentStreak: 1,
        lastPunchDayKey: todayDayKey,
        ticketBalance: 0,
      },
    });

    const undoResponse = await DELETE(request("DELETE", userId));
    expect(undoResponse.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const todayPunch = await prisma.punchRecord.findUnique({
      where: {
        userId_dayKey: {
          userId,
          dayKey: todayDayKey,
        },
      },
    });

    expect(todayPunch).toBeNull();
    expect(user.ticketBalance).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- __tests__/board-punch-fitness-ticket.test.ts
```

Expected: FAIL because punch settlement does not yet create or revoke fitness ticket ledgers.

---

### Task 2: Add Fitness Ticket Helper Constants

**Files:**
- Create: `lib/gamification/fitness-ticket.ts`

- [ ] **Step 1: Create helper file**

Create `lib/gamification/fitness-ticket.ts`:

```ts
export const FITNESS_PUNCH_TICKET_GRANT_REASON = "FITNESS_PUNCH_GRANTED";
export const FITNESS_PUNCH_TICKET_REVOKE_REASON = "FITNESS_PUNCH_REVOKED";
export const FITNESS_PUNCH_SOURCE_TYPE = "fitness_punch";
export const FITNESS_PUNCH_REVERSAL_SOURCE_TYPE = "fitness_punch_reversal";
export const FITNESS_TICKET_SPENT_MESSAGE = "今天打卡送出的健身券已经花掉了，不能撤销打卡。";

export class FitnessTicketAlreadySpentError extends Error {
  constructor() {
    super(FITNESS_TICKET_SPENT_MESSAGE);
    this.name = "FitnessTicketAlreadySpentError";
  }
}

export function shouldGrantFitnessPunchTicket(punch: {
  punched: boolean;
  punchType: string | null;
}) {
  return punch.punched && punch.punchType === "default";
}
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS for the helper file.

---

### Task 3: Grant Fitness Ticket In Punch POST Transaction

**Files:**
- Modify: `app/api/board/punch/route.ts`

- [ ] **Step 1: Import fitness ticket helpers**

Modify imports in `app/api/board/punch/route.ts`:

```ts
import {
  FITNESS_PUNCH_SOURCE_TYPE,
  FITNESS_PUNCH_TICKET_GRANT_REASON,
  FITNESS_PUNCH_REVERSAL_SOURCE_TYPE,
  FITNESS_PUNCH_TICKET_REVOKE_REASON,
  FitnessTicketAlreadySpentError,
  shouldGrantFitnessPunchTicket,
} from "@/lib/gamification/fitness-ticket";
```

If the revoke constants are not used until Task 4, keep the import limited in this task and extend it later.

- [ ] **Step 2: Capture created punch record**

Inside the `POST` transaction, replace:

```ts
await tx.punchRecord.create({
  data: {
    userId: user.id,
    seasonId: activeSeason?.id ?? null,
    dayIndex: today,
    dayKey: todayDayKey,
    punched: true,
    punchType: "default",
    streakAfterPunch: nextStreak,
    assetAwarded: reward,
    countedForSeasonSlot: countsForSeasonSlot,
  },
});
```

with:

```ts
const punch = await tx.punchRecord.create({
  data: {
    userId: user.id,
    seasonId: activeSeason?.id ?? null,
    dayIndex: today,
    dayKey: todayDayKey,
    punched: true,
    punchType: "default",
    streakAfterPunch: nextStreak,
    assetAwarded: reward,
    countedForSeasonSlot: countsForSeasonSlot,
  },
});
const grantsFitnessTicket = shouldGrantFitnessPunchTicket(punch);
```

- [ ] **Step 3: Increment ticket balance with the existing user update**

Replace the existing `tx.user.update` in POST:

```ts
await tx.user.update({
  where: { id: user.id },
  data: {
    coins: {
      increment: reward,
    },
    currentStreak: nextStreak,
    lastPunchDayKey: todayDayKey,
  },
});
```

with:

```ts
const updatedUser = await tx.user.update({
  where: { id: user.id },
  data: {
    coins: {
      increment: reward,
    },
    currentStreak: nextStreak,
    lastPunchDayKey: todayDayKey,
    ...(grantsFitnessTicket
      ? {
          ticketBalance: {
            increment: 1,
          },
        }
      : {}),
  },
  select: {
    ticketBalance: true,
  },
});
```

- [ ] **Step 4: Create grant ledger after the user balance update**

Immediately after the `updatedUser` update, add:

```ts
if (grantsFitnessTicket) {
  await tx.lotteryTicketLedger.create({
    data: {
      userId: user.id,
      teamId: user.teamId,
      dayKey: todayDayKey,
      delta: 1,
      balanceAfter: updatedUser.ticketBalance,
      reason: FITNESS_PUNCH_TICKET_GRANT_REASON,
      sourceType: FITNESS_PUNCH_SOURCE_TYPE,
      sourceId: punch.id,
      metadataJson: JSON.stringify({
        punchRecordId: punch.id,
        dayKey: todayDayKey,
        punchType: punch.punchType,
      }),
      createdAt: now,
    },
  });
}
```

- [ ] **Step 5: Run focused API tests**

Run:

```bash
npm test -- __tests__/board-punch-fitness-ticket.test.ts
```

Expected: Some tests still FAIL because DELETE does not yet revoke or block.

---

### Task 4: Revoke Or Block Fitness Ticket In Punch DELETE Transaction

**Files:**
- Modify: `app/api/board/punch/route.ts`

- [ ] **Step 1: Add `FitnessTicketAlreadySpentError` handling**

In the `DELETE` inner catch block, update:

```ts
if (error instanceof TodayPunchNotFoundError) {
  return NextResponse.json({ error: error.message }, { status: 409 });
}
```

to:

```ts
if (
  error instanceof TodayPunchNotFoundError ||
  error instanceof FitnessTicketAlreadySpentError
) {
  return NextResponse.json({ error: error.message }, { status: 409 });
}
```

- [ ] **Step 2: Select punch type for the undo candidate**

In the `todayPunch` select inside DELETE, add `punched` and `punchType`:

```ts
select: {
  id: true,
  seasonId: true,
  assetAwarded: true,
  countedForSeasonSlot: true,
  punched: true,
  punchType: true,
},
```

- [ ] **Step 3: Add grant lookup and safe revoke before deleting punch**

After `if (!todayPunch) { throw new TodayPunchNotFoundError(); }` and before reading `previousPunch`, add:

```ts
const grantLedger = shouldGrantFitnessPunchTicket(todayPunch)
  ? await tx.lotteryTicketLedger.findFirst({
      where: {
        userId: user.id,
        dayKey: todayDayKey,
        reason: FITNESS_PUNCH_TICKET_GRANT_REASON,
        sourceType: FITNESS_PUNCH_SOURCE_TYPE,
        sourceId: todayPunch.id,
      },
      select: {
        id: true,
      },
    })
  : null;

const revokeLedger = grantLedger
  ? await tx.lotteryTicketLedger.findFirst({
      where: {
        userId: user.id,
        dayKey: todayDayKey,
        reason: FITNESS_PUNCH_TICKET_REVOKE_REASON,
        sourceType: FITNESS_PUNCH_REVERSAL_SOURCE_TYPE,
        sourceId: todayPunch.id,
      },
      select: {
        id: true,
      },
    })
  : null;

if (grantLedger && !revokeLedger) {
  const ticketUser = await tx.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { ticketBalance: true },
  });

  if (ticketUser.ticketBalance < 1) {
    throw new FitnessTicketAlreadySpentError();
  }

  const balanceAfter = ticketUser.ticketBalance - 1;

  await tx.lotteryTicketLedger.create({
    data: {
      userId: user.id,
      teamId: user.teamId,
      dayKey: todayDayKey,
      delta: -1,
      balanceAfter,
      reason: FITNESS_PUNCH_TICKET_REVOKE_REASON,
      sourceType: FITNESS_PUNCH_REVERSAL_SOURCE_TYPE,
      sourceId: todayPunch.id,
      metadataJson: JSON.stringify({
        punchRecordId: todayPunch.id,
        grantLedgerId: grantLedger.id,
        dayKey: todayDayKey,
      }),
      createdAt: now,
    },
  });

  await tx.user.update({
    where: { id: user.id },
    data: {
      ticketBalance: balanceAfter,
    },
  });
}
```

This block must run before `tx.punchRecord.delete`. If it throws, the punch remains intact.

- [ ] **Step 4: Run focused API tests**

Run:

```bash
npm test -- __tests__/board-punch-fitness-ticket.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run existing punch regression tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS. Existing manual-punch undo tests should still pass because legacy punches without a grant ledger do not trigger ticket revocation.

---

### Task 5: Update Punch UI Copy And Tests

**Files:**
- Modify: `components/punch-board/HeatmapGrid.tsx`
- Modify: `__tests__/heatmap-grid-punch.test.tsx`

- [ ] **Step 1: Update punch success log and popup copy**

In `components/punch-board/HeatmapGrid.tsx`, change the success log text in `handlePunchConfirm` from:

```ts
text: "<b>你</b> 已完成今日健身打卡，服务器状态已同步。",
```

to:

```ts
text: "<b>你</b> 已完成今日健身打卡，健身券 +1，服务器状态已同步。",
```

In the punch confirmation `PunchPopup`, add explicit helper text:

```tsx
<PunchPopup
  key={day}
  busy={submitting}
  error={error}
  onConfirm={handlePunchConfirm}
  helperText="确认后会记为今日健身打卡，并获得 1 张健身券。"
/>
```

In the undo `PunchPopup`, change helper text from:

```tsx
helperText="撤销后会回滚今天获得的银子、连签和赛季进度。"
```

to:

```tsx
helperText="撤销后会回滚今天获得的银子、连签、赛季进度和未使用的健身券。"
```

- [ ] **Step 2: Update component tests**

In `__tests__/heatmap-grid-punch.test.tsx`, in the punch popup test after opening the `+` popup, assert:

```ts
expect(container.textContent).toContain("获得 1 张健身券");
```

In the successful punch test, update the log assertion:

```ts
expect(stateAfterResponse.logs[0].text).toContain("健身券 +1");
expect(stateAfterResponse.logs[0].text).toContain("服务器状态已同步");
```

In the undo popup test after opening the `✓` popup, assert:

```ts
expect(container.textContent).toContain("未使用的健身券");
```

Add a test for the blocked undo message:

```tsx
it("shows the spent fitness ticket error when punch undo is blocked", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: "今天打卡送出的健身券已经花掉了，不能撤销打卡。",
      }),
    }),
  );

  const punchedState: BoardState = {
    ...initialState,
    gridData: [[true, null], [false, null]],
    currentUser: {
      assetBalance: 20,
      currentStreak: 1,
      nextReward: 20,
      seasonIncome: 0,
      isAdmin: false,
    },
  };

  await act(async () => {
    root.render(
      <BoardProvider initialState={punchedState}>
        <HeatmapGrid />
        <Probe />
      </BoardProvider>,
    );
  });

  const punchedCellButton = Array.from(container.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === "✓",
  );
  expect(punchedCellButton).toBeDefined();

  await act(async () => {
    punchedCellButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  const undoButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("确认撤销"),
  );
  expect(undoButton).toBeDefined();

  await act(async () => {
    undoButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
  });

  const stateAfterFailure = readState(container);

  expect(stateAfterFailure.gridData[0][0]).toBe(true);
  expect(stateAfterFailure.logs[0].type).toBe("alert");
  expect(stateAfterFailure.logs[0].text).toContain("健身券已经花掉了");
  expect(container.textContent).toContain("今天打卡送出的健身券已经花掉了，不能撤销打卡。");
});
```

- [ ] **Step 3: Run component tests**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: PASS.

---

### Task 6: Verification

**Files:**
- No new files beyond previous tasks.

- [ ] **Step 1: Run focused fitness ticket API tests**

Run:

```bash
npm test -- __tests__/board-punch-fitness-ticket.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run existing punch API regression tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run heatmap punch UI tests**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Run GM-03/GM-04 gamification state regressions if those stories are implemented**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts __tests__/gamification-tasks-api.test.ts
```

Expected: PASS if GM-03 and GM-04 are already implemented in the branch. If those files do not exist yet, skip this command and record that GM-05 was verified against punch-only tests.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit GM-05**

```bash
git add lib/gamification/fitness-ticket.ts app/api/board/punch/route.ts components/punch-board/HeatmapGrid.tsx __tests__/board-punch-fitness-ticket.test.ts __tests__/heatmap-grid-punch.test.tsx
git commit -m "feat: grant tickets from fitness punches"
```

## Self-Review Checklist

- Real `punchType: "default"` punch grants exactly one ticket.
- Duplicate punch does not create a second ticket ledger.
- Punch grant ledger uses `FITNESS_PUNCH_GRANTED`.
- Punch undo with available balance creates `FITNESS_PUNCH_REVOKED`.
- Punch undo with zero ticket balance returns `409` and leaves punch state untouched.
- Legacy punch records without grant ledgers can still be undone.
- No lottery draw, backpack item, life-ticket, season reward, or Enterprise WeChat behavior is added.
