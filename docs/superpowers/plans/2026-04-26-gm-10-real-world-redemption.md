# GM-10 Real-World Redemption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users redeem `瑞幸咖啡券` through an admin-confirmed real-world redemption flow with safe inventory decrement, refund-on-cancel, and visible redemption status.

**Architecture:** Add a focused `lib/gamification/redemptions.ts` service that owns the redemption state machine and inventory mutation. Expose one user request route and two admin routes, then extend the existing gamification state snapshot and `SupplyStation` UI so users see their requests and admins can process pending redemptions.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom, React 19.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Ensure `RealWorldRedemption` supports admin confirmation and cancellation audit.
- Create: `lib/gamification/redemptions.ts`
  - Validate redeemable items, request redemptions, confirm redemptions, cancel redemptions, and build snapshots.
- Modify: `lib/types.ts`
  - Add redemption snapshot types and attach them to `GamificationStateSnapshot`.
- Modify: `lib/gamification/state.ts`
  - Include current user's redemption history and admin pending queue.
- Create: `app/api/gamification/redemptions/request/route.ts`
  - Authenticated user route for requesting a real-world redemption.
- Create: `app/api/admin/gamification/redemptions/confirm/route.ts`
  - Admin route for confirming pending redemptions.
- Create: `app/api/admin/gamification/redemptions/cancel/route.ts`
  - Admin route for cancelling pending redemptions and refunding inventory.
- Modify: `lib/api.ts`
  - Add client helpers for request, confirm, and cancel redemption actions.
- Modify: `components/gamification/SupplyStation.tsx`
  - Add a redemption panel, request button on real-world items, and admin processing controls.
- Create: `__tests__/gamification-redemptions.test.ts`
  - Service-level state machine and concurrency tests.
- Create: `__tests__/gamification-redemption-api.test.ts`
  - Route-level auth, validation, team scope, and refund tests.
- Modify: `__tests__/gamification-state-api.test.ts`
  - Assert redemption snapshots.
- Modify: `__tests__/supply-station-shell.test.tsx`
  - Assert user and admin redemption UI.

## Implementation Rules

- Only `ItemDefinition.effect.type = "real_world_redemption"` can be redeemed through GM-10.
- GM-10 only supports `luckin_coffee_coupon` as real content, but service validation must be generic for future real-world items.
- Requesting redemption decrements `InventoryItem.quantity` before creating `RealWorldRedemption`.
- Inventory decrement must be atomic and require `quantity > 0`.
- Cancelling a `REQUESTED` redemption refunds exactly `1` item.
- Confirming a redemption never refunds inventory.
- `CONFIRMED` and `CANCELLED` are terminal states.
- Admin routes must require `role = "ADMIN"`.
- Admin routes must be scoped to the admin user's `teamId`.
- Do not create `CoffeeRecord`.
- Do not send Enterprise WeChat messages.
- Do not write Team Dynamics events.

---

### Task 1: Add Failing Redemption Service Tests

**Files:**
- Create: `__tests__/gamification-redemptions.test.ts`

- [ ] **Step 1: Write service tests**

Create `__tests__/gamification-redemptions.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import {
  cancelRealWorldRedemption,
  confirmRealWorldRedemption,
  RedemptionServiceError,
  requestRealWorldRedemption,
} from "@/lib/gamification/redemptions";
import { prisma } from "@/lib/prisma";

describe("gamification real-world redemptions", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    teamId = member.teamId;

    await prisma.realWorldRedemption.deleteMany({ where: { teamId } });
    await prisma.inventoryItem.deleteMany({ where: { teamId } });
    await prisma.coffeeRecord.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("requests a Luckin redemption and consumes one inventory item", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 2 },
    });

    const result = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });

    expect(result).toMatchObject({
      itemId: "luckin_coffee_coupon",
      itemName: "瑞幸咖啡券",
      status: "REQUESTED",
      statusLabel: "待管理员确认",
    });
    expect(inventory.quantity).toBe(1);
  });

  it("rejects non-real-world items", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });

    await expect(
      requestRealWorldRedemption({
        userId: memberId,
        teamId,
        itemId: "small_boost_coupon",
      }),
    ).rejects.toMatchObject({
      code: "ITEM_NOT_REDEEMABLE",
      status: 400,
    });
  });

  it("rejects redemption when inventory is unavailable", async () => {
    await expect(
      requestRealWorldRedemption({
        userId: memberId,
        teamId,
        itemId: "luckin_coffee_coupon",
      }),
    ).rejects.toBeInstanceOf(RedemptionServiceError);
  });

  it("allows only one concurrent request for one coupon", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });

    const results = await Promise.allSettled([
      requestRealWorldRedemption({
        userId: memberId,
        teamId,
        itemId: "luckin_coffee_coupon",
      }),
      requestRealWorldRedemption({
        userId: memberId,
        teamId,
        itemId: "luckin_coffee_coupon",
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    const requestedCount = await prisma.realWorldRedemption.count({
      where: { userId: memberId, itemId: "luckin_coffee_coupon", status: "REQUESTED" },
    });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(requestedCount).toBe(1);
    expect(inventory.quantity).toBe(0);
  });

  it("confirms a requested redemption", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requested = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });

    const confirmed = await confirmRealWorldRedemption({
      adminUserId: adminId,
      teamId,
      redemptionId: requested.id,
      note: "已线下发券",
    });

    expect(confirmed).toMatchObject({
      id: requested.id,
      status: "CONFIRMED",
      statusLabel: "已确认兑换",
      confirmedByUsername: "li",
      note: "已线下发券",
    });
  });

  it("cancels a requested redemption and refunds one inventory item", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requested = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });

    const cancelled = await cancelRealWorldRedemption({
      adminUserId: adminId,
      teamId,
      redemptionId: requested.id,
      note: "用户误点，已取消",
    });
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });

    expect(cancelled).toMatchObject({
      id: requested.id,
      status: "CANCELLED",
      statusLabel: "已取消，券已返还",
      cancelledByUsername: "li",
      note: "用户误点，已取消",
    });
    expect(inventory.quantity).toBe(1);
  });

  it("does not cancel a confirmed redemption or refund inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requested = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });
    await confirmRealWorldRedemption({
      adminUserId: adminId,
      teamId,
      redemptionId: requested.id,
    });

    await expect(
      cancelRealWorldRedemption({
        adminUserId: adminId,
        teamId,
        redemptionId: requested.id,
      }),
    ).rejects.toMatchObject({
      code: "REDEMPTION_NOT_REQUESTED",
      status: 409,
    });

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });
    expect(inventory.quantity).toBe(0);
  });

  it("does not create coffee records when redemption is requested or confirmed", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requested = await requestRealWorldRedemption({
      userId: memberId,
      teamId,
      itemId: "luckin_coffee_coupon",
    });
    await confirmRealWorldRedemption({
      adminUserId: adminId,
      teamId,
      redemptionId: requested.id,
    });

    await expect(prisma.coffeeRecord.count({ where: { userId: memberId } })).resolves.toBe(0);
  });
});
```

