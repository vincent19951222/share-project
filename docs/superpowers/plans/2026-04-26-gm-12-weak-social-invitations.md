# GM-12 Weak Social Invitations V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable weak social items to create same-day social invitations, send Enterprise WeChat reminders, collect in-app responses, and show active social state in `牛马补给站`.

**Architecture:** Add a focused `lib/gamification/social-invitations.ts` service that owns social item validation, inventory consumption, `ItemUseRecord` creation, invitation creation, Enterprise WeChat sending, response creation, and lazy expiry. Reuse GM-08 `POST /api/gamification/items/use` for item activation, add `POST /api/gamification/social/respond` for responses, and extend `GET /api/gamification/state` plus `SupplyStation` to show and act on social invitations.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom, React 19, GM-11 Enterprise WeChat sender.

---

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `SocialInvitationResponse` and response relations.
- Generated: `lib/generated/prisma`
  - Regenerate Prisma client after schema sync.
- Create: `lib/gamification/social-invitations.ts`
  - Social invitation creation, validation, Enterprise WeChat send, response, snapshot, and expiry helpers.
- Modify: `lib/gamification/item-use.ts`
  - Replace GM-08 unsupported `social_invitation` branch with social invitation service integration.
- Modify: `app/api/gamification/items/use/route.ts`
  - Parse `recipientUserId` and social `message` target fields.
- Create: `app/api/gamification/social/respond/route.ts`
  - Authenticated response endpoint.
- Modify: `lib/types.ts`
  - Upgrade `GamificationSocialSummary` and add invitation/response/recipient snapshot types.
- Modify: `lib/gamification/state.ts`
  - Return active social invitation state and lazy-expire old pending invitations.
- Modify: `lib/api.ts`
  - Add social item target fields to `useGamificationItem` and add `respondToSocialInvitation`.
- Modify: `components/gamification/SupplyStation.tsx`
  - Social invitation lists, recipient picker for social items, response buttons.
- Create: `__tests__/gamification-social-invitations.test.ts`
  - Service-level invitation, send, expiry, response, and no-economy tests.
- Modify: `__tests__/gamification-item-use-api.test.ts`
  - API coverage for social item use.
- Create: `__tests__/gamification-social-respond-api.test.ts`
  - Response route coverage.
- Modify: `__tests__/gamification-state-api.test.ts`
  - Active social summary coverage.
- Modify: `__tests__/supply-station-shell.test.tsx`
  - Social UI coverage.

## Implementation Rules

- Only `ItemDefinition.effect.type = "social_invitation"` enters GM-12.
- Social items consume inventory immediately.
- Social item use creates `ItemUseRecord.status = "SETTLED"`.
- Social item use creates `SocialInvitation.status = "PENDING"`.
- Enterprise WeChat send happens after local transaction succeeds.
- Enterprise WeChat failure does not roll back inventory, item use, or invitation.
- Direct invitations require `recipientUserId`, same team, and not self.
- Team-wide invitations use `recipientUserId = null`.
- Direct invitations can be responded to only by the recipient.
- Team-wide invitations can be responded to by same-team non-sender users.
- One user can respond to the same invitation at most once.
- Responses do not grant coins, tickets, season income, season slots, or task completion.
- GM-12 does not write Team Dynamics or weekly report output.

---

### Task 1: Add Failing Social Invitation Service Tests

**Files:**
- Create: `__tests__/gamification-social-invitations.test.ts`

- [ ] **Step 1: Write service tests**

Create `__tests__/gamification-social-invitations.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import {
  createSocialInvitationFromItem,
  expirePastSocialInvitations,
  respondToSocialInvitation,
  SocialInvitationError,
} from "@/lib/gamification/social-invitations";
import { prisma } from "@/lib/prisma";

function wechatOk() {
  return new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("gamification social invitations", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let senderId: string;
  let recipientId: string;
  let thirdUserId: string;
  let teamId: string;
  let dayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const sender = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const recipient = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    const third = await prisma.user.findUniqueOrThrow({ where: { username: "liu" } });
    senderId = sender.id;
    recipientId = recipient.id;
    thirdUserId = third.id;
    teamId = sender.teamId;
    dayKey = getShanghaiDayKey(fixedNow);

    await prisma.socialInvitationResponse.deleteMany({ where: { teamId } });
    await prisma.socialInvitation.deleteMany({ where: { teamId } });
    await prisma.itemUseRecord.deleteMany({ where: { teamId } });
    await prisma.inventoryItem.deleteMany({ where: { teamId } });
    await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
    await prisma.user.updateMany({ where: { teamId }, data: { coins: 10, ticketBalance: 0 } });
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";
  });

  afterAll(async () => {
    vi.useRealTimers();
    delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    await prisma.$disconnect();
  });

  it("creates a direct invitation, consumes inventory, settles item use, and records wechat send", async () => {
    const fetchMock = vi.fn().mockResolvedValue(wechatOk());
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });

    const result = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "drink_water_ping",
      target: { recipientUserId: recipientId, message: "喝白白，别把自己腌入味" },
      fetchImpl: fetchMock,
    });

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: senderId, itemId: "drink_water_ping" } },
    });
    const itemUse = await prisma.itemUseRecord.findUniqueOrThrow({
      where: { id: result.itemUse.id },
    });
    const invitation = await prisma.socialInvitation.findUniqueOrThrow({
      where: { id: result.invitation.id },
    });

    expect(inventory.quantity).toBe(0);
    expect(itemUse).toMatchObject({
      itemId: "drink_water_ping",
      status: "SETTLED",
      targetType: "SOCIAL_INVITATION",
      targetId: invitation.id,
    });
    expect(invitation).toMatchObject({
      senderUserId: senderId,
      recipientUserId: recipientId,
      invitationType: "DRINK_WATER",
      status: "PENDING",
      dayKey,
    });
    expect(invitation.wechatWebhookSentAt).toBeInstanceOf(Date);
    expect(result.wechat.status).toBe("SENT");
  });

  it("keeps invitation when enterprise wechat send fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "walk_ping", quantity: 1 },
    });

    const result = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "walk_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: fetchMock,
    });

    const invitation = await prisma.socialInvitation.findUniqueOrThrow({
      where: { id: result.invitation.id },
    });
    const log = await prisma.enterpriseWechatSendLog.findFirstOrThrow({
      where: { targetType: "SocialInvitation", targetId: invitation.id },
    });

    expect(result.wechat.status).toBe("FAILED");
    expect(invitation.wechatWebhookSentAt).toBeNull();
    expect(log.failureReason).toBe("NETWORK_ERROR");
  });

  it("creates a team-wide invitation without recipient", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "team_standup_ping", quantity: 1 },
    });

    const result = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "team_standup_ping",
      target: { message: "全员起立，屁股离线两分钟" },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    expect(result.invitation).toMatchObject({
      invitationType: "TEAM_STANDUP",
      recipientUserId: null,
      status: "PENDING",
    });
  });

  it("rejects direct invitations without a recipient", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });

    await expect(
      createSocialInvitationFromItem({
        userId: senderId,
        itemId: "drink_water_ping",
        target: {},
      }),
    ).rejects.toMatchObject({
      code: "RECIPIENT_REQUIRED",
      status: 400,
    });
  });

  it("rejects self invitations", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "chat_ping", quantity: 1 },
    });

    await expect(
      createSocialInvitationFromItem({
        userId: senderId,
        itemId: "chat_ping",
        target: { recipientUserId: senderId },
      }),
    ).rejects.toBeInstanceOf(SocialInvitationError);
  });

  it("rejects duplicate direct invitation to the same recipient and type in one day", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "share_info_ping", quantity: 2 },
    });
    await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "share_info_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await expect(
      createSocialInvitationFromItem({
        userId: senderId,
        itemId: "share_info_ping",
        target: { recipientUserId: recipientId },
        fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
      }),
    ).rejects.toMatchObject({
      code: "DUPLICATE_DIRECT_INVITATION",
      status: 409,
    });
  });

  it("lets direct recipient respond and does not grant economy rewards", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "drink_water_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    const response = await respondToSocialInvitation({
      userId: recipientId,
      invitationId: created.invitation.id,
      responseText: "已喝水",
    });
    const recipient = await prisma.user.findUniqueOrThrow({ where: { id: recipientId } });

    expect(response).toMatchObject({
      invitationId: created.invitation.id,
      responderUserId: recipientId,
      responseText: "已喝水",
    });
    expect(recipient.coins).toBe(10);
    expect(recipient.ticketBalance).toBe(0);
  });

  it("allows multiple same-team users to respond to a team-wide invitation once each", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "team_standup_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "team_standup_ping",
      target: {},
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await respondToSocialInvitation({ userId: recipientId, invitationId: created.invitation.id });
    await respondToSocialInvitation({ userId: thirdUserId, invitationId: created.invitation.id });

    await expect(
      respondToSocialInvitation({ userId: recipientId, invitationId: created.invitation.id }),
    ).rejects.toMatchObject({
      code: "ALREADY_RESPONDED",
      status: 409,
    });

    const responseCount = await prisma.socialInvitationResponse.count({
      where: { invitationId: created.invitation.id },
    });
    expect(responseCount).toBe(2);
  });

  it("expires old pending invitations", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "walk_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "walk_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    await expirePastSocialInvitations({
      teamId,
      todayDayKey: "2026-04-27",
    });

    const invitation = await prisma.socialInvitation.findUniqueOrThrow({
      where: { id: created.invitation.id },
    });
    expect(invitation.status).toBe("EXPIRED");
    expect(invitation.expiredAt).toBeInstanceOf(Date);
  });
});
```

