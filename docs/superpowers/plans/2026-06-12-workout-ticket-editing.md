# Workout Ticket Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users reopen today's completed fitness punch, edit the structured workout ticket, and save the workout dimensions without creating another punch or granting rewards again.

**Architecture:** Keep `PunchRecord` as the one-per-day attendance record and keep `WorkoutRecord` one-to-one with it. Add a `PATCH /api/board/punch` path that replaces today's workout entries only, expose `currentUserTodayWorkout` in `BoardSnapshot`, and reuse the existing `FitnessPunchTicket` modal for both first punch and post-punch editing.

**Tech Stack:** Next.js App Router API Routes, Prisma SQLite via better-sqlite3 adapter, React client components, Vitest + jsdom.

---

## File Structure

- Modify `lib/workouts.ts`: add helpers to serialize stored workout rows into UI payloads and replace a workout's entries for an existing punch.
- Modify `__tests__/workouts.test.ts`: cover serialization and replacement helper behavior.
- Modify `lib/types.ts`: add `currentUserTodayWorkout` to `BoardSnapshot`.
- Modify `lib/board-state.ts`: load the current user's today workout and include it in snapshots.
- Modify `__tests__/board-state.test.ts`: prove snapshots include today's current-user workout payload.
- Modify `app/api/board/punch/route.ts`: add `PATCH` for editing today's workout only.
- Modify `lib/api.ts`: add `updateTodayWorkout()`.
- Modify `__tests__/board-punch-api.test.ts`: prove `PATCH` updates entries without touching rewards and rejects invalid edits.
- Modify `components/ui/FitnessPunchTicket.tsx`: support initial payloads and a secondary danger action.
- Modify `components/ui/PunchPopup.tsx`: pass initial workout payload and danger action through the portal variant.
- Modify `__tests__/punch-popup.test.tsx`: cover prefilled ticket editing and danger action wiring.
- Modify `components/punch-board/HeatmapGrid.tsx`: open the ticket for today's completed current-user cell and call `PATCH` on save.
- Modify `__tests__/heatmap-grid-punch.test.tsx`: cover the clicked `✓` edit flow.

## Task 1: Workout Helper Layer

**Files:**
- Modify: `lib/workouts.ts`
- Modify: `__tests__/workouts.test.ts`

- [ ] **Step 1: Write failing helper tests**

Add these imports in `__tests__/workouts.test.ts`:

```ts
import {
  buildDefaultWorkoutPayload,
  buildWorkoutEntries,
  buildWorkoutSummary,
  createWorkoutForPunch,
  mapWorkoutRecordToTicketPayload,
  parseWorkoutTicketPayload,
  replaceWorkoutForPunch,
} from "@/lib/workouts";
```

Append these tests before the closing `});` of `describe("workout helpers", () => {`:

```ts
  it("maps a stored workout record back to a ticket payload", () => {
    const payload = mapWorkoutRecordToTicketPayload({
      trainingType: "both",
      durationMinutes: 70,
      entries: [
        { category: "strength", code: "abs", label: "腹" },
        { category: "cardio", code: "swim", label: "游泳" },
        { category: "strength", code: "chest", label: "胸" },
      ],
    });

    expect(payload).toEqual({
      trainingType: "both",
      cardioItem: "swim",
      strengthParts: ["chest", "abs"],
      durationMinutes: 70,
    });
  });

  it("uses a 60 minute UI default when stored duration is unknown", () => {
    const payload = mapWorkoutRecordToTicketPayload({
      trainingType: "cardio",
      durationMinutes: null,
      entries: [
        { category: "cardio", code: "treadmill", label: "跑步机" },
      ],
    });

    expect(payload).toEqual({
      trainingType: "cardio",
      cardioItem: "treadmill",
      strengthParts: [],
      durationMinutes: 60,
    });
  });

  it("returns null when stored workout entries cannot form a valid ticket payload", () => {
    expect(mapWorkoutRecordToTicketPayload({
      trainingType: "both",
      durationMinutes: 60,
      entries: [
        { category: "strength", code: "abs", label: "腹" },
      ],
    })).toBeNull();
  });

  it("replaces an existing workout by punch id", async () => {
    const upsert = vi.fn().mockResolvedValue({ id: "workout-1", entries: [] });

    await replaceWorkoutForPunch({
      tx: { workoutRecord: { upsert } } as never,
      userId: "user-1",
      teamId: "team-1",
      punchRecordId: "punch-1",
      dayKey: "2026-06-12",
      payload: {
        trainingType: "strength",
        cardioItem: null,
        strengthParts: ["chest", "shoulder"],
        durationMinutes: 50,
      },
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { punchRecordId: "punch-1" },
      create: {
        userId: "user-1",
        teamId: "team-1",
        punchRecordId: "punch-1",
        dayKey: "2026-06-12",
        trainingType: "strength",
        durationMinutes: 50,
        entries: {
          create: [
            { category: "strength", code: "chest", label: "胸" },
            { category: "strength", code: "shoulder", label: "肩" },
          ],
        },
      },
      update: {
        trainingType: "strength",
        durationMinutes: 50,
        entries: {
          deleteMany: {},
          create: [
            { category: "strength", code: "chest", label: "胸" },
            { category: "strength", code: "shoulder", label: "肩" },
          ],
        },
      },
      include: { entries: true },
    });
  });
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- __tests__/workouts.test.ts
```

Expected: FAIL with TypeScript/import errors for `mapWorkoutRecordToTicketPayload` and `replaceWorkoutForPunch`.

- [ ] **Step 3: Add helper types and functions**

In `lib/workouts.ts`, add these types after `type WorkoutTx = Pick<Prisma.TransactionClient, "workoutRecord">;`:

```ts
type WorkoutReplaceTx = Pick<Prisma.TransactionClient, "workoutRecord">;

type StoredWorkoutEntry = {
  category: string;
  code: string;
  label: string;
};

type StoredWorkoutRecord = {
  trainingType: string;
  durationMinutes: number | null;
  entries: StoredWorkoutEntry[];
};
```

Add these exports after `createWorkoutForPunch()`:

```ts
export function mapWorkoutRecordToTicketPayload(
  workout: StoredWorkoutRecord | null,
): WorkoutTicketPayload | null {
  if (!workout) {
    return null;
  }

  const cardioEntry = workout.entries.find(
    (entry) => entry.category === "cardio" && isCardioItem(entry.code),
  );
  const strengthParts = STRENGTH_PARTS.filter((part) =>
    workout.entries.some((entry) => entry.category === "strength" && entry.code === part),
  );
  const parsed = parseWorkoutTicketPayload({
    trainingType: workout.trainingType,
    cardioItem: cardioEntry?.code ?? null,
    strengthParts,
    durationMinutes: workout.durationMinutes ?? 60,
  });

  return parsed.ok ? parsed.payload : null;
}

export async function replaceWorkoutForPunch({
  tx,
  userId,
  teamId,
  punchRecordId,
  dayKey,
  payload,
}: {
  tx: WorkoutReplaceTx;
  userId: string;
  teamId: string;
  punchRecordId: string;
  dayKey: string;
  payload: WorkoutCreatePayload;
}) {
  if (!isValidWorkoutCreatePayload(payload)) {
    throw new Error("invalid-workout-payload");
  }

  const entries = buildWorkoutEntries(payload);

  return tx.workoutRecord.upsert({
    where: { punchRecordId },
    create: {
      userId,
      teamId,
      punchRecordId,
      dayKey,
      trainingType: payload.trainingType,
      durationMinutes: payload.durationMinutes,
      entries: {
        create: entries,
      },
    },
    update: {
      trainingType: payload.trainingType,
      durationMinutes: payload.durationMinutes,
      entries: {
        deleteMany: {},
        create: entries,
      },
    },
    include: {
      entries: true,
    },
  });
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
npm test -- __tests__/workouts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit helper layer**

Run:

```bash
git add lib/workouts.ts __tests__/workouts.test.ts
git commit -m "feat: add workout ticket edit helpers"
```

Expected: commit succeeds.

## Task 2: Board Snapshot Prefill Data

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/board-state.ts`
- Modify: `__tests__/board-state.test.ts`