- [ ] **Step 2: Run service test to verify it fails**

Run:

```bash
npm test -- __tests__/gamification-redemptions.test.ts
```

Expected: FAIL because `lib/gamification/redemptions.ts` and `realWorldRedemption` generated client methods are not ready for GM-10 yet.

---

### Task 2: Extend Redemption Schema Audit Fields

**Files:**
- Modify: `prisma/schema.prisma`
- Generated: `lib/generated/prisma`

- [ ] **Step 1: Update `User` relations**

In `prisma/schema.prisma`, ensure `User` has these relations in addition to earlier GM-02 relations:

```prisma
  realWorldRedemptions       RealWorldRedemption[]
  confirmedRedemptions       RealWorldRedemption[] @relation("RedemptionConfirmer")
  cancelledRedemptions       RealWorldRedemption[] @relation("RedemptionCanceller")
```

- [ ] **Step 2: Update `RealWorldRedemption`**

Ensure `RealWorldRedemption` includes `cancelledByUserId` and `cancelledByUser`:

```prisma
model RealWorldRedemption {
  id                String    @id @default(cuid())
  teamId            String
  team              Team      @relation(fields: [teamId], references: [id])
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  itemId            String
  status            String
  requestedAt       DateTime  @default(now())
  confirmedByUserId String?
  confirmedByUser   User?     @relation("RedemptionConfirmer", fields: [confirmedByUserId], references: [id])
  confirmedAt       DateTime?
  cancelledByUserId String?
  cancelledByUser   User?     @relation("RedemptionCanceller", fields: [cancelledByUserId], references: [id])
  cancelledAt       DateTime?
  note              String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  @@index([teamId, status, requestedAt])
  @@index([userId, status, requestedAt])
}
```

- [ ] **Step 3: Sync Prisma schema**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: schema sync succeeds and generated client includes `realWorldRedemption`.

- [ ] **Step 4: Run database foundation tests**

Run:

```bash
npm test -- __tests__/gamification-db.test.ts
```

Expected: PASS.

---

### Task 3: Implement Redemption Service

**Files:**
- Create: `lib/gamification/redemptions.ts`
- Test: `__tests__/gamification-redemptions.test.ts`

- [ ] **Step 1: Create service file**

Create `lib/gamification/redemptions.ts`:

```ts
import { getItemDefinition } from "@/lib/gamification/content";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  GamificationRedemptionSnapshot,
  RealWorldRedemptionStatus,
} from "@/lib/types";

type DbClient = Prisma.TransactionClient;

type RedemptionRecordForSnapshot = {
  id: string;
  userId: string;
  itemId: string;
  status: string;
  requestedAt: Date;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  note: string | null;
  user?: { username: string } | null;
  confirmedByUser?: { username: string } | null;
  cancelledByUser?: { username: string } | null;
};

export class RedemptionServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "RedemptionServiceError";
    this.code = code;
    this.status = status;
  }
}

function trimOptionalNote(note: unknown): string | undefined {
  if (note === undefined || note === null) {
    return undefined;
  }

  if (typeof note !== "string") {
    throw new RedemptionServiceError("备注必须是文本。", "INVALID_REQUEST", 400);
  }

  const trimmed = note.trim();
  if (trimmed.length > 120) {
    throw new RedemptionServiceError("备注最多 120 个字。", "INVALID_REQUEST", 400);
  }

  return trimmed === "" ? undefined : trimmed;
}

function assertRedeemableItem(itemId: string) {
  const definition = getItemDefinition(itemId);

  if (
    !definition ||
    !definition.enabled ||
    definition.category !== "real_world" ||
    definition.useTiming !== "manual_redemption" ||
    !definition.requiresAdminConfirmation ||
    definition.effect.type !== "real_world_redemption"
  ) {
    throw new RedemptionServiceError("这个补给不能申请线下兑换。", "ITEM_NOT_REDEEMABLE", 400);
  }

  return definition;
}

function getRedemptionStatusLabel(status: string): string {
  switch (status) {
    case "REQUESTED":
      return "待管理员确认";
    case "CONFIRMED":
      return "已确认兑换";
    case "CANCELLED":
      return "已取消，券已返还";
    default:
      return "状态异常";
  }
}

function getRedemptionStatusTone(status: string): GamificationRedemptionSnapshot["statusTone"] {
  switch (status) {
    case "REQUESTED":
      return "warning";
    case "CONFIRMED":
      return "success";
    case "CANCELLED":
      return "muted";
    default:
      return "danger";
  }
}

function normalizeStatus(status: string): RealWorldRedemptionStatus {
  if (status === "REQUESTED" || status === "CONFIRMED" || status === "CANCELLED") {
    return status;
  }

  throw new RedemptionServiceError("兑换状态异常。", "INVALID_REDEMPTION_STATUS", 500);
}

export function buildRedemptionSnapshot(
  record: RedemptionRecordForSnapshot,
): GamificationRedemptionSnapshot {
  const definition = getItemDefinition(record.itemId);
  const effect = definition?.effect.type === "real_world_redemption" ? definition.effect : null;

  return {
    id: record.id,
    userId: record.userId,
    username: record.user?.username ?? null,
    itemId: record.itemId,
    itemName: definition?.name ?? "未知真实福利",
    redemptionType: effect?.redemptionType ?? "unknown",
    status: normalizeStatus(record.status),
    statusLabel: getRedemptionStatusLabel(record.status),
    statusTone: getRedemptionStatusTone(record.status),
    requestedAt: record.requestedAt.toISOString(),
    confirmedAt: record.confirmedAt?.toISOString() ?? null,
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    confirmedByUsername: record.confirmedByUser?.username ?? null,
    cancelledByUsername: record.cancelledByUser?.username ?? null,
    note: record.note,
  };
}

async function decrementInventoryForRequest(input: {
  tx: DbClient;
  userId: string;
  itemId: string;
}) {
  const result = await input.tx.inventoryItem.updateMany({
    where: {
      userId: input.userId,
      itemId: input.itemId,
      quantity: { gt: 0 },
    },
    data: {
      quantity: { decrement: 1 },
    },
  });

  if (result.count !== 1) {
    throw new RedemptionServiceError("背包里没有可兑换的瑞幸券。", "INSUFFICIENT_INVENTORY", 409);
  }
}

async function refundInventory(input: {
  tx: DbClient;
  userId: string;
  teamId: string;
  itemId: string;
}) {
  await input.tx.inventoryItem.upsert({
    where: {
      userId_itemId: {
        userId: input.userId,
        itemId: input.itemId,
      },
    },
    create: {
      userId: input.userId,
      teamId: input.teamId,
      itemId: input.itemId,
      quantity: 1,
    },
    update: {
      quantity: { increment: 1 },
    },
  });
}

export async function requestRealWorldRedemption(input: {
  userId: string;
  teamId: string;
  itemId: string;
}) {
  assertRedeemableItem(input.itemId);

  const record = await prisma.$transaction(async (tx) => {
    await decrementInventoryForRequest({
      tx,
      userId: input.userId,
      itemId: input.itemId,
    });

    return tx.realWorldRedemption.create({
      data: {
        userId: input.userId,
        teamId: input.teamId,
        itemId: input.itemId,
        status: "REQUESTED",
      },
      include: {
        user: { select: { username: true } },
        confirmedByUser: { select: { username: true } },
        cancelledByUser: { select: { username: true } },
      },
    });
  });

  return buildRedemptionSnapshot(record);
}

async function loadRedemptionForConflictMessage(input: {
  tx: DbClient;
  teamId: string;
  redemptionId: string;
}) {
  return input.tx.realWorldRedemption.findFirst({
    where: {
      id: input.redemptionId,
      teamId: input.teamId,
    },
    select: {
      status: true,
    },
  });
}

export async function confirmRealWorldRedemption(input: {
  adminUserId: string;
  teamId: string;
  redemptionId: string;
  note?: unknown;
}) {
  const note = trimOptionalNote(input.note);

  const record = await prisma.$transaction(async (tx) => {
    const updated = await tx.realWorldRedemption.updateMany({
      where: {
        id: input.redemptionId,
        teamId: input.teamId,
        status: "REQUESTED",
      },
      data: {
        status: "CONFIRMED",
        confirmedByUserId: input.adminUserId,
        confirmedAt: new Date(),
        note,
      },
    });

    if (updated.count !== 1) {
      const existing = await loadRedemptionForConflictMessage({
        tx,
        teamId: input.teamId,
        redemptionId: input.redemptionId,
      });
      throw new RedemptionServiceError(
        existing ? "这条兑换已经不处于待确认状态。" : "没有找到这条兑换申请。",
        existing ? "REDEMPTION_NOT_REQUESTED" : "REDEMPTION_NOT_FOUND",
        existing ? 409 : 404,
      );
    }

    return tx.realWorldRedemption.findUniqueOrThrow({
      where: { id: input.redemptionId },
      include: {
        user: { select: { username: true } },
        confirmedByUser: { select: { username: true } },
        cancelledByUser: { select: { username: true } },
      },
    });
  });

  return buildRedemptionSnapshot(record);
}

export async function cancelRealWorldRedemption(input: {
  adminUserId: string;
  teamId: string;
  redemptionId: string;
  note?: unknown;
}) {
  const note = trimOptionalNote(input.note);

  const record = await prisma.$transaction(async (tx) => {
    const existing = await tx.realWorldRedemption.findFirst({
      where: {
        id: input.redemptionId,
        teamId: input.teamId,
      },
      select: {
        id: true,
        userId: true,
        teamId: true,
        itemId: true,
        status: true,
      },
    });

    if (!existing) {
      throw new RedemptionServiceError("没有找到这条兑换申请。", "REDEMPTION_NOT_FOUND", 404);
    }

    const updated = await tx.realWorldRedemption.updateMany({
      where: {
        id: input.redemptionId,
        teamId: input.teamId,
        status: "REQUESTED",
      },
      data: {
        status: "CANCELLED",
        cancelledByUserId: input.adminUserId,
        cancelledAt: new Date(),
        note,
      },
    });

    if (updated.count !== 1) {
      throw new RedemptionServiceError(
        "这条兑换已经不处于待确认状态。",
        "REDEMPTION_NOT_REQUESTED",
        409,
      );
    }

    await refundInventory({
      tx,
      userId: existing.userId,
      teamId: existing.teamId,
      itemId: existing.itemId,
    });

    return tx.realWorldRedemption.findUniqueOrThrow({
      where: { id: input.redemptionId },
      include: {
        user: { select: { username: true } },
        confirmedByUser: { select: { username: true } },
        cancelledByUser: { select: { username: true } },
      },
    });
  });

  return buildRedemptionSnapshot(record);
}
```