- [ ] **Step 2: Run service tests to verify failure**

Run:

```bash
npm test -- __tests__/gamification-social-invitations.test.ts
```

Expected: FAIL because `lib/gamification/social-invitations.ts` and `SocialInvitationResponse` do not exist.

---

### Task 2: Add Social Invitation Response Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Generated: `lib/generated/prisma`

- [ ] **Step 1: Add response relations**

In `prisma/schema.prisma`, add:

```prisma
model Team {
  // existing fields
  socialInvitationResponses SocialInvitationResponse[]
}

model User {
  // existing fields
  respondedSocialInvitations SocialInvitationResponse[] @relation("SocialInvitationResponder")
}

model SocialInvitation {
  // existing fields
  responses SocialInvitationResponse[]
}
```

- [ ] **Step 2: Add response model**

Add this model:

```prisma
model SocialInvitationResponse {
  id                 String           @id @default(cuid())
  invitationId       String
  invitation         SocialInvitation @relation(fields: [invitationId], references: [id])
  teamId             String
  team               Team             @relation(fields: [teamId], references: [id])
  responderUserId    String
  responderUser      User             @relation("SocialInvitationResponder", fields: [responderUserId], references: [id])
  dayKey             String
  responseText       String?
  displayPayloadJson String?
  createdAt          DateTime         @default(now())

  @@unique([invitationId, responderUserId])
  @@index([teamId, dayKey, createdAt])
  @@index([responderUserId, dayKey])
}
```

- [ ] **Step 3: Sync Prisma schema**

Run:

```bash
npx prisma db push
npx prisma generate
```

Expected: schema sync succeeds and generated client includes `socialInvitationResponse`.

- [ ] **Step 4: Run service tests again**

Run:

```bash
npm test -- __tests__/gamification-social-invitations.test.ts
```

Expected: FAIL because service code is still missing.

---

### Task 3: Implement Social Invitation Service

**Files:**
- Create: `lib/gamification/social-invitations.ts`
- Test: `__tests__/gamification-social-invitations.test.ts`

- [ ] **Step 1: Create service**

Create `lib/gamification/social-invitations.ts`:

```ts
import { getItemDefinition } from "@/lib/gamification/content";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getShanghaiDayKey } from "@/lib/economy";
import {
  formatEnterpriseWechatText,
  sendEnterpriseWechatMessage,
  type EnterpriseWechatSendResult,
} from "@/lib/integrations/enterprise-wechat";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

type SocialInvitationType =
  | "DRINK_WATER"
  | "WALK_AROUND"
  | "CHAT"
  | "SHARE_INFO"
  | "TEAM_STANDUP"
  | "TEAM_BROADCAST";

type SocialTarget = {
  recipientUserId?: string;
  message?: string;
};

type InvitationRecord = {
  id: string;
  teamId: string;
  senderUserId: string;
  recipientUserId: string | null;
  invitationType: string;
  itemUseRecordId: string;
  status: string;
  dayKey: string;
  message: string;
  wechatWebhookSentAt: Date | null;
  respondedAt: Date | null;
  expiredAt: Date | null;
  rewardSettledAt: Date | null;
  createdAt: Date;
  senderUser?: { username: string } | null;
  recipientUser?: { username: string } | null;
  responses?: { responderUserId: string }[];
};

export class SocialInvitationError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status = 409) {
    super(message);
    this.name = "SocialInvitationError";
    this.code = code;
    this.status = status;
  }
}

function normalizeInvitationType(value: string): SocialInvitationType {
  if (
    value === "DRINK_WATER" ||
    value === "WALK_AROUND" ||
    value === "CHAT" ||
    value === "SHARE_INFO" ||
    value === "TEAM_STANDUP" ||
    value === "TEAM_BROADCAST"
  ) {
    return value;
  }

  throw new SocialInvitationError("这个弱社交类型暂不支持。", "UNSUPPORTED_SOCIAL_INVITATION", 400);
}

function isTeamWideType(type: SocialInvitationType) {
  return type === "TEAM_STANDUP" || type === "TEAM_BROADCAST";
}

function sanitizeMessage(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new SocialInvitationError("消息必须是文本。", "INVALID_MESSAGE", 400);
  }

  const trimmed = value.trim();
  if (trimmed.length > 80) {
    throw new SocialInvitationError("消息最多 80 个字。", "INVALID_MESSAGE", 400);
  }

  return trimmed === "" ? undefined : trimmed;
}

function sanitizeResponseText(value: unknown) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new SocialInvitationError("响应内容必须是文本。", "INVALID_RESPONSE", 400);
  }

  const trimmed = value.trim();
  if (trimmed.length > 80) {
    throw new SocialInvitationError("响应内容最多 80 个字。", "INVALID_RESPONSE", 400);
  }

  return trimmed === "" ? undefined : trimmed;
}

function assertSocialItem(itemId: string) {
  const definition = getItemDefinition(itemId);

  if (
    !definition ||
    !definition.enabled ||
    definition.category !== "social" ||
    definition.useTiming !== "instant" ||
    definition.effect.type !== "social_invitation"
  ) {
    throw new SocialInvitationError("这个补给不能发起弱社交邀请。", "ITEM_NOT_SOCIAL", 400);
  }

  return {
    definition,
    invitationType: normalizeInvitationType(definition.effect.invitationType),
  };
}

function defaultSocialMessage(type: SocialInvitationType) {
  switch (type) {
    case "DRINK_WATER":
      return "今天的尿色 KPI 靠你守住了。";
    case "WALK_AROUND":
      return "站起来走一圈，让工位以为你离职了。";
    case "CHAT":
      return "聊两句，让班味散一散。";
    case "SHARE_INFO":
      return "给脑子补个仓，分享一个今天看到的新东西。";
    case "TEAM_STANDUP":
      return "全员起立，屁股离线两分钟。";
    case "TEAM_BROADCAST":
      return "团队小喇叭开播，今天也要活着下班。";
  }
}

function invitationTitle(type: SocialInvitationType) {
  switch (type) {
    case "DRINK_WATER":
      return "点名喝水令";
    case "WALK_AROUND":
      return "出门溜达令";
    case "CHAT":
      return "今日闲聊令";
    case "SHARE_INFO":
      return "红盘情报令";
    case "TEAM_STANDUP":
      return "全员起立令";
    case "TEAM_BROADCAST":
      return "团队小喇叭";
  }
}

function buildInvitationMessage(input: {
  type: SocialInvitationType;
  senderName: string;
  recipientName?: string;
  customMessage?: string;
}) {
  const action =
    input.recipientName === undefined
      ? `${input.senderName} 发起了${invitationTitle(input.type)}。`
      : `${input.senderName} 使用了${invitationTitle(input.type)}，点名 ${input.recipientName}。`;
  return `${action}\n${input.customMessage ?? defaultSocialMessage(input.type)}`;
}

function buildWechatMessage(input: {
  type: SocialInvitationType;
  senderName: string;
  recipientName?: string;
  message: string;
}) {
  return formatEnterpriseWechatText({
    title: "牛马补给站",
    lines: [input.message],
    footer: "对方可以在牛马补给站响应，也可以选择忽略。",
  });
}

async function consumeInventory(input: { tx: Tx; userId: string; itemId: string }) {
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
    throw new SocialInvitationError("库存不足。", "INSUFFICIENT_INVENTORY");
  }
}

async function assertUseLimits(input: {
  tx: Tx;
  userId: string;
  teamId: string;
  itemId: string;
  dayKey: string;
  maxUsePerUserPerDay?: number;
  maxUsePerTeamPerDay?: number;
}) {
  if (input.maxUsePerUserPerDay !== undefined) {
    const count = await input.tx.itemUseRecord.count({
      where: {
        userId: input.userId,
        itemId: input.itemId,
        dayKey: input.dayKey,
        status: { in: ["PENDING", "SETTLED"] },
      },
    });
    if (count >= input.maxUsePerUserPerDay) {
      throw new SocialInvitationError(
        `这个道具每天最多使用 ${input.maxUsePerUserPerDay} 次。`,
        "USER_DAILY_LIMIT_REACHED",
      );
    }
  }

  if (input.maxUsePerTeamPerDay !== undefined) {
    const count = await input.tx.itemUseRecord.count({
      where: {
        teamId: input.teamId,
        itemId: input.itemId,
        dayKey: input.dayKey,
        status: { in: ["PENDING", "SETTLED"] },
      },
    });
    if (count >= input.maxUsePerTeamPerDay) {
      throw new SocialInvitationError(
        `这个道具每队每天最多使用 ${input.maxUsePerTeamPerDay} 次。`,
        "TEAM_DAILY_LIMIT_REACHED",
      );
    }
  }
}

function buildInvitationSnapshot(record: InvitationRecord) {
  return {
    id: record.id,
    teamId: record.teamId,
    senderUserId: record.senderUserId,
    senderUsername: record.senderUser?.username ?? null,
    recipientUserId: record.recipientUserId,
    recipientUsername: record.recipientUser?.username ?? null,
    invitationType: record.invitationType,
    status: record.status,
    dayKey: record.dayKey,
    message: record.message,
    wechatWebhookSentAt: record.wechatWebhookSentAt?.toISOString() ?? null,
    respondedAt: record.respondedAt?.toISOString() ?? null,
    expiredAt: record.expiredAt?.toISOString() ?? null,
    responseCount: record.responses?.length ?? 0,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function createSocialInvitationFromItem(input: {
  userId: string;
  itemId: string;
  target?: SocialTarget;
  fetchImpl?: typeof fetch;
}) {
  const { definition, invitationType } = assertSocialItem(input.itemId);
  const teamWide = isTeamWideType(invitationType);
  const dayKey = getShanghaiDayKey(new Date());
  const customMessage = sanitizeMessage(input.target?.message);

  const created = await prisma.$transaction(async (tx) => {
    const sender = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { id: true, teamId: true, username: true },
    });

    await assertUseLimits({
      tx,
      userId: sender.id,
      teamId: sender.teamId,
      itemId: definition.id,
      dayKey,
      maxUsePerUserPerDay: definition.maxUsePerUserPerDay,
      maxUsePerTeamPerDay: definition.maxUsePerTeamPerDay,
    });

    let recipient: { id: string; username: string } | null = null;

    if (!teamWide) {
      if (!input.target?.recipientUserId) {
        throw new SocialInvitationError("这个道具需要选择一位同事。", "RECIPIENT_REQUIRED", 400);
      }
      if (input.target.recipientUserId === sender.id) {
        throw new SocialInvitationError("不能点名自己。", "SELF_INVITATION_NOT_ALLOWED", 400);
      }

      recipient = await tx.user.findFirst({
        where: {
          id: input.target.recipientUserId,
          teamId: sender.teamId,
        },
        select: { id: true, username: true },
      });

      if (!recipient) {
        throw new SocialInvitationError("只能点名同队成员。", "RECIPIENT_NOT_FOUND", 404);
      }

      const duplicate = await tx.socialInvitation.findFirst({
        where: {
          senderUserId: sender.id,
          recipientUserId: recipient.id,
          invitationType,
          dayKey,
          status: { in: ["PENDING", "RESPONDED"] },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new SocialInvitationError(
          "今天已经用同类道具点名过这位同事。",
          "DUPLICATE_DIRECT_INVITATION",
        );
      }
    }

    await consumeInventory({ tx, userId: sender.id, itemId: definition.id });

    const itemUse = await tx.itemUseRecord.create({
      data: {
        userId: sender.id,
        teamId: sender.teamId,
        itemId: definition.id,
        dayKey,
        status: "SETTLED",
        targetType: "SOCIAL_INVITATION",
        effectSnapshotJson: JSON.stringify(definition.effect),
        settledAt: new Date(),
      },
    });
    const message = buildInvitationMessage({
      type: invitationType,
      senderName: sender.username,
      recipientName: recipient?.username,
      customMessage,
    });
    const invitation = await tx.socialInvitation.create({
      data: {
        teamId: sender.teamId,
        senderUserId: sender.id,
        recipientUserId: recipient?.id,
        invitationType,
        itemUseRecordId: itemUse.id,
        status: "PENDING",
        dayKey,
        message,
      },
      include: {
        senderUser: { select: { username: true } },
        recipientUser: { select: { username: true } },
        responses: { select: { responderUserId: true } },
      },
    });

    await tx.itemUseRecord.update({
      where: { id: itemUse.id },
      data: { targetId: invitation.id },
    });

    return {
      sender,
      recipient,
      invitation,
      itemUse: { ...itemUse, targetId: invitation.id },
    };
  });

  const wechat = await sendEnterpriseWechatMessage({
    teamId: created.invitation.teamId,
    purpose: "WEAK_SOCIAL_INVITATION",
    targetType: "SocialInvitation",
    targetId: created.invitation.id,
    message: buildWechatMessage({
      type: invitationType,
      senderName: created.sender.username,
      recipientName: created.recipient?.username,
      message: created.invitation.message,
    }),
    fetchImpl: input.fetchImpl,
  });

  let invitation = created.invitation;
  if (wechat.ok) {
    invitation = await prisma.socialInvitation.update({
      where: { id: created.invitation.id },
      data: { wechatWebhookSentAt: new Date() },
      include: {
        senderUser: { select: { username: true } },
        recipientUser: { select: { username: true } },
        responses: { select: { responderUserId: true } },
      },
    });
  }

  return {
    itemUse: {
      id: created.itemUse.id,
      itemId: created.itemUse.itemId,
      status: "SETTLED",
      targetType: "SOCIAL_INVITATION",
      targetId: invitation.id,
      inventoryConsumed: true,
      message: "点名已发出，对方可以选择响应或忽略。",
    },
    invitation: buildInvitationSnapshot(invitation),
    wechat,
  };
}

export async function expirePastSocialInvitations(input: {
  teamId: string;
  todayDayKey: string;
}) {
  return prisma.socialInvitation.updateMany({
    where: {
      teamId: input.teamId,
      dayKey: { lt: input.todayDayKey },
      status: "PENDING",
    },
    data: {
      status: "EXPIRED",
      expiredAt: new Date(),
    },
  });
}

export async function respondToSocialInvitation(input: {
  userId: string;
  invitationId: string;
  responseText?: unknown;
}) {
  const responseText = sanitizeResponseText(input.responseText);
  const todayDayKey = getShanghaiDayKey(new Date());

  return prisma.$transaction(async (tx) => {
    const responder = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { id: true, teamId: true, username: true },
    });
    const invitation = await tx.socialInvitation.findFirst({
      where: {
        id: input.invitationId,
        teamId: responder.teamId,
      },
      include: {
        responses: {
          where: { responderUserId: responder.id },
          select: { id: true },
        },
      },
    });

    if (!invitation) {
      throw new SocialInvitationError("没有找到这条邀请。", "INVITATION_NOT_FOUND", 404);
    }
    if (invitation.dayKey !== todayDayKey) {
      throw new SocialInvitationError("这条邀请已经过期。", "INVITATION_EXPIRED");
    }
    if (invitation.status === "EXPIRED" || invitation.status === "CANCELLED") {
      throw new SocialInvitationError("这条邀请已经不能响应。", "INVITATION_CLOSED");
    }
    if (invitation.senderUserId === responder.id) {
      throw new SocialInvitationError("不能响应自己发起的邀请。", "SELF_RESPONSE_NOT_ALLOWED", 400);
    }
    if (invitation.recipientUserId && invitation.recipientUserId !== responder.id) {
      throw new SocialInvitationError("只有被点名的人可以响应。", "NOT_INVITATION_RECIPIENT", 403);
    }
    if (invitation.responses.length > 0) {
      throw new SocialInvitationError("你已经响应过这条邀请。", "ALREADY_RESPONDED");
    }

    const response = await tx.socialInvitationResponse.create({
      data: {
        invitationId: invitation.id,
        teamId: invitation.teamId,
        responderUserId: responder.id,
        dayKey: invitation.dayKey,
        responseText,
        displayPayloadJson: JSON.stringify({
          invitationType: invitation.invitationType,
          responderUsername: responder.username,
          responseText: responseText ?? null,
        }),
      },
    });

    await tx.socialInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "RESPONDED",
        respondedAt: invitation.respondedAt ?? new Date(),
        rewardSettledAt: invitation.rewardSettledAt ?? new Date(),
      },
    });

    return {
      id: response.id,
      invitationId: response.invitationId,
      responderUserId: response.responderUserId,
      responseText: response.responseText,
      status: "RESPONDED",
      createdAt: response.createdAt.toISOString(),
    };
  });
}
```