- [ ] **Step 1: Write failing snapshot test**

In `__tests__/board-state.test.ts`, add this test after the test named `returns null when the user does not exist`:

```ts
  it("includes the current user's today workout payload when today's punch has a workout", async () => {
    const fixedNow = new Date("2026-04-18T09:00:00+08:00");
    const todayDayKey = "2026-04-18";
    await prisma.punchRecord.deleteMany({ where: { userId, dayKey: todayDayKey } });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const punch = await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: getCurrentBoardDay(fixedNow),
        dayKey: todayDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
        countedForSeasonSlot: false,
      },
    });
    await prisma.workoutRecord.create({
      data: {
        userId,
        teamId: user.teamId,
        punchRecordId: punch.id,
        dayKey: todayDayKey,
        trainingType: "both",
        durationMinutes: 60,
        entries: {
          create: [
            { category: "cardio", code: "elliptical", label: "椭圆机" },
            { category: "strength", code: "chest", label: "胸" },
            { category: "strength", code: "abs", label: "腹" },
          ],
        },
      },
    });

    try {
      const snapshot = await buildBoardSnapshotForUser(userId, fixedNow);

      expect(snapshot?.currentUserTodayWorkout).toEqual({
        trainingType: "both",
        cardioItem: "elliptical",
        strengthParts: ["chest", "abs"],
        durationMinutes: 60,
      });
    } finally {
      await prisma.punchRecord.deleteMany({ where: { userId, dayKey: todayDayKey } });
    }
  });
```

- [ ] **Step 2: Run snapshot test to verify failure**

Run:

```bash
npm test -- __tests__/board-state.test.ts
```

Expected: FAIL because `currentUserTodayWorkout` is not part of `BoardSnapshot`.

- [ ] **Step 3: Add snapshot type**

In `lib/types.ts`, add this import near the top:

```ts
import type { WorkoutTicketPayload } from "@/lib/workouts";
```

Add this property to `BoardSnapshot` before `today`:

```ts
  currentUserTodayWorkout?: WorkoutTicketPayload | null;
```

- [ ] **Step 4: Load today's workout in board state**

In `lib/board-state.ts`, update the imports:

```ts
import { mapWorkoutRecordToTicketPayload } from "@/lib/workouts";
```

After the `if (!user) { return null; }` guard, add:

```ts
  const todayWorkout = await prisma.workoutRecord.findFirst({
    where: {
      userId: user.id,
      dayKey: todayDayKey,
      punchRecord: {
        punched: true,
      },
    },
    select: {
      trainingType: true,
      durationMinutes: true,
      entries: {
        select: {
          category: true,
          code: true,
          label: true,
        },
      },
    },
  });
```

Add this property to the returned snapshot object:

```ts
    currentUserTodayWorkout: mapWorkoutRecordToTicketPayload(todayWorkout),
```

- [ ] **Step 5: Run snapshot test**

Run:

```bash
npm test -- __tests__/board-state.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit snapshot data**

Run:

```bash
git add lib/types.ts lib/board-state.ts __tests__/board-state.test.ts
git commit -m "feat: expose today workout in board snapshot"
```

Expected: commit succeeds.

## Task 3: Workout Edit API

**Files:**
- Modify: `app/api/board/punch/route.ts`
- Modify: `lib/api.ts`
- Modify: `__tests__/board-punch-api.test.ts`

- [ ] **Step 1: Write failing API tests**

In `__tests__/board-punch-api.test.ts`, add `PATCH` to the route import:

```ts
import { DELETE, PATCH, POST } from "@/app/api/board/punch/route";
```

Add this helper near the existing punch request helpers:

```ts
function patchRequest(userId?: string, body: unknown = validWorkoutPayload) {
  return new NextRequest("http://localhost/api/board/punch", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
```

Append these tests near the existing workout payload tests:

```ts
  it("updates today's workout ticket without granting another reward", async () => {
    await resetState();

    const punchResponse = await POST(request("POST", userId));
    expect(punchResponse.status).toBe(200);

    const beforeUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const beforeTicketLedgers = await prisma.lotteryTicketLedger.count({ where: { userId } });
    const beforePunchCount = await prisma.punchRecord.count({ where: { userId, dayKey: todayDayKey } });
    const beforeActivityCount = await prisma.activityEvent.count({ where: { userId, type: "PUNCH" } });

    const response = await PATCH(patchRequest(userId, {
      trainingType: "strength",
      cardioItem: null,
      strengthParts: ["shoulder", "abs"],
      durationMinutes: 50,
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    const afterUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const workout = await prisma.workoutRecord.findFirstOrThrow({
      where: { userId, dayKey: todayDayKey },
      include: { entries: { orderBy: [{ category: "asc" }, { code: "asc" }] } },
    });

    expect(afterUser.coins).toBe(beforeUser.coins);
    expect(afterUser.ticketBalance).toBe(beforeUser.ticketBalance);
    expect(afterUser.currentStreak).toBe(beforeUser.currentStreak);
    expect(await prisma.lotteryTicketLedger.count({ where: { userId } })).toBe(beforeTicketLedgers);
    expect(await prisma.punchRecord.count({ where: { userId, dayKey: todayDayKey } })).toBe(beforePunchCount);
    expect(await prisma.activityEvent.count({ where: { userId, type: "PUNCH" } })).toBe(beforeActivityCount);
    expect(workout).toMatchObject({
      trainingType: "strength",
      durationMinutes: 50,
    });
    expect(workout.entries.map((entry) => [entry.category, entry.code, entry.label])).toEqual([
      ["strength", "abs", "腹"],
      ["strength", "shoulder", "肩"],
    ]);
    expect(body.snapshot.currentUserTodayWorkout).toEqual({
      trainingType: "strength",
      cardioItem: null,
      strengthParts: ["shoulder", "abs"],
      durationMinutes: 50,
    });
  });

  it("rejects workout ticket edits before today's punch exists", async () => {
    await resetState();

    const response = await PATCH(patchRequest(userId, {
      trainingType: "cardio",
      cardioItem: "treadmill",
      strengthParts: [],
      durationMinutes: 40,
    }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "today-punch-not-found" });
    await expect(prisma.workoutRecord.count({ where: { userId, dayKey: todayDayKey } })).resolves.toBe(0);
  });

  it("rejects invalid workout ticket edits without changing the stored workout", async () => {
    await resetState();

    const punchResponse = await POST(request("POST", userId));
    expect(punchResponse.status).toBe(200);
    const beforeWorkout = await prisma.workoutRecord.findFirstOrThrow({
      where: { userId, dayKey: todayDayKey },
      include: { entries: { orderBy: [{ category: "asc" }, { code: "asc" }] } },
    });

    const response = await PATCH(patchRequest(userId, {
      trainingType: "strength",
      cardioItem: null,
      strengthParts: [],
      durationMinutes: 50,
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "invalid-workout-payload" });
    const afterWorkout = await prisma.workoutRecord.findUniqueOrThrow({
      where: { id: beforeWorkout.id },
      include: { entries: { orderBy: [{ category: "asc" }, { code: "asc" }] } },
    });
    expect(afterWorkout.trainingType).toBe(beforeWorkout.trainingType);
    expect(afterWorkout.durationMinutes).toBe(beforeWorkout.durationMinutes);
    expect(afterWorkout.entries.map((entry) => [entry.category, entry.code])).toEqual(
      beforeWorkout.entries.map((entry) => [entry.category, entry.code]),
    );
  });
```

- [ ] **Step 2: Run API tests to verify failure**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: FAIL because `PATCH` is not exported from `app/api/board/punch/route.ts`.

- [ ] **Step 3: Add API client wrapper**

In `lib/api.ts`, add:

```ts
export async function updateTodayWorkout(payload: WorkoutTicketPayload): Promise<BoardSnapshot> {
  const response = await fetch("/api/board/punch", {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return readSnapshot(response);
}
```

- [ ] **Step 4: Add PATCH route**

In `app/api/board/punch/route.ts`, add `replaceWorkoutForPunch` to the workouts import:

```ts
import {
  buildWorkoutSummary,
  createWorkoutForPunch,
  parseWorkoutTicketPayload,
  replaceWorkoutForPunch,
  type WorkoutTicketPayload,
} from "@/lib/workouts";
```

Add this exported route before the existing `DELETE` route:

```ts
export async function PATCH(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid-workout-payload" }, { status: 400 });
    }

    const parsedWorkout = parseWorkoutTicketPayload(body);

    if (!parsedWorkout.ok) {
      return NextResponse.json({ error: parsedWorkout.error }, { status: 400 });
    }

    const workoutPayload: WorkoutTicketPayload = parsedWorkout.payload;
    const now = new Date();
    const todayDayKey = getShanghaiDayKey(now);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        teamId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "user-not-found" }, { status: 401 });
    }

    const didUpdate = await prisma.$transaction(async (tx) => {
      const todayPunch = await tx.punchRecord.findUnique({
        where: {
          userId_dayKey: {
            userId: user.id,
            dayKey: todayDayKey,
          },
        },
        select: {
          id: true,
          punched: true,
        },
      });

      if (!todayPunch?.punched) {
        return false;
      }

      await replaceWorkoutForPunch({
        tx,
        userId: user.id,
        teamId: user.teamId,
        punchRecordId: todayPunch.id,
        dayKey: todayDayKey,
        payload: workoutPayload,
      });

      return true;
    });

    if (!didUpdate) {
      return NextResponse.json({ error: "today-punch-not-found" }, { status: 404 });
    }

    return buildSnapshotResponse(user.id, now);
  } catch {
    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
```

- [ ] **Step 5: Run API tests**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit API layer**

Run:

```bash
git add app/api/board/punch/route.ts lib/api.ts __tests__/board-punch-api.test.ts
git commit -m "feat: add workout ticket edit api"
```

Expected: commit succeeds.

## Task 4: Reusable Ticket Editing UI

**Files:**
- Modify: `components/ui/FitnessPunchTicket.tsx`
- Modify: `components/ui/PunchPopup.tsx`
- Modify: `app/globals.css`
- Modify: `__tests__/punch-popup.test.tsx`

- [ ] **Step 1: Write failing component tests**

Append these tests to `__tests__/punch-popup.test.tsx`:

```ts
  it("prefills the fitness ticket from an existing workout payload", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(
        <PunchPopup
          onConfirm={onConfirm}
          variant="fitness-ticket"
          confirmLabel="保存修改"
          initialWorkoutPayload={{
            trainingType: "strength",
            cardioItem: null,
            strengthParts: ["back", "abs"],
            durationMinutes: 50,
          }}
        />,
      );
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText()).toContain("背 / 腹");
    expect(pageText()).toContain("50");

    const confirmButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("保存修改"));

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledWith({
      trainingType: "strength",
      cardioItem: null,
      strengthParts: ["back", "abs"],
      durationMinutes: 50,
    });
  });

  it("runs the fitness ticket danger action and closes on success", async () => {
    const onConfirm = vi.fn().mockResolvedValue(true);
    const onDangerAction = vi.fn().mockResolvedValue(true);

    await act(async () => {
      root.render(
        <PunchPopup
          onConfirm={onConfirm}
          variant="fitness-ticket"
          onDangerAction={onDangerAction}
          dangerLabel="撤销打卡"
        />,
      );
    });

    const trigger = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");

    await act(async () => {
      trigger!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dangerButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("撤销打卡"));

    await act(async () => {
      dangerButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(onDangerAction).toHaveBeenCalledTimes(1);
    expect(pageText()).not.toContain("今日训练小票");
  });
```

- [ ] **Step 2: Run component tests to verify failure**

Run:

```bash
npm test -- __tests__/punch-popup.test.tsx
```

Expected: FAIL because `initialWorkoutPayload`, `onDangerAction`, and `dangerLabel` are not valid props.

- [ ] **Step 3: Add initial payload and danger action to ticket**

In `components/ui/FitnessPunchTicket.tsx`, extend the props:

```ts
  initialPayload?: WorkoutTicketPayload | null;
  dangerLabel?: string;
  dangerBusyLabel?: string;
  onDangerAction?: () => Promise<boolean> | boolean;
```

Add this constant near the option arrays:

```ts
const defaultTicketPayload: WorkoutTicketPayload = {
  trainingType: "both",
  cardioItem: "treadmill",
  strengthParts: ["chest", "shoulder", "glutes"],
  durationMinutes: 60,
};
```

Update the component signature and initial state:

```ts
export function FitnessPunchTicket({
  onCancel,
  onConfirm,
  busy = false,
  error = null,
  helperText = "确认后会记为今日健身打卡，并获得 1 张健身券。",
  confirmLabel = "确认打卡",
  busyLabel = "提交中...",
  initialPayload = null,
  dangerLabel,
  dangerBusyLabel = "处理中...",
  onDangerAction,
}: FitnessPunchTicketProps) {
  const startingPayload = initialPayload ?? defaultTicketPayload;
  const [trainingType, setTrainingType] = useState<TrainingType>(startingPayload.trainingType);
  const [cardioItem, setCardioItem] = useState<CardioItem>(startingPayload.cardioItem ?? "treadmill");
  const [selectedParts, setSelectedParts] = useState<StrengthPart[]>(startingPayload.strengthParts);
  const [duration, setDuration] = useState(startingPayload.durationMinutes);
```

Keep the refs aligned with the state:

```ts
  const trainingTypeRef = useRef(startingPayload.trainingType);
  const cardioItemRef = useRef<CardioItem>(startingPayload.cardioItem ?? "treadmill");
  const selectedPartsRef = useRef(startingPayload.strengthParts);
  const durationRef = useRef(startingPayload.durationMinutes);
```

Add a danger handler near `handleConfirm()`:

```ts
  async function handleDangerAction() {
    if (busy || !onDangerAction) {
      return;
    }

    const ok = await onDangerAction();

    if (ok) {
      onCancel?.();
    }
  }
```

In the footer, render the danger button before cancel when `onDangerAction` exists:

```tsx
          {onDangerAction && dangerLabel ? (
            <button
              className="fitness-ticket-cancel fitness-ticket-danger"
              type="button"
              disabled={busy}
              onClick={handleDangerAction}
            >
              {busy ? dangerBusyLabel : dangerLabel}
            </button>
          ) : null}
```

- [ ] **Step 4: Add popup pass-through props**

In `components/ui/PunchPopup.tsx`, add props:

```ts
  initialWorkoutPayload?: WorkoutTicketPayload | null;
  onDangerAction?: () => Promise<boolean> | boolean;
  dangerLabel?: string;
  dangerBusyLabel?: string;
```

Destructure them with defaults:

```ts
  initialWorkoutPayload = null,
  onDangerAction,
  dangerLabel,
  dangerBusyLabel = "处理中...",
```

Pass them to `<FitnessPunchTicket />`:

```tsx
            initialPayload={initialWorkoutPayload}
            onDangerAction={onDangerAction}
            dangerLabel={dangerLabel}
            dangerBusyLabel={dangerBusyLabel}
```

- [ ] **Step 5: Add danger button CSS**

In `app/globals.css`, add this near the existing `.fitness-ticket-cancel` and `.fitness-ticket-confirm` rules:

```css
.fitness-ticket-danger {
  background: #fff1f2;
  color: #9f1239;
}
```

Also add `.fitness-ticket-danger:disabled` to the existing disabled selector if that selector lists concrete button classes.

- [ ] **Step 6: Run component tests**

Run:

```bash
npm test -- __tests__/punch-popup.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit UI component changes**

Run:

```bash
git add components/ui/FitnessPunchTicket.tsx components/ui/PunchPopup.tsx app/globals.css __tests__/punch-popup.test.tsx
git commit -m "feat: support editable fitness ticket modal"
```

Expected: commit succeeds.

## Task 5: Heatmap Edit Flow

**Files:**
- Modify: `components/punch-board/HeatmapGrid.tsx`
- Modify: `__tests__/heatmap-grid-punch.test.tsx`

- [ ] **Step 1: Write failing heatmap test**

Append this test to `__tests__/heatmap-grid-punch.test.tsx` after the test named `shows the spent fitness ticket error when punch undo is blocked`:

```ts
  it("opens today's punched current-user cell as an editable workout ticket", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        snapshot: {
          ...createSnapshot({
            gridData: [[true, null], [false, null]],
            currentUserTodayWorkout: {
              trainingType: "both",
              cardioItem: "treadmill",
              strengthParts: ["chest"],
              durationMinutes: 60,
            },
          }),
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const punchedState: BoardState = {
      ...initialState,
      gridData: [[true, null], [false, null]],
      currentUserTodayWorkout: {
        trainingType: "both",
        cardioItem: "treadmill",
        strengthParts: ["chest"],
        durationMinutes: 60,
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

    const punchedButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "✓");

    await act(async () => {
      punchedButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("今日训练小票");
    expect(document.body.textContent).toContain("保存修改");
    expect(document.body.textContent).toContain("撤销打卡");
    expect(document.body.textContent).toContain("胸");

    const absButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "腹");
    const saveButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("保存修改"));

    await act(async () => {
      absButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      saveButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/board/punch", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({
        trainingType: "both",
        cardioItem: "treadmill",
        strengthParts: ["chest", "abs"],
        durationMinutes: 60,
      }),
    }));
  });
```

- [ ] **Step 2: Run heatmap test to verify failure**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: FAIL because the punched current-user cell still opens the simple undo dialog.

- [ ] **Step 3: Add edit API import and handler**

In `components/punch-board/HeatmapGrid.tsx`, update the API import:

```ts
import {
  deleteTodayPunch,
  submitAdminMakeupPunch,
  submitTodayPunch,
  submitYesterdayMakeupPunch,
  updateTodayWorkout,
} from "@/lib/api";
```

Add `edit?: string | null;` to `PunchActionErrors`.

Add this handler after `handlePunchConfirm()`:

```ts
  async function handleWorkoutUpdate(payload?: WorkoutTicketPayload) {
    if (submittingRef.current) {
      return false;
    }

    if (!payload) {
      setErrors((current) => ({ ...current, edit: "训练小票信息缺失" }));
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors((current) => ({ ...current, edit: null }));
    const punchEpoch = reservePunchEpoch();
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });

    try {
      const snapshot = await updateTodayWorkout(payload);

      dispatch({
        type: "SYNC_REMOTE_STATE",
        snapshot,
        source: "punch",
        punchEpoch,
      });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `workout-update-${Date.now()}`,
          text: "<b>你</b> 已更新今日训练小票，服务器状态已同步。",
          type: "highlight",
          timestamp: new Date(),
        },
      });
      window.dispatchEvent(new Event("activity-events:refresh"));
      dispatchCalendarRefresh();
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "保存失败";
      setErrors((current) => ({ ...current, edit: message }));
      dispatch({ type: "END_PUNCH_SYNC", punchEpoch });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `workout-update-error-${Date.now()}`,
          text: `保存训练小票失败：${message}`,
          type: "alert",
          timestamp: new Date(),
        },
      });
      return false;
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }
```

- [ ] **Step 4: Replace today punched current-user popup**

In `renderPunchCell()`, replace the current `day === state.today && status && isCurrentUser` branch with:

```tsx
    if (day === state.today && status && isCurrentUser) {
      return (
        <PunchPopup
          key={day}
          variant="fitness-ticket"
          busy={submitting}
          error={errors.edit ?? errors.undo ?? null}
          onConfirm={handleWorkoutUpdate}
          onDangerAction={handlePunchUndo}
          dangerLabel="撤销打卡"
          dangerBusyLabel="撤销中..."
          triggerContent="✓"
          triggerClassName={`${cellClassName} cell-punched cursor-pointer disabled:opacity-50`}
          initialWorkoutPayload={state.currentUserTodayWorkout ?? null}
          helperText="保存后只更新今天的训练明细，不重复发健身券。"
          confirmLabel="保存修改"
          busyLabel="保存中..."
        />
      );
    }
```

- [ ] **Step 5: Run heatmap test**

Run:

```bash
npm test -- __tests__/heatmap-grid-punch.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit heatmap flow**

Run:

```bash
git add components/punch-board/HeatmapGrid.tsx __tests__/heatmap-grid-punch.test.tsx
git commit -m "feat: let users edit today's workout ticket"
```

Expected: commit succeeds.

## Task 6: Final Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused test suite**

Run:

```bash
npm test -- __tests__/workouts.test.ts __tests__/board-state.test.ts __tests__/board-punch-api.test.ts __tests__/punch-popup.test.tsx __tests__/heatmap-grid-punch.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1 --port 3001
```

Expected: Next.js starts and prints a local URL on port 3001. If port 3001 is already in use, run:

```bash
npm run dev -- --host 127.0.0.1 --port 3002
```

- [ ] **Step 4: Manual browser acceptance**

Open the local board in the browser and verify:

```text
1. Log in as a local user.
2. If today is not punched, click today's +.
3. Select treadmill, chest, and abs, then confirm.
4. Confirm today's cell turns into ✓.
5. Click today's ✓.
6. Confirm the ticket opens with treadmill, chest, abs, and 60 minutes prefilled.
7. Add shoulder and click 保存修改.
8. Refresh the page.
9. Click today's ✓ again.
10. Confirm treadmill, chest, shoulder, abs, and 60 minutes are still selected.
11. Confirm ticket balance did not increase from the edit save.
12. Click 撤销打卡 and confirm today's cell returns to a punchable state.
```

- [ ] **Step 5: Inspect local database rows**

Run this query to inspect all local workout rows for the current local day:

```bash
sqlite3 /Users/vincent/data/share-project/dev.db "select u.username, pr.dayKey, wr.trainingType, wr.durationMinutes, group_concat(we.category || ':' || we.code) from PunchRecord pr join User u on u.id = pr.userId left join WorkoutRecord wr on wr.punchRecordId = pr.id left join WorkoutEntry we on we.workoutRecordId = wr.id where pr.dayKey = strftime('%Y-%m-%d', 'now', 'localtime') group by pr.id order by u.username;"
```

Expected after saving treadmill + chest + shoulder + abs: one row for the manually tested username contains `both|60`, `cardio:treadmill`, `strength:chest`, `strength:shoulder`, and `strength:abs`.

## Self-Review

- Spec coverage: the plan covers workout replacement, snapshot prefill, `PATCH` API, editable modal, heatmap entry point, non-duplicate rewards, and manual acceptance.
- Placeholder scan: the plan contains concrete paths, code blocks, commands, and expected results for each implementation task.
- Type consistency: the plan uses `WorkoutTicketPayload`, `currentUserTodayWorkout`, `replaceWorkoutForPunch`, `mapWorkoutRecordToTicketPayload`, and `updateTodayWorkout` consistently across helper, API, snapshot, and UI layers.