- [ ] **Step 2: Run service tests**

Run:

```bash
npm test -- __tests__/gamification-redemptions.test.ts
```

Expected: PASS.

---

### Task 4: Add User Redemption Request API

**Files:**
- Create: `app/api/gamification/redemptions/request/route.ts`
- Create: `__tests__/gamification-redemption-api.test.ts`

- [ ] **Step 1: Write API tests for user request**

Create `__tests__/gamification-redemption-api.test.ts` with the first test group:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as CANCEL } from "@/app/api/admin/gamification/redemptions/cancel/route";
import { POST as CONFIRM } from "@/app/api/admin/gamification/redemptions/confirm/route";
import { POST as REQUEST } from "@/app/api/gamification/redemptions/request/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(method: string, path: string, userId: string | null, body?: unknown) {
  const headers: Record<string, string> = {};

  if (userId) {
    headers.Cookie = `userId=${createCookieValue(userId)}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return new NextRequest(`http://localhost${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("gamification redemption api", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    teamId = member.teamId;

    await prisma.realWorldRedemption.deleteMany({ where: { teamId } });
    await prisma.inventoryItem.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("returns 401 when requesting redemption unauthenticated", async () => {
    const response = await REQUEST(
      request("POST", "/api/gamification/redemptions/request", null, {
        itemId: "luckin_coffee_coupon",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("requests a redemption and consumes inventory", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });

    const response = await REQUEST(
      request("POST", "/api/gamification/redemptions/request", memberId, {
        itemId: "luckin_coffee_coupon",
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.redemption).toMatchObject({
      itemId: "luckin_coffee_coupon",
      itemName: "瑞幸咖啡券",
      status: "REQUESTED",
    });
    expect(body.inventory).toEqual({
      itemId: "luckin_coffee_coupon",
      quantity: 0,
    });
  });

  it("rejects malformed redemption request bodies", async () => {
    const response = await REQUEST(
      new NextRequest("http://localhost/api/gamification/redemptions/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `userId=${createCookieValue(memberId)}`,
        },
        body: "{bad-json",
      }),
    );

    expect(response.status).toBe(400);
  });
});
```

- [ ] **Step 2: Create request route**

Create `app/api/gamification/redemptions/request/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  RedemptionServiceError,
  requestRealWorldRedemption,
} from "@/lib/gamification/redemptions";
import { prisma } from "@/lib/prisma";
import { loadCurrentUser } from "@/lib/session";