- [ ] **Step 2: Run service tests**

Run:

```bash
npm test -- __tests__/gamification-social-invitations.test.ts
```

Expected: PASS.

---

### Task 4: Integrate Social Items Into Item Use API

**Files:**
- Modify: `lib/gamification/item-use.ts`
- Modify: `app/api/gamification/items/use/route.ts`
- Modify: `lib/api.ts`
- Modify: `__tests__/gamification-item-use-api.test.ts`

- [ ] **Step 1: Add social item use API tests**

In `__tests__/gamification-item-use-api.test.ts`, add:

```ts
it("uses a direct social item and returns a social invitation", async () => {
  const recipient = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
  await prisma.inventoryItem.create({
    data: { userId, teamId, itemId: "drink_water_ping", quantity: 1 },
  });

  const response = await POST(
    request(userId, {
      itemId: "drink_water_ping",
      target: { recipientUserId: recipient.id, message: "喝白白，别把自己腌入味" },
    }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.itemUse).toMatchObject({
    itemId: "drink_water_ping",
    status: "SETTLED",
    targetType: "SOCIAL_INVITATION",
    inventoryConsumed: true,
  });
  expect(body.socialInvitation).toMatchObject({
    recipientUserId: recipient.id,
    invitationType: "DRINK_WATER",
    status: "PENDING",
  });
});

it("rejects direct social item without recipient", async () => {
  await prisma.inventoryItem.create({
    data: { userId, teamId, itemId: "drink_water_ping", quantity: 1 },
  });

  const response = await POST(request(userId, { itemId: "drink_water_ping" }));
  const body = await response.json();

  expect(response.status).toBe(400);
  expect(body.error).toContain("需要选择");
});

it("uses a team-wide social item without recipient", async () => {
  await prisma.inventoryItem.create({
    data: { userId, teamId, itemId: "team_standup_ping", quantity: 1 },
  });

  const response = await POST(
    request(userId, {
      itemId: "team_standup_ping",
      target: { message: "全员起立，屁股离线两分钟" },
    }),
  );
  const body = await response.json();

  expect(response.status).toBe(200);
  expect(body.socialInvitation).toMatchObject({
    recipientUserId: null,
    invitationType: "TEAM_STANDUP",
  });
});
```