function redemptionErrorResponse(error: unknown) {
  if (error instanceof RedemptionServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

async function readBody(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return null;
    }

    return body as { itemId?: unknown };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await readBody(request);
    const itemId = typeof body?.itemId === "string" ? body.itemId : null;

    if (!itemId) {
      return NextResponse.json({ error: "Invalid request body", code: "INVALID_REQUEST" }, { status: 400 });
    }

    const redemption = await requestRealWorldRedemption({
      userId: user.id,
      teamId: user.teamId,
      itemId,
    });
    const inventory = await prisma.inventoryItem.findUnique({
      where: {
        userId_itemId: {
          userId: user.id,
          itemId,
        },
      },
      select: {
        itemId: true,
        quantity: true,
      },
    });

    return NextResponse.json(
      {
        redemption,
        inventory: inventory ?? { itemId, quantity: 0 },
      },
      { status: 201 },
    );
  } catch (error) {
    return redemptionErrorResponse(error);
  }
}
```

- [ ] **Step 3: Run request API tests**

Run:

```bash
npm test -- __tests__/gamification-redemption-api.test.ts
```

Expected: FAIL until admin route imports in the test file are created in the next task, but user request tests should be close to passing.

---

### Task 5: Add Admin Confirm and Cancel APIs

**Files:**
- Create: `app/api/admin/gamification/redemptions/confirm/route.ts`
- Create: `app/api/admin/gamification/redemptions/cancel/route.ts`
- Modify: `__tests__/gamification-redemption-api.test.ts`

- [ ] **Step 1: Add admin API tests**

Append these tests inside `describe("gamification redemption api", ...)`:

```ts
  it("returns 403 when a non-admin confirms a redemption", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requestResponse = await REQUEST(
      request("POST", "/api/gamification/redemptions/request", memberId, {
        itemId: "luckin_coffee_coupon",
      }),
    );
    const body = await requestResponse.json();

    const response = await CONFIRM(
      request("POST", "/api/admin/gamification/redemptions/confirm", memberId, {
        redemptionId: body.redemption.id,
      }),
    );

    expect(response.status).toBe(403);
  });

  it("confirms a requested redemption as admin", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requestResponse = await REQUEST(
      request("POST", "/api/gamification/redemptions/request", memberId, {
        itemId: "luckin_coffee_coupon",
      }),
    );
    const body = await requestResponse.json();

    const response = await CONFIRM(
      request("POST", "/api/admin/gamification/redemptions/confirm", adminId, {
        redemptionId: body.redemption.id,
        note: "已线下发券",
      }),
    );

    expect(response.status).toBe(200);
    const confirmBody = await response.json();
    expect(confirmBody.redemption).toMatchObject({
      id: body.redemption.id,
      status: "CONFIRMED",
      confirmedByUsername: "li",
      note: "已线下发券",
    });
  });

  it("cancels a requested redemption and refunds inventory as admin", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requestResponse = await REQUEST(
      request("POST", "/api/gamification/redemptions/request", memberId, {
        itemId: "luckin_coffee_coupon",
      }),
    );
    const body = await requestResponse.json();

    const response = await CANCEL(
      request("POST", "/api/admin/gamification/redemptions/cancel", adminId, {
        redemptionId: body.redemption.id,
        note: "用户误点",
      }),
    );

    expect(response.status).toBe(200);
    const cancelBody = await response.json();
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });
    expect(cancelBody.redemption).toMatchObject({
      id: body.redemption.id,
      status: "CANCELLED",
      cancelledByUsername: "li",
    });
    expect(inventory.quantity).toBe(1);
  });

  it("does not cancel a confirmed redemption", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });
    const requestResponse = await REQUEST(
      request("POST", "/api/gamification/redemptions/request", memberId, {
        itemId: "luckin_coffee_coupon",
      }),
    );
    const body = await requestResponse.json();
    await CONFIRM(
      request("POST", "/api/admin/gamification/redemptions/confirm", adminId, {
        redemptionId: body.redemption.id,
      }),
    );

    const response = await CANCEL(
      request("POST", "/api/admin/gamification/redemptions/cancel", adminId, {
        redemptionId: body.redemption.id,
      }),
    );

    expect(response.status).toBe(409);
  });
```

- [ ] **Step 2: Create shared admin route helpers in each route**

Use this pattern in both admin routes:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  cancelRealWorldRedemption,
  confirmRealWorldRedemption,
  RedemptionServiceError,
} from "@/lib/gamification/redemptions";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

function redemptionErrorResponse(error: unknown) {
  if (error instanceof RedemptionServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

async function readAdminBody(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return null;
    }

    return body as { redemptionId?: unknown; note?: unknown };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Create confirm route**

Create `app/api/admin/gamification/redemptions/confirm/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  confirmRealWorldRedemption,
  RedemptionServiceError,
} from "@/lib/gamification/redemptions";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

function redemptionErrorResponse(error: unknown) {
  if (error instanceof RedemptionServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

async function readAdminBody(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return null;
    }

    return body as { redemptionId?: unknown; note?: unknown };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await readAdminBody(request);
    const redemptionId = typeof body?.redemptionId === "string" ? body.redemptionId : null;

    if (!redemptionId) {
      return NextResponse.json({ error: "Invalid request body", code: "INVALID_REQUEST" }, { status: 400 });
    }

    const redemption = await confirmRealWorldRedemption({
      adminUserId: user.id,
      teamId: user.teamId,
      redemptionId,
      note: body?.note,
    });

    return NextResponse.json({ redemption });
  } catch (error) {
    return redemptionErrorResponse(error);
  }
}
```

- [ ] **Step 4: Create cancel route**

Create `app/api/admin/gamification/redemptions/cancel/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  cancelRealWorldRedemption,
  RedemptionServiceError,
} from "@/lib/gamification/redemptions";
import { isAdminUser, loadCurrentUser } from "@/lib/session";

function redemptionErrorResponse(error: unknown) {
  if (error instanceof RedemptionServiceError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

async function readAdminBody(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return null;
    }

    return body as { redemptionId?: unknown; note?: unknown };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await loadCurrentUser(request.cookies);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    if (!isAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const body = await readAdminBody(request);
    const redemptionId = typeof body?.redemptionId === "string" ? body.redemptionId : null;

    if (!redemptionId) {
      return NextResponse.json({ error: "Invalid request body", code: "INVALID_REQUEST" }, { status: 400 });
    }

    const redemption = await cancelRealWorldRedemption({
      adminUserId: user.id,
      teamId: user.teamId,
      redemptionId,
      note: body?.note,
    });

    return NextResponse.json({ redemption });
  } catch (error) {
    return redemptionErrorResponse(error);
  }
}
```

- [ ] **Step 5: Run API tests**

Run:

```bash
npm test -- __tests__/gamification-redemption-api.test.ts
```

Expected: PASS.

---

### Task 6: Extend Gamification State With Redemptions

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/gamification/state.ts`
- Modify: `__tests__/gamification-state-api.test.ts`

- [ ] **Step 1: Add redemption types**

In `lib/types.ts`, add:

```ts
export type RealWorldRedemptionStatus = "REQUESTED" | "CONFIRMED" | "CANCELLED";

export interface GamificationRedemptionSnapshot {
  id: string;
  userId: string;
  username: string | null;
  itemId: string;
  itemName: string;
  redemptionType: "luckin_coffee" | "unknown";
  status: RealWorldRedemptionStatus;
  statusLabel: string;
  statusTone: "warning" | "success" | "muted" | "danger";
  requestedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  confirmedByUsername: string | null;
  cancelledByUsername: string | null;
  note: string | null;
}

export interface GamificationRedemptionSectionSnapshot {
  mine: GamificationRedemptionSnapshot[];
  adminQueue: GamificationRedemptionSnapshot[];
}
```

Extend `GamificationStateSnapshot`:

```ts
currentUserRole: string;
redemptions: GamificationRedemptionSectionSnapshot;
```

- [ ] **Step 2: Add state tests**

In `__tests__/gamification-state-api.test.ts`, add a test:

```ts
it("includes current user redemptions and admin pending queue", async () => {
  const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
  await prisma.inventoryItem.create({
    data: {
      userId: member.id,
      teamId,
      itemId: "luckin_coffee_coupon",
      quantity: 1,
    },
  });
  const redemption = await prisma.realWorldRedemption.create({
    data: {
      userId: member.id,
      teamId,
      itemId: "luckin_coffee_coupon",
      status: "REQUESTED",
    },
  });

  const adminResponse = await GET(request(userId));
  const adminBody = await adminResponse.json();
  expect(adminBody.snapshot.currentUserRole).toBe("ADMIN");
  expect(adminBody.snapshot.redemptions.adminQueue).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: redemption.id,
        username: "luo",
        itemName: "瑞幸咖啡券",
        status: "REQUESTED",
      }),
    ]),
  );

  const memberResponse = await GET(request(member.id));
  const memberBody = await memberResponse.json();
  expect(memberBody.snapshot.redemptions.mine).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: redemption.id,
        statusLabel: "待管理员确认",
      }),
    ]),
  );
  expect(memberBody.snapshot.redemptions.adminQueue).toEqual([]);
});
```

- [ ] **Step 3: Extend state aggregation**

In `lib/gamification/state.ts`, import:

```ts
import { buildRedemptionSnapshot } from "@/lib/gamification/redemptions";
```

Ensure the main user query selects `role`:

```ts
select: {
  id: true,
  teamId: true,
  role: true,
  ticketBalance: true,
  // existing selections
}
```

After loading the user and before returning the snapshot, query redemptions:

```ts
const [myRedemptions, adminQueue] = await Promise.all([
  prisma.realWorldRedemption.findMany({
    where: { userId: user.id },
    orderBy: { requestedAt: "desc" },
    take: 10,
    include: {
      user: { select: { username: true } },
      confirmedByUser: { select: { username: true } },
      cancelledByUser: { select: { username: true } },
    },
  }),
  user.role === "ADMIN"
    ? prisma.realWorldRedemption.findMany({
        where: {
          teamId: user.teamId,
          status: "REQUESTED",
        },
        orderBy: { requestedAt: "asc" },
        take: 20,
        include: {
          user: { select: { username: true } },
          confirmedByUser: { select: { username: true } },
          cancelledByUser: { select: { username: true } },
        },
      })
    : Promise.resolve([]),
]);
```

Include this in the returned snapshot:

```ts
currentUserRole: user.role,
redemptions: {
  mine: myRedemptions.map((record) => buildRedemptionSnapshot(record)),
  adminQueue: adminQueue.map((record) => buildRedemptionSnapshot(record)),
},
```

- [ ] **Step 4: Run state tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts
```

Expected: PASS.

---

### Task 7: Add Client Helpers and Supply Station UI

**Files:**
- Modify: `lib/api.ts`
- Modify: `components/gamification/SupplyStation.tsx`
- Modify: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Add API client helpers**

In `lib/api.ts`, import the redemption type:

```ts
import type { GamificationRedemptionSnapshot } from "@/lib/types";
```

Add helpers:

```ts
async function readRedemptionPayload(response: Response): Promise<{
  redemption: GamificationRedemptionSnapshot;
  inventory?: { itemId: string; quantity: number };
}> {
  const payload = await readJsonPayload(response, "响应解析失败");

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload as {
    redemption: GamificationRedemptionSnapshot;
    inventory?: { itemId: string; quantity: number };
  };
}

export async function requestRealWorldRedemption(itemId: string) {
  const response = await fetch("/api/gamification/redemptions/request", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId }),
  });

  return readRedemptionPayload(response);
}

export async function confirmRealWorldRedemption(redemptionId: string) {
  const response = await fetch("/api/admin/gamification/redemptions/confirm", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redemptionId }),
  });

  return readRedemptionPayload(response);
}