- [ ] **Step 2: Update item-use service imports**

In `lib/gamification/item-use.ts`, import:

```ts
import {
  createSocialInvitationFromItem,
  SocialInvitationError,
} from "@/lib/gamification/social-invitations";
```

- [ ] **Step 3: Extend use target type**

In `lib/gamification/item-use.ts`, extend the target type used by `useInventoryItem`:

```ts
target?: {
  dimensionKey?: "movement" | "hydration" | "social" | "learning";
  recipientUserId?: string;
  message?: string;
};
```

- [ ] **Step 4: Add social branch**

In the `useInventoryItem` effect switch, before the unsupported-effect branch, add:

```ts
if (definition.effect.type === "social_invitation") {
  try {
    return await createSocialInvitationFromItem({
      userId: input.userId,
      itemId: definition.id,
      target: {
        recipientUserId: input.target?.recipientUserId,
        message: input.target?.message,
      },
    });
  } catch (error) {
    if (error instanceof SocialInvitationError) {
      throw new ItemUseError(error.message, error.status);
    }
    throw error;
  }
}
```

Delete `social_invitation` from the GM-08 unsupported effect list.

- [ ] **Step 5: Update item use API target parsing**

In `app/api/gamification/items/use/route.ts`, change the payload type to:

```ts
const payload = (await request.json().catch(() => null)) as {
  itemId?: unknown;
  target?: {
    dimensionKey?: unknown;
    recipientUserId?: unknown;
    message?: unknown;
  };
} | null;
```

Add:

```ts
const recipientUserId =
  typeof payload.target?.recipientUserId === "string" && payload.target.recipientUserId.trim().length > 0
    ? payload.target.recipientUserId.trim()
    : undefined;
const message =
  typeof payload.target?.message === "string" && payload.target.message.trim().length > 0
    ? payload.target.message.trim()
    : undefined;
```

Pass:

```ts
target:
  dimensionKey || recipientUserId || message
    ? { dimensionKey, recipientUserId, message }
    : undefined,
```

Include social invitation in the response when present:

```ts
return NextResponse.json({
  snapshot,
  itemUse: result.itemUse,
  socialInvitation: "invitation" in result ? result.invitation : undefined,
  wechat: "wechat" in result ? result.wechat : undefined,
});
```

- [ ] **Step 6: Update client API helper**

In `lib/api.ts`, update the request payload type for `useGamificationItem`:

```ts
export async function useGamificationItem(input: {
  itemId: string;
  target?: {
    dimensionKey?: "movement" | "hydration" | "social" | "learning";
    recipientUserId?: string;
    message?: string;
  };
}) {
  // keep existing fetch implementation, but send the wider target object
}
```

- [ ] **Step 7: Run item use API tests**

Run:

```bash
npm test -- __tests__/gamification-item-use-api.test.ts
```

Expected: PASS.

---

### Task 5: Add Social Respond API

**Files:**
- Create: `app/api/gamification/social/respond/route.ts`
- Create: `__tests__/gamification-social-respond-api.test.ts`
- Modify: `lib/api.ts`

- [ ] **Step 1: Write respond API tests**

Create `__tests__/gamification-social-respond-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/social/respond/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { createSocialInvitationFromItem } from "@/lib/gamification/social-invitations";
import { prisma } from "@/lib/prisma";

function request(userId: string | null, body: unknown) {
  return new NextRequest("http://localhost/api/gamification/social/respond", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

function wechatOk() {
  return new Response(JSON.stringify({ errcode: 0, errmsg: "ok" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/gamification/social/respond", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let senderId: string;
  let recipientId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    const sender = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const recipient = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    senderId = sender.id;
    recipientId = recipient.id;
    teamId = sender.teamId;
    await prisma.socialInvitationResponse.deleteMany({ where: { teamId } });
    await prisma.socialInvitation.deleteMany({ where: { teamId } });
    await prisma.itemUseRecord.deleteMany({ where: { teamId } });
    await prisma.inventoryItem.deleteMany({ where: { teamId } });
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";
  });

  afterAll(async () => {
    vi.useRealTimers();
    delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request(null, { invitationId: "x" }));
    expect(response.status).toBe(401);
  });

  it("responds to a direct invitation", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "drink_water_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    const response = await POST(
      request(recipientId, {
        invitationId: created.invitation.id,
        responseText: "已喝水",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.response).toMatchObject({
      invitationId: created.invitation.id,
      status: "RESPONDED",
      responseText: "已喝水",
    });
    expect(body.snapshot.social.received[0].status).toBe("RESPONDED");
  });

  it("rejects duplicate response", async () => {
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "drink_water_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "drink_water_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });
    await POST(request(recipientId, { invitationId: created.invitation.id }));

    const duplicate = await POST(request(recipientId, { invitationId: created.invitation.id }));

    expect(duplicate.status).toBe(409);
  });

  it("rejects non-recipient response to direct invitation", async () => {
    const other = await prisma.user.findUniqueOrThrow({ where: { username: "liu" } });
    await prisma.inventoryItem.create({
      data: { userId: senderId, teamId, itemId: "walk_ping", quantity: 1 },
    });
    const created = await createSocialInvitationFromItem({
      userId: senderId,
      itemId: "walk_ping",
      target: { recipientUserId: recipientId },
      fetchImpl: vi.fn().mockResolvedValue(wechatOk()),
    });

    const response = await POST(request(other.id, { invitationId: created.invitation.id }));

    expect(response.status).toBe(403);
  });
});
```

- [ ] **Step 2: Create route**

Create `app/api/gamification/social/respond/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import {
  respondToSocialInvitation,
  SocialInvitationError,
} from "@/lib/gamification/social-invitations";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as {
      invitationId?: unknown;
      responseText?: unknown;
    } | null;

    if (!payload || typeof payload.invitationId !== "string" || payload.invitationId.length === 0) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    const response = await respondToSocialInvitation({
      userId,
      invitationId: payload.invitationId,
      responseText: payload.responseText,
    });
    const snapshot = await buildGamificationStateForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "状态刷新失败" }, { status: 500 });
    }

    return NextResponse.json({ response, snapshot });
  } catch (error) {
    if (error instanceof SocialInvitationError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }

    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Add client helper**

In `lib/api.ts`, add:

```ts
export async function respondToSocialInvitation(input: {
  invitationId: string;
  responseText?: string;
}) {
  const response = await fetch("/api/gamification/social/respond", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload = await readJsonPayload(response, "响应解析失败");

  if (!response.ok) {
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "请求失败",
      response.status,
    );
  }

  return payload as {
    response: {
      id: string;
      invitationId: string;
      status: "RESPONDED";
      responseText: string | null;
    };
    snapshot: GamificationStateSnapshot;
  };
}
```

- [ ] **Step 4: Run respond API tests**

Run:

```bash
npm test -- __tests__/gamification-social-respond-api.test.ts
```

Expected: PASS.

---

### Task 6: Extend Gamification State Social Summary

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/gamification/state.ts`
- Modify: `__tests__/gamification-state-api.test.ts`

- [ ] **Step 1: Add social snapshot types**

In `lib/types.ts`, replace placeholder social summary with:

```ts
export interface SocialRecipientSnapshot {
  userId: string;
  username: string;
  avatarKey: string;
}

export interface SocialInvitationSnapshot {
  id: string;
  senderUserId: string;
  senderUsername: string | null;
  recipientUserId: string | null;
  recipientUsername: string | null;
  invitationType: string;
  status: "PENDING" | "RESPONDED" | "EXPIRED" | "CANCELLED";
  dayKey: string;
  message: string;
  responseCount: number;
  wechatWebhookSentAt: string | null;
  respondedAt: string | null;
  expiredAt: string | null;
  createdAt: string;
}

export interface SocialInvitationResponseSnapshot {
  id: string;
  invitationId: string;
  invitationType: string;
  responderUserId: string;
  responderUsername: string | null;
  responseText: string | null;
  createdAt: string;
}

export interface GamificationSocialSummary {
  status: "active";
  pendingSentCount: number;
  pendingReceivedCount: number;
  teamWidePendingCount: number;
  sent: SocialInvitationSnapshot[];
  received: SocialInvitationSnapshot[];
  teamWide: SocialInvitationSnapshot[];
  recentResponses: SocialInvitationResponseSnapshot[];
  availableRecipients: SocialRecipientSnapshot[];
  message: string;
}
```

- [ ] **Step 2: Add state API test**

In `__tests__/gamification-state-api.test.ts`, add:

```ts
it("returns active social invitation summary", async () => {
  const recipient = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
  await prisma.inventoryItem.create({
    data: { userId, teamId, itemId: "drink_water_ping", quantity: 1 },
  });
  const itemUse = await prisma.itemUseRecord.create({
    data: {
      userId,
      teamId,
      itemId: "drink_water_ping",
      dayKey: getShanghaiDayKey(),
      status: "SETTLED",
      targetType: "SOCIAL_INVITATION",
      effectSnapshotJson: JSON.stringify({ type: "social_invitation", invitationType: "DRINK_WATER" }),
      settledAt: new Date(),
    },
  });
  const invitation = await prisma.socialInvitation.create({
    data: {
      teamId,
      senderUserId: userId,
      recipientUserId: recipient.id,
      invitationType: "DRINK_WATER",
      itemUseRecordId: itemUse.id,
      status: "PENDING",
      dayKey: getShanghaiDayKey(),
      message: "li 使用了点名喝水令，点名 luo。",
    },
  });
  await prisma.itemUseRecord.update({
    where: { id: itemUse.id },
    data: { targetId: invitation.id },
  });

  const senderResponse = await GET(request(userId));
  const senderBody = await senderResponse.json();
  expect(senderBody.snapshot.social.status).toBe("active");
  expect(senderBody.snapshot.social.sent[0]).toMatchObject({
    id: invitation.id,
    invitationType: "DRINK_WATER",
    status: "PENDING",
  });
  expect(senderBody.snapshot.social.availableRecipients.some((item: { userId: string }) => item.userId === userId)).toBe(false);

  const recipientResponse = await GET(request(recipient.id));
  const recipientBody = await recipientResponse.json();
  expect(recipientBody.snapshot.social.received[0]).toMatchObject({
    id: invitation.id,
    senderUserId: userId,
  });
});
```

- [ ] **Step 3: Add state helpers**

In `lib/gamification/state.ts`, import:

```ts
import { getShanghaiDayKey } from "@/lib/economy";
import { expirePastSocialInvitations } from "@/lib/gamification/social-invitations";
```

Add helper:

```ts
function toSocialInvitationSnapshot(record: {
  id: string;
  senderUserId: string;
  senderUser?: { username: string } | null;
  recipientUserId: string | null;
  recipientUser?: { username: string } | null;
  invitationType: string;
  status: string;
  dayKey: string;
  message: string;
  wechatWebhookSentAt: Date | null;
  respondedAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
  responses: { id: string }[];
}): SocialInvitationSnapshot {
  return {
    id: record.id,
    senderUserId: record.senderUserId,
    senderUsername: record.senderUser?.username ?? null,
    recipientUserId: record.recipientUserId,
    recipientUsername: record.recipientUser?.username ?? null,
    invitationType: record.invitationType,
    status: record.status as SocialInvitationSnapshot["status"],
    dayKey: record.dayKey,
    message: record.message,
    responseCount: record.responses.length,
    wechatWebhookSentAt: record.wechatWebhookSentAt?.toISOString() ?? null,
    respondedAt: record.respondedAt?.toISOString() ?? null,
    expiredAt: record.expiredAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
  };
}
```

Inside `buildGamificationStateForUser`, after loading the user, run:

```ts
const dayKey = getShanghaiDayKey(new Date());
await expirePastSocialInvitations({ teamId: user.teamId, todayDayKey: dayKey });
```

Query social data:

```ts
const [sentInvitations, receivedInvitations, teamWideInvitations, recentResponses, teammates] =
  await Promise.all([
    prisma.socialInvitation.findMany({
      where: { senderUserId: user.id, dayKey },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        senderUser: { select: { username: true } },
        recipientUser: { select: { username: true } },
        responses: { select: { id: true } },
      },
    }),
    prisma.socialInvitation.findMany({
      where: { recipientUserId: user.id, dayKey },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        senderUser: { select: { username: true } },
        recipientUser: { select: { username: true } },
        responses: { select: { id: true } },
      },
    }),
    prisma.socialInvitation.findMany({
      where: {
        teamId: user.teamId,
        recipientUserId: null,
        dayKey,
        senderUserId: { not: user.id },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        senderUser: { select: { username: true } },
        recipientUser: { select: { username: true } },
        responses: { select: { id: true } },
      },
    }),
    prisma.socialInvitationResponse.findMany({
      where: { teamId: user.teamId, dayKey },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        responderUser: { select: { username: true } },
        invitation: { select: { invitationType: true } },
      },
    }),
    prisma.user.findMany({
      where: { teamId: user.teamId, id: { not: user.id } },
      orderBy: { username: "asc" },
      select: { id: true, username: true, avatarKey: true },
    }),
  ]);
```

Replace the old `social` object with:

```ts
social: {
  status: "active",
  pendingSentCount: sentInvitations.filter((item) => item.status === "PENDING").length,
  pendingReceivedCount: receivedInvitations.filter((item) => item.status === "PENDING").length,
  teamWidePendingCount: teamWideInvitations.filter((item) => item.status === "PENDING").length,
  sent: sentInvitations.map(toSocialInvitationSnapshot),
  received: receivedInvitations.map(toSocialInvitationSnapshot),
  teamWide: teamWideInvitations.map(toSocialInvitationSnapshot),
  recentResponses: recentResponses.map((response) => ({
    id: response.id,
    invitationId: response.invitationId,
    invitationType: response.invitation.invitationType,
    responderUserId: response.responderUserId,
    responderUsername: response.responderUser.username,
    responseText: response.responseText,
    createdAt: response.createdAt.toISOString(),
  })),
  availableRecipients: teammates.map((member) => ({
    userId: member.id,
    username: member.username,
    avatarKey: member.avatarKey,
  })),
  message: "点名喝水、出门溜达和全员起立已开放。对方可以响应，也可以选择忽略。",
},
```

- [ ] **Step 4: Run state API tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts
```

Expected: PASS.

---

### Task 7: Add Supply Station Social UI

**Files:**
- Modify: `components/gamification/SupplyStation.tsx`
- Modify: `__tests__/supply-station-shell.test.tsx`

- [ ] **Step 1: Update component fixture tests**

In `__tests__/supply-station-shell.test.tsx`, update the `social` fixture:

```ts
social: {
  status: "active",
  pendingSentCount: 1,
  pendingReceivedCount: 1,
  teamWidePendingCount: 1,
  sent: [
    {
      id: "social-sent-1",
      senderUserId: "user-1",
      senderUsername: "li",
      recipientUserId: "user-2",
      recipientUsername: "luo",
      invitationType: "DRINK_WATER",
      status: "PENDING",
      dayKey: "2026-04-26",
      message: "li 使用了点名喝水令，点名 luo。",
      responseCount: 0,
      wechatWebhookSentAt: null,
      respondedAt: null,
      expiredAt: null,
      createdAt: "2026-04-26T01:00:00.000Z",
    },
  ],
  received: [
    {
      id: "social-received-1",
      senderUserId: "user-2",
      senderUsername: "luo",
      recipientUserId: "user-1",
      recipientUsername: "li",
      invitationType: "WALK_AROUND",
      status: "PENDING",
      dayKey: "2026-04-26",
      message: "luo 使用了出门溜达令，点名 li。",
      responseCount: 0,
      wechatWebhookSentAt: null,
      respondedAt: null,
      expiredAt: null,
      createdAt: "2026-04-26T01:20:00.000Z",
    },
  ],
  teamWide: [
    {
      id: "social-team-1",
      senderUserId: "user-3",
      senderUsername: "liu",
      recipientUserId: null,
      recipientUsername: null,
      invitationType: "TEAM_STANDUP",
      status: "PENDING",
      dayKey: "2026-04-26",
      message: "liu 发起了全员起立令。",
      responseCount: 2,
      wechatWebhookSentAt: null,
      respondedAt: null,
      expiredAt: null,
      createdAt: "2026-04-26T01:30:00.000Z",
    },
  ],
  recentResponses: [
    {
      id: "response-1",
      invitationId: "social-team-1",
      invitationType: "TEAM_STANDUP",
      responderUserId: "user-2",
      responderUsername: "luo",
      responseText: "已起立",
      createdAt: "2026-04-26T01:35:00.000Z",
    },
  ],
  availableRecipients: [
    { userId: "user-2", username: "luo", avatarKey: "male2" },
    { userId: "user-3", username: "liu", avatarKey: "female1" },
  ],
  message: "点名喝水、出门溜达和全员起立已开放。对方可以响应，也可以选择忽略。",
},
```

Add assertions:

```ts
it("renders active social invitations and response actions", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const { SupplyStation } = await import("@/components/gamification/SupplyStation");

  await act(async () => {
    root.render(<SupplyStation />);
  });

  await waitFor(() => expect(container.textContent).toContain("弱社交雷达"));
  expect(container.textContent).toContain("我收到的");
  expect(container.textContent).toContain("全队邀请");
  expect(container.textContent).toContain("luo 使用了出门溜达令");
  expect(container.textContent).toContain("响应");

  root.unmount();
  container.remove();
});
```

- [ ] **Step 2: Update imports**

In `components/gamification/SupplyStation.tsx`, import:

```tsx
import { respondToSocialInvitation, useGamificationItem } from "@/lib/api";
import type {
  GamificationBackpackItemSnapshot,
  SocialInvitationSnapshot,
} from "@/lib/types";
```

- [ ] **Step 3: Add state**

Inside `SupplyStation`, add:

```tsx
const [selectedSocialRecipientId, setSelectedSocialRecipientId] = useState<string>("");
const [socialMessage, setSocialMessage] = useState("");
const [socialBusyId, setSocialBusyId] = useState<string | null>(null);
```

- [ ] **Step 4: Add helpers**

Add local helpers:

```tsx
function isSocialItem(item: GamificationBackpackItemSnapshot | null) {
  return item?.category === "social" && item.useTiming === "instant";
}

function isTeamWideSocialItem(item: GamificationBackpackItemSnapshot | null) {
  return item?.itemId === "team_standup_ping" || item?.itemId === "team_broadcast_coupon";
}
```

Add handlers inside `SupplyStation`:

```tsx
async function handleUseSocialItem(item: GamificationBackpackItemSnapshot) {
  const teamWide = isTeamWideSocialItem(item);
  setSocialBusyId(item.itemId);
  setItemUseMessage(null);

  try {
    const result = await useGamificationItem({
      itemId: item.itemId,
      target: {
        recipientUserId: teamWide ? undefined : selectedSocialRecipientId,
        message: socialMessage.trim() || undefined,
      },
    });
    setSnapshot(result.snapshot);
    setItemUseMessage(result.itemUse.message);
    setSocialMessage("");
  } catch (error) {
    setItemUseMessage(error instanceof ApiError ? error.message : "弱社交道具使用失败，稍后再试。");
  } finally {
    setSocialBusyId(null);
  }
}