export async function cancelRealWorldRedemption(redemptionId: string) {
  const response = await fetch("/api/admin/gamification/redemptions/cancel", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ redemptionId }),
  });

  return readRedemptionPayload(response);
}
```

- [ ] **Step 2: Add UI tests**

In `__tests__/supply-station-shell.test.tsx`, add fixture data to `buildSnapshot()`:

```ts
redemptions: {
  mine: [
    {
      id: "redemption-1",
      userId: "user-1",
      username: "luo",
      itemId: "luckin_coffee_coupon",
      itemName: "瑞幸咖啡券",
      redemptionType: "luckin_coffee",
      status: "REQUESTED",
      statusLabel: "待管理员确认",
      statusTone: "warning",
      requestedAt: "2026-04-26T01:00:00.000Z",
      confirmedAt: null,
      cancelledAt: null,
      confirmedByUsername: null,
      cancelledByUsername: null,
      note: null,
    },
  ],
  adminQueue: [
    {
      id: "redemption-2",
      userId: "user-2",
      username: "liu",
      itemId: "luckin_coffee_coupon",
      itemName: "瑞幸咖啡券",
      redemptionType: "luckin_coffee",
      status: "REQUESTED",
      statusLabel: "待管理员确认",
      statusTone: "warning",
      requestedAt: "2026-04-26T01:30:00.000Z",
      confirmedAt: null,
      cancelledAt: null,
      confirmedByUsername: null,
      cancelledByUsername: null,
      note: null,
    },
  ],
},
```

Add tests:

```ts
it("renders redemption status and admin queue", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const root = createRoot(container);
  const { SupplyStation } = await import("@/components/gamification/SupplyStation");

  await act(async () => {
    root.render(<SupplyStation />);
  });

  await waitFor(() => expect(container.textContent).toContain("我的兑换"));
  expect(container.textContent).toContain("瑞幸咖啡券");
  expect(container.textContent).toContain("待管理员确认");
  expect(container.textContent).toContain("待处理兑换");
  expect(container.textContent).toContain("liu");

  root.unmount();
  container.remove();
});

it("requests redemption from a real-world backpack item", async () => {
  const api = await import("@/lib/api");
  vi.mocked(api.requestRealWorldRedemption).mockResolvedValueOnce({
    redemption: {
      id: "redemption-new",
      userId: "user-1",
      username: "luo",
      itemId: "luckin_coffee_coupon",
      itemName: "瑞幸咖啡券",
      redemptionType: "luckin_coffee",
      status: "REQUESTED",
      statusLabel: "待管理员确认",
      statusTone: "warning",
      requestedAt: "2026-04-26T02:00:00.000Z",
      confirmedAt: null,
      cancelledAt: null,
      confirmedByUsername: null,
      cancelledByUsername: null,
      note: null,
    },
    inventory: { itemId: "luckin_coffee_coupon", quantity: 0 },
  });

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const { SupplyStation } = await import("@/components/gamification/SupplyStation");

  await act(async () => {
    root.render(<SupplyStation />);
  });

  const button = await waitFor(() =>
    Array.from(container.querySelectorAll("button")).find((candidate) =>
      candidate.textContent?.includes("申请兑换"),
    ),
  );
  expect(button).toBeTruthy();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });

  expect(api.requestRealWorldRedemption).toHaveBeenCalledWith("luckin_coffee_coupon");

  root.unmount();
  container.remove();
});
```

Ensure the test mock for `@/lib/api` includes:

```ts
requestRealWorldRedemption: vi.fn(),
confirmRealWorldRedemption: vi.fn(),
cancelRealWorldRedemption: vi.fn(),
```

- [ ] **Step 3: Update SupplyStation imports**

In `components/gamification/SupplyStation.tsx`, import:

```tsx
import {
  cancelRealWorldRedemption,
  confirmRealWorldRedemption,
  requestRealWorldRedemption,
} from "@/lib/api";
import type {
  GamificationBackpackItemSnapshot,
  GamificationRedemptionSnapshot,
} from "@/lib/types";
```

- [ ] **Step 4: Add action state**

Inside `SupplyStation`, add:

```tsx
const [redemptionBusyId, setRedemptionBusyId] = useState<string | null>(null);
const [redemptionMessage, setRedemptionMessage] = useState<string | null>(null);
```

Add a shared reload helper if the component does not already have one:

```tsx
async function reloadSupplyStationState() {
  setSnapshot(await fetchGamificationState());
}
```

- [ ] **Step 5: Add action handlers**

Inside `SupplyStation`, add:

```tsx
async function handleRequestRedemption(item: GamificationBackpackItemSnapshot) {
  setRedemptionBusyId(item.itemId);
  setRedemptionMessage(null);

  try {
    await requestRealWorldRedemption(item.itemId);
    setRedemptionMessage("兑换申请已提交，瑞幸券已从背包扣除。管理员确认前不会自动生成咖啡记录。");
    await reloadSupplyStationState();
  } catch (error) {
    setRedemptionMessage(error instanceof ApiError ? error.message : "兑换申请失败，稍后再试。");
  } finally {
    setRedemptionBusyId(null);
  }
}

async function handleConfirmRedemption(redemption: GamificationRedemptionSnapshot) {
  setRedemptionBusyId(redemption.id);
  setRedemptionMessage(null);

  try {
    await confirmRealWorldRedemption(redemption.id);
    setRedemptionMessage("已确认兑换，请在线下把咖啡债还上。");
    await reloadSupplyStationState();
  } catch (error) {
    setRedemptionMessage(error instanceof ApiError ? error.message : "确认兑换失败，稍后再试。");
  } finally {
    setRedemptionBusyId(null);
  }
}