async function handleRespondSocialInvitation(invitation: SocialInvitationSnapshot) {
  setSocialBusyId(invitation.id);
  setItemUseMessage(null);

  try {
    const result = await respondToSocialInvitation({ invitationId: invitation.id });
    setSnapshot(result.snapshot);
    setItemUseMessage("已响应，系统不会发银子，但同事会知道你还活着。");
  } catch (error) {
    setItemUseMessage(error instanceof ApiError ? error.message : "响应失败，稍后再试。");
  } finally {
    setSocialBusyId(null);
  }
}
```

- [ ] **Step 5: Add social list component**

Add local component:

```tsx
function SocialInvitationList({
  title,
  items,
  emptyText,
  actionLabel,
  busyId,
  onRespond,
}: {
  title: string;
  items: SocialInvitationSnapshot[];
  emptyText: string;
  actionLabel?: string;
  busyId: string | null;
  onRespond?: (item: SocialInvitationSnapshot) => void;
}) {
  return (
    <section className="rounded-[1.25rem] border-[3px] border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <span className="rounded-full border-2 border-slate-900 bg-yellow-100 px-2 py-1 text-xs font-black">
          {items.length} 条
        </span>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm font-bold text-slate-500">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border-2 border-slate-900 bg-slate-50 p-3">
              <p className="text-sm font-black text-slate-950">{item.message}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                状态：{item.status} · 响应 {item.responseCount}
              </p>
              {onRespond && item.status !== "EXPIRED" && item.status !== "CANCELLED" ? (
                <button
                  type="button"
                  className="quest-btn mt-3 px-3 py-2 text-xs"
                  disabled={busyId === item.id}
                  onClick={() => onRespond(item)}
                >
                  {busyId === item.id ? "处理中..." : actionLabel ?? "响应"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Render social controls**

Near the existing social placeholder section, replace it with:

```tsx
<section className="soft-card p-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 className="text-2xl font-black text-slate-950">弱社交雷达</h2>
      <p className="mt-2 text-sm font-bold text-slate-500">{snapshot.social.message}</p>
    </div>
    <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
      <div className="rounded-[1rem] bg-orange-100 p-3">我发出的 {snapshot.social.pendingSentCount}</div>
      <div className="rounded-[1rem] bg-sky-100 p-3">我收到的 {snapshot.social.pendingReceivedCount}</div>
      <div className="rounded-[1rem] bg-lime-100 p-3">全队 {snapshot.social.teamWidePendingCount}</div>
    </div>
  </div>

  {isSocialItem(selectedBackpackItem) ? (
    <div className="mt-4 rounded-2xl border-2 border-slate-900 bg-yellow-50 p-4">
      <p className="text-sm font-black text-slate-950">使用 {selectedBackpackItem.name}</p>
      {!isTeamWideSocialItem(selectedBackpackItem) ? (
        <select
          className="mt-3 w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm font-bold"
          value={selectedSocialRecipientId}
          onChange={(event) => setSelectedSocialRecipientId(event.target.value)}
        >
          <option value="">选择一位同队牛马</option>
          {snapshot.social.availableRecipients.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.username}
            </option>
          ))}
        </select>
      ) : null}
      <input
        className="mt-3 w-full rounded-xl border-2 border-slate-900 bg-white px-3 py-2 text-sm font-bold"
        value={socialMessage}
        maxLength={80}
        placeholder="可选：加一句不太正经的提醒"
        onChange={(event) => setSocialMessage(event.target.value)}
      />
      <button
        type="button"
        className="quest-btn mt-3 w-full px-4 py-3 text-sm"
        disabled={
          socialBusyId === selectedBackpackItem.itemId ||
          (!isTeamWideSocialItem(selectedBackpackItem) && !selectedSocialRecipientId)
        }
        onClick={() => handleUseSocialItem(selectedBackpackItem)}
      >
        {socialBusyId === selectedBackpackItem.itemId ? "发送中..." : "发起弱社交"}
      </button>
    </div>
  ) : null}

  <div className="mt-5 grid gap-4 lg:grid-cols-3">
    <SocialInvitationList
      title="我收到的"
      items={snapshot.social.received}
      emptyText="暂时没人点名你，工位很安静。"
      busyId={socialBusyId}
      onRespond={handleRespondSocialInvitation}
    />
    <SocialInvitationList
      title="全队邀请"
      items={snapshot.social.teamWide}
      emptyText="今天还没有全队摸鱼广播。"
      busyId={socialBusyId}
      onRespond={handleRespondSocialInvitation}
    />
    <SocialInvitationList
      title="我发出的"
      items={snapshot.social.sent}
      emptyText="还没向同事发出任何虚弱的关怀。"
      busyId={socialBusyId}
    />
  </div>
</section>
```

- [ ] **Step 7: Run UI tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

---

### Task 8: Verification and Commit

**Files:**
- All GM-12 files.

- [ ] **Step 1: Run social invitation service tests**

Run:

```bash
npm test -- __tests__/gamification-social-invitations.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run item use API tests**

Run:

```bash
npm test -- __tests__/gamification-item-use-api.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run social respond API tests**

Run:

```bash
npm test -- __tests__/gamification-social-respond-api.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run state API tests**

Run:

```bash
npm test -- __tests__/gamification-state-api.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run SupplyStation UI tests**

Run:

```bash
npm test -- __tests__/supply-station-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit GM-12**

```bash
git add prisma/schema.prisma lib/generated/prisma lib/types.ts lib/api.ts lib/gamification/state.ts lib/gamification/item-use.ts lib/gamification/social-invitations.ts app/api/gamification/items/use/route.ts app/api/gamification/social/respond/route.ts components/gamification/SupplyStation.tsx __tests__/gamification-social-invitations.test.ts __tests__/gamification-item-use-api.test.ts __tests__/gamification-social-respond-api.test.ts __tests__/gamification-state-api.test.ts __tests__/supply-station-shell.test.tsx
git commit -m "feat: add weak social invitations"
```

## Self-Review Checklist

- Social items are no longer rejected as unsupported item effects.
- Direct social items require a same-team recipient.
- Direct social items cannot target the sender.
- Team-wide social items use `recipientUserId = null`.
- Inventory is consumed exactly once on invitation creation.
- `ItemUseRecord` is `SETTLED` and points to the invitation.
- Enterprise WeChat send failure does not roll back invitation creation.
- Responding creates `SocialInvitationResponse`.
- Direct invitations can only be responded to by the recipient.
- Team-wide invitations can be responded to by multiple same-team non-sender users.
- Duplicate response from the same user is rejected.
- Responses do not grant coins, tickets, or season progress.
- Old pending invitations expire by Shanghai day.
- SupplyStation shows sent, received, team-wide, and recent response data.
- GM-12 does not write Team Dynamics or weekly reports.