async function handleCancelRedemption(redemption: GamificationRedemptionSnapshot) {
  setRedemptionBusyId(redemption.id);
  setRedemptionMessage(null);

  try {
    await cancelRealWorldRedemption(redemption.id);
    setRedemptionMessage("已取消兑换，瑞幸券已返还到对方背包。");
    await reloadSupplyStationState();
  } catch (error) {
    setRedemptionMessage(error instanceof ApiError ? error.message : "取消兑换失败，稍后再试。");
  } finally {
    setRedemptionBusyId(null);
  }
}
```

- [ ] **Step 6: Add redemption components**

Add local components near the existing backpack components:

```tsx
function RedemptionList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: GamificationRedemptionSnapshot[];
  emptyText: string;
}) {
  return (
    <section className="soft-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <span className="rounded-full border-2 border-slate-900 bg-white px-2 py-1 text-xs font-black">
          {items.length} 条
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm font-bold text-slate-500">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[3px_3px_0_#0f172a]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {item.username ? `${item.username} · ` : ""}
                    {item.itemName}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    申请时间：{new Date(item.requestedAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <span className="rounded-full border-2 border-slate-900 bg-amber-100 px-2 py-1 text-xs font-black">
                  {item.statusLabel}
                </span>
              </div>
              {item.note ? <p className="mt-2 text-xs font-bold text-slate-600">备注：{item.note}</p> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function AdminRedemptionQueue({
  items,
  busyId,
  onConfirm,
  onCancel,
}: {
  items: GamificationRedemptionSnapshot[];
  busyId: string | null;
  onConfirm: (item: GamificationRedemptionSnapshot) => void;
  onCancel: (item: GamificationRedemptionSnapshot) => void;
}) {
  return (
    <section className="soft-card bg-yellow-50 p-4">
      <h3 className="text-lg font-black text-slate-950">待处理兑换</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm font-bold text-slate-500">暂时没有咖啡债找上门。</p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border-2 border-slate-900 bg-white p-3 shadow-[3px_3px_0_#0f172a]">
              <p className="text-sm font-black text-slate-950">
                {item.username ?? "未知成员"} 申请兑换 {item.itemName}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                申请时间：{new Date(item.requestedAt).toLocaleString("zh-CN")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="quest-btn px-3 py-2 text-xs"
                  disabled={busyId === item.id}
                  onClick={() => onConfirm(item)}
                >
                  确认已兑换
                </button>
                <button
                  type="button"
                  className="rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black shadow-[2px_2px_0_#0f172a] disabled:opacity-60"
                  disabled={busyId === item.id}
                  onClick={() => onCancel(item)}
                >
                  取消并返还
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 7: Add request button to selected real-world item**

In the backpack detail panel, render this button when the selected item is a known real-world redemption item:

```tsx
{selectedBackpackItem?.category === "real_world" && selectedBackpackItem.useTiming === "manual_redemption" ? (
  <button
    type="button"
    className="quest-btn mt-4 w-full px-4 py-3 text-sm"
    disabled={selectedBackpackItem.quantity <= 0 || redemptionBusyId === selectedBackpackItem.itemId}
    onClick={() => handleRequestRedemption(selectedBackpackItem)}
  >
    {redemptionBusyId === selectedBackpackItem.itemId ? "申请中..." : "申请兑换"}
  </button>
) : null}
```

- [ ] **Step 8: Render redemption sections**

Near the backpack section in `SupplyStation`, render:

```tsx
{redemptionMessage ? (
  <div className="rounded-2xl border-2 border-slate-900 bg-emerald-100 px-4 py-3 text-sm font-black text-slate-950">
    {redemptionMessage}
  </div>
) : null}

<RedemptionList
  title="我的兑换"
  items={snapshot.redemptions.mine}
  emptyText="还没有真实福利兑换记录。抽到瑞幸券后可以在背包申请。"
/>

{snapshot.redemptions.adminQueue.length > 0 || snapshot.currentUserRole === "ADMIN" ? (
  <AdminRedemptionQueue
    items={snapshot.redemptions.adminQueue}
    busyId={redemptionBusyId}
    onConfirm={handleConfirmRedemption}
    onCancel={handleCancelRedemption}
  />
) : null}
```

- [ ] **Step 9: Run UI tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

---

### Task 8: Verification and Commit

**Files:**
- All GM-10 files.

- [ ] **Step 1: Run service tests**

Run:

```bash
npm test -- __tests__/gamification-redemptions.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run API tests**

Run:

```bash
npm test -- __tests__/gamification-redemption-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run state tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run UI tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Run lint**

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

- [ ] **Step 7: Commit GM-10**

```bash
git add prisma/schema.prisma lib/generated/prisma lib/types.ts lib/api.ts lib/gamification/state.ts lib/gamification/redemptions.ts app/api/gamification/redemptions/request/route.ts app/api/admin/gamification/redemptions/confirm/route.ts app/api/admin/gamification/redemptions/cancel/route.ts components/gamification/SupplyStation.tsx __tests__/gamification-redemptions.test.ts __tests__/gamification-redemption-api.test.ts __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
git commit -m "feat: add real-world redemption flow"
```

## Self-Review Checklist

- Users can request only configured real-world redemption items.
- Requesting redemption atomically decrements inventory.
- Requested redemption creates one `RealWorldRedemption`.
- Admin confirmation is team-scoped and role-gated.
- Admin cancellation is team-scoped, role-gated, and refunds inventory once.
- Confirmed redemptions cannot be cancelled.
- Cancelled redemptions cannot be confirmed or cancelled again.
- Current user redemption history is visible in `GET /api/gamification/state`.
- Admin pending queue is visible only to admins.
- No `CoffeeRecord` is created.
- No Enterprise WeChat message is sent.
- No Team Dynamics event is written.
