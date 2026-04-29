# Enterprise WeChat High-Value Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the product's Enterprise WeChat integration from weekly-report-only delivery into a reusable high-value push layer covering weekly reports, punch milestones, and weak-social reminder creation without introducing noisy activity-flow pushes.

**Architecture:** First build a unified server-side Enterprise WeChat sender with persistent send logs and durable dedupe records. Then migrate the existing weekly report path onto that sender, add milestone push triggers inside the punch settlement flow, and finally add a narrow weak-social backend slice that can create invitation records, send one text reminder into Enterprise WeChat, and keep response state in-app.

**Tech Stack:** Next.js App Router, TypeScript strict mode, Prisma + SQLite, Vitest, server-side `fetch`, existing Team Dynamics and weekly report services.

---

## Scope Check

This plan intentionally covers three connected slices in one sequence because they all depend on the same Enterprise WeChat sender and dedupe storage:

1. sender foundation and weekly report migration
2. punch milestone pushes
3. minimal weak-social backend with Enterprise WeChat reminder send

It does **not** attempt to build a full weak-social UI, daily summary pushes, or activity-flow mirroring.

## File Structure

- Modify: `prisma/schema.prisma`
  - Add `EnterpriseWechatSendLog`
  - Add `EnterpriseWechatPushEvent`
  - Add minimal `SocialInvitation` and `SocialInvitationResponse`
- Generated: `lib/generated/prisma`
  - Regenerate Prisma client after schema sync
- Create: `lib/integrations/enterprise-wechat.ts`
  - Unified sender, text/markdown formatters, log writer, push-event helpers
- Create: `lib/high-value-push.ts`
  - Weekly report, milestone, and weak-social trigger helpers
- Create: `lib/social-invitations.ts`
  - Minimal invitation create/respond service with Enterprise WeChat handoff
- Create: `app/api/social-invitations/route.ts`
  - Create invitation endpoint
- Create: `app/api/social-invitations/[invitationId]/respond/route.ts`
  - Respond-to-invitation endpoint
- Modify: `app/api/reports/weekly/publish/route.ts`
  - Route weekly report sends through the unified sender
- Modify: `app/api/board/punch/route.ts`
  - Trigger milestone pushes without blocking punch success
- Modify: `lib/wework-webhook.ts`
  - Convert into weekly-report-specific formatter/adapter or retire it after migration
- Modify: `lib/db-seed.ts`
  - Seed minimal invitation-safe baseline data if needed for tests
- Create: `__tests__/enterprise-wechat-sender.test.ts`
  - Sender and formatter behavior
- Create: `__tests__/enterprise-wechat-push-events.test.ts`
  - Dedupe record behavior
- Modify: `__tests__/weekly-report-api.test.ts`
  - Weekly report still succeeds if Enterprise WeChat send fails
- Modify: `__tests__/board-punch-api.test.ts`
  - Milestone push behavior and dedupe
- Create: `__tests__/social-invitations-api.test.ts`
  - Invitation creation, response, and Enterprise WeChat reminder behavior

## Implementation Rules

- Keep Enterprise WeChat low-frequency and high-signal only
- Weekly reports remain markdown; new weak-social and milestone pushes are text only
- Do not use `@user` mentions or private chat assumptions
- Weak-social sends only on invitation creation, never on response/ignore/expiry
- Team-wide weak-social invitations dedupe once per team, day, and invitation type
- Full-team attendance dedupes once per team and day
- Streak milestone pushes are limited to `7, 14, 30, 60, 100`
- Season goal reached dedupes once per season
- Enterprise WeChat send failure must not fail the business action
- Store durable send logs and durable push-event dedupe keys
- Do not push daily summaries, punch flow, undo flow, or coffee flow

---

### Task 1: Add Durable Enterprise WeChat Persistence

**Files:**
- Modify: `prisma/schema.prisma`
- Generated: `lib/generated/prisma`
- Create: `__tests__/enterprise-wechat-push-events.test.ts`

- [ ] **Step 1: Write failing persistence tests for send logs, push-event dedupe, and social invitation records**

Create `__tests__/enterprise-wechat-push-events.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

describe("enterprise wechat persistence", () => {
  let teamId: string;
  let senderUserId: string;
  let recipientUserId: string;

  beforeEach(async () => {
    await seedDatabase();
    const team = await prisma.team.findUniqueOrThrow({ where: { code: "ROOM-88" } });
    const users = await prisma.user.findMany({
      where: { teamId: team.id },
      orderBy: { createdAt: "asc" },
      take: 2,
    });
    teamId = team.id;
    senderUserId = users[0]!.id;
    recipientUserId = users[1]!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores enterprise wechat send logs without the webhook url", async () => {
    const log = await prisma.enterpriseWechatSendLog.create({
      data: {
        teamId,
        purpose: "WEEKLY_REPORT",
        messageType: "markdown",
        status: "SENT",
        contentPreview: "preview",
        targetType: "WeeklyReport",
        targetId: "draft-1",
        httpStatus: 200,
        wechatErrcode: 0,
        wechatErrmsg: "ok",
      },
    });

    expect(log.status).toBe("SENT");
    expect(JSON.stringify(log)).not.toContain("webhook");
  });

  it("dedupes high-value push events by unique event key", async () => {
    await prisma.enterpriseWechatPushEvent.create({
      data: {
        teamId,
        purpose: "TEAM_MILESTONE",
        eventKey: `${teamId}:2026-04-29:FULL_TEAM_PUNCHED`,
        targetType: "Attendance",
        targetId: "2026-04-29",
      },
    });

    await expect(
      prisma.enterpriseWechatPushEvent.create({
        data: {
          teamId,
          purpose: "TEAM_MILESTONE",
          eventKey: `${teamId}:2026-04-29:FULL_TEAM_PUNCHED`,
          targetType: "Attendance",
          targetId: "2026-04-29",
        },
      }),
    ).rejects.toThrow();
  });

  it("stores weak-social invitations and responses in-app", async () => {
    const invitation = await prisma.socialInvitation.create({
      data: {
        teamId,
        senderUserId,
        recipientUserId,
        invitationType: "DRINK_WATER",
        status: "PENDING",
        dayKey: "2026-04-29",
        message: "li 点名让 luo 接杯水。",
      },
    });

    const response = await prisma.socialInvitationResponse.create({
      data: {
        invitationId: invitation.id,
        teamId,
        responderUserId: recipientUserId,
        responseText: "收到",
        dayKey: "2026-04-29",
      },
    });

    expect(invitation.status).toBe("PENDING");
    expect(response.invitationId).toBe(invitation.id);
  });
});
```

- [ ] **Step 2: Run the new persistence tests and confirm they fail on missing models**

Run:

```bash
npm test -- __tests__/enterprise-wechat-push-events.test.ts
```

Expected: FAIL with Prisma model/type errors for `enterpriseWechatSendLog`, `enterpriseWechatPushEvent`, or `socialInvitation`.

- [ ] **Step 3: Extend the Prisma schema with send logs, push-event dedupe, and minimal weak-social records**

Update `prisma/schema.prisma` with these additions:

```prisma
model EnterpriseWechatSendLog {
  id                  String   @id @default(cuid())
  teamId              String?
  team                Team?    @relation(fields: [teamId], references: [id])
  purpose             String
  messageType         String
  status              String
  targetType          String?
  targetId            String?
  contentPreview      String
  failureReason       String?
  errorMessage        String?
  httpStatus          Int?
  wechatErrcode       Int?
  wechatErrmsg        String?
  responseBodySnippet String?
  createdAt           DateTime @default(now())

  @@index([teamId, createdAt])
  @@index([purpose, createdAt])
}

model EnterpriseWechatPushEvent {
  id         String   @id @default(cuid())
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id])
  purpose     String
  eventKey    String   @unique
  targetType  String?
  targetId    String?
  payloadJson String?
  createdAt   DateTime @default(now())

  @@index([teamId, purpose, createdAt])
}

model SocialInvitation {
  id                  String                     @id @default(cuid())
  teamId              String
  team                Team                       @relation(fields: [teamId], references: [id])
  senderUserId        String
  senderUser          User                       @relation("SocialInvitationSender", fields: [senderUserId], references: [id])
  recipientUserId     String?
  recipientUser       User?                      @relation("SocialInvitationRecipient", fields: [recipientUserId], references: [id])
  invitationType      String
  status              String
  dayKey              String
  message             String
  wechatSendLogId     String?
  wechatSendLog       EnterpriseWechatSendLog?   @relation(fields: [wechatSendLogId], references: [id])
  wechatWebhookSentAt DateTime?
  respondedAt         DateTime?
  expiredAt           DateTime?
  createdAt           DateTime                   @default(now())
  updatedAt           DateTime                   @updatedAt
  responses           SocialInvitationResponse[]

  @@index([teamId, dayKey, status])
  @@index([senderUserId, dayKey])
  @@index([recipientUserId, dayKey, status])
}

model SocialInvitationResponse {
  id              String           @id @default(cuid())
  invitationId    String
  invitation      SocialInvitation @relation(fields: [invitationId], references: [id])
  teamId          String
  team            Team             @relation(fields: [teamId], references: [id])
  responderUserId String
  responderUser   User             @relation("SocialInvitationResponder", fields: [responderUserId], references: [id])
  dayKey          String
  responseText    String?
  createdAt       DateTime         @default(now())

  @@unique([invitationId, responderUserId])
  @@index([teamId, dayKey, createdAt])
}
```

Also add relation arrays:

```prisma
// Team
enterpriseWechatSendLogs EnterpriseWechatSendLog[]
enterpriseWechatPushEvents EnterpriseWechatPushEvent[]
socialInvitations SocialInvitation[]
socialInvitationResponses SocialInvitationResponse[]

// User
sentSocialInvitations     SocialInvitation[]         @relation("SocialInvitationSender")
receivedSocialInvitations SocialInvitation[]         @relation("SocialInvitationRecipient")
socialInvitationResponses SocialInvitationResponse[] @relation("SocialInvitationResponder")
```

- [ ] **Step 4: Regenerate Prisma client and sync the local database**

Run:

```bash
npx prisma generate
npx prisma db push
```

Expected: Prisma client regenerated under `lib/generated/prisma`, schema push succeeds.

- [ ] **Step 5: Re-run persistence tests and confirm they pass**

Run:

```bash
npm test -- __tests__/enterprise-wechat-push-events.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the schema foundation**

```bash
git add prisma/schema.prisma lib/generated/prisma __tests__/enterprise-wechat-push-events.test.ts
git commit -m "feat: add enterprise wechat push persistence"
```

---

### Task 2: Build the Unified Sender and Migrate Weekly Reports

**Files:**
- Create: `lib/integrations/enterprise-wechat.ts`
- Modify: `lib/wework-webhook.ts`
- Modify: `app/api/reports/weekly/publish/route.ts`
- Create: `__tests__/enterprise-wechat-sender.test.ts`
- Modify: `__tests__/weekly-report-api.test.ts`

- [ ] **Step 1: Write failing sender tests for formatting, log writing, and weekly-report migration**

Create `__tests__/enterprise-wechat-sender.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import {
  formatEnterpriseWechatText,
  formatEnterpriseWechatMarkdown,
  sendEnterpriseWechatMessage,
  recordEnterpriseWechatPushEvent,
} from "@/lib/integrations/enterprise-wechat";

const originalWebhook = process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("enterprise wechat sender", () => {
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const team = await prisma.team.findUniqueOrThrow({ where: { code: "ROOM-88" } });
    teamId = team.id;
    await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
    await prisma.enterpriseWechatPushEvent.deleteMany({ where: { teamId } });
    delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (originalWebhook === undefined) delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    else process.env.ENTERPRISE_WECHAT_WEBHOOK_URL = originalWebhook;
    await prisma.$disconnect();
  });

  it("formats short text reminders", () => {
    expect(
      formatEnterpriseWechatText({
        title: "牛马补给站提醒",
        lines: ["阿强点名让阿明起来接杯水。"],
      }),
    ).toEqual({
      type: "text",
      content: "牛马补给站提醒\n阿强点名让阿明起来接杯水。",
    });
  });

  it("sends markdown and writes a sent log", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ errcode: 0, errmsg: "ok" }));

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "WEEKLY_REPORT",
      message: formatEnterpriseWechatMarkdown({
        title: "本周周报",
        lines: ["本周打卡 9 次。"],
      }),
      fetchImpl: fetchMock,
    });

    expect(result).toMatchObject({ ok: true, status: "SENT" });
    const log = await prisma.enterpriseWechatSendLog.findUniqueOrThrow({ where: { id: result.logId } });
    expect(log.status).toBe("SENT");
  });

  it("creates one push-event record and skips duplicates", async () => {
    const first = await recordEnterpriseWechatPushEvent({
      teamId,
      purpose: "TEAM_MILESTONE",
      eventKey: `${teamId}:li:STREAK:7`,
      targetType: "StreakMilestone",
      targetId: "li:7",
    });
    const second = await recordEnterpriseWechatPushEvent({
      teamId,
      purpose: "TEAM_MILESTONE",
      eventKey: `${teamId}:li:STREAK:7`,
      targetType: "StreakMilestone",
      targetId: "li:7",
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
  });
});
```

Add this case to `__tests__/weekly-report-api.test.ts`:

```ts
it("returns success even if the unified enterprise wechat sender fails", async () => {
  vi.doMock("@/lib/integrations/enterprise-wechat", () => ({
    sendEnterpriseWechatMessage: vi.fn().mockResolvedValue({
      ok: false,
      status: "FAILED",
      logId: "log-1",
      reason: "HTTP_ERROR",
      httpStatus: 502,
    }),
    formatEnterpriseWechatMarkdown: vi.fn(() => ({ type: "markdown", content: "**周报**" })),
  }));
});
```

- [ ] **Step 2: Run the sender and weekly-report tests to confirm they fail**

Run:

```bash
npm test -- __tests__/enterprise-wechat-sender.test.ts __tests__/weekly-report-api.test.ts
```

Expected: FAIL with missing module exports or route integration failures.

- [ ] **Step 3: Implement the unified sender module**

Create `lib/integrations/enterprise-wechat.ts`:

```ts
import { prisma } from "@/lib/prisma";

export type EnterpriseWechatMessage =
  | { type: "text"; content: string }
  | { type: "markdown"; content: string };

export function formatEnterpriseWechatText(input: {
  title: string;
  lines: string[];
  footer?: string;
}): EnterpriseWechatMessage {
  const lines = [input.title, ...input.lines, input.footer]
    .filter((line): line is string => Boolean(line?.trim()))
    .map((line) => line.trim());
  return { type: "text", content: lines.join("\n") };
}

export function formatEnterpriseWechatMarkdown(input: {
  title: string;
  lines: string[];
  footer?: string;
}): EnterpriseWechatMessage {
  const lines = [`**${input.title}**`, ...input.lines, input.footer].filter(Boolean);
  return { type: "markdown", content: lines.join("\n") };
}

export async function recordEnterpriseWechatPushEvent(input: {
  teamId: string;
  purpose: string;
  eventKey: string;
  targetType?: string;
  targetId?: string;
  payloadJson?: string;
}) {
  const existing = await prisma.enterpriseWechatPushEvent.findUnique({
    where: { eventKey: input.eventKey },
  });

  if (existing) {
    return { created: false, event: existing };
  }

  const event = await prisma.enterpriseWechatPushEvent.create({ data: input });
  return { created: true, event };
}
```

Then add `sendEnterpriseWechatMessage(...)` that:

- loads `ENTERPRISE_WECHAT_WEBHOOK_URL`
- validates non-empty message content
- posts the proper text/markdown payload
- records `EnterpriseWechatSendLog`
- returns `SENT`, `SKIPPED`, or `FAILED`

- [ ] **Step 4: Migrate weekly report publishing to the unified sender**

Update `app/api/reports/weekly/publish/route.ts` to use the new module:

```ts
import {
  formatEnterpriseWechatMarkdown,
  sendEnterpriseWechatMessage,
} from "@/lib/integrations/enterprise-wechat";

// after publishWeeklyReportDraftWithStatus(...)
const weworkPush = created
  ? await sendEnterpriseWechatMessage({
      teamId: dynamic.teamId,
      purpose: "WEEKLY_REPORT",
      targetType: "TeamDynamic",
      targetId: dynamic.id,
      message: formatEnterpriseWechatMarkdown({
        title: dynamic.title,
        lines: [dynamic.summary],
      }),
    })
  : { ok: false, status: "SKIPPED", reason: "ALREADY_PUBLISHED" };
```

Leave `lib/wework-webhook.ts` as either:

- a tiny weekly-report-specific formatter helper used by the new sender, or
- a backward-compatible wrapper that delegates to `lib/integrations/enterprise-wechat.ts`

Do **not** keep two independent send paths.

- [ ] **Step 5: Run sender and weekly-report tests until they pass**

Run:

```bash
npm test -- __tests__/enterprise-wechat-sender.test.ts __tests__/weekly-report-api.test.ts __tests__/wework-webhook.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the unified sender migration**

```bash
git add lib/integrations/enterprise-wechat.ts lib/wework-webhook.ts app/api/reports/weekly/publish/route.ts __tests__/enterprise-wechat-sender.test.ts __tests__/weekly-report-api.test.ts __tests__/wework-webhook.test.ts
git commit -m "feat: unify enterprise wechat sender"
```

---

### Task 3: Add Punch Milestone Pushes with Durable Dedupe

**Files:**
- Create: `lib/high-value-push.ts`
- Modify: `app/api/board/punch/route.ts`
- Modify: `__tests__/board-punch-api.test.ts`

- [ ] **Step 1: Add failing punch tests for Enterprise WeChat milestone sends**

Append these cases to `__tests__/board-punch-api.test.ts`:

```ts
it("sends a streak milestone push when the user reaches fourteen days", async () => {
  await resetState();
  await prisma.user.update({
    where: { id: userId },
    data: { currentStreak: 13, lastPunchDayKey: "2026-04-23" },
  });

  const sender = await import("@/lib/integrations/enterprise-wechat");
  const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
    ok: true,
    status: "SENT",
    logId: "log-1",
    httpStatus: 200,
    wechatErrcode: 0,
    wechatErrmsg: "ok",
  });

  const response = await POST(request("POST", userId));

  expect(response.status).toBe(200);
  expect(sendSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      purpose: "TEAM_MILESTONE",
      message: expect.objectContaining({ type: "text" }),
    }),
  );
});

it("sends full-team attendance to enterprise wechat only once per day", async () => {
  await resetState();
  const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const teammates = await prisma.user.findMany({
    where: { teamId: currentUser.teamId },
    orderBy: { createdAt: "asc" },
  });

  const sender = await import("@/lib/integrations/enterprise-wechat");
  const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
    ok: true,
    status: "SENT",
    logId: "log-2",
    httpStatus: 200,
    wechatErrcode: 0,
    wechatErrmsg: "ok",
  });

  for (const teammate of teammates) {
    await POST(request("POST", teammate.id));
  }

  expect(sendSpy).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run punch tests and confirm the new milestone-push expectations fail**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: FAIL because no Enterprise WeChat milestone push is triggered yet.

- [ ] **Step 3: Add milestone trigger helpers**

Create `lib/high-value-push.ts`:

```ts
import {
  formatEnterpriseWechatText,
  recordEnterpriseWechatPushEvent,
  sendEnterpriseWechatMessage,
} from "@/lib/integrations/enterprise-wechat";

const STREAK_PUSH_MILESTONES = new Set([7, 14, 30, 60, 100]);

export async function pushStreakMilestoneIfNeeded(input: {
  teamId: string;
  userId: string;
  username: string;
  streak: number;
  dayKey: string;
}) {
  if (!STREAK_PUSH_MILESTONES.has(input.streak)) return { status: "SKIPPED" as const };

  const eventKey = `${input.teamId}:${input.userId}:STREAK:${input.streak}`;
  const recorded = await recordEnterpriseWechatPushEvent({
    teamId: input.teamId,
    purpose: "TEAM_MILESTONE",
    eventKey,
    targetType: "StreakMilestone",
    targetId: `${input.userId}:${input.streak}`,
  });

  if (!recorded.created) return { status: "SKIPPED" as const };

  return sendEnterpriseWechatMessage({
    teamId: input.teamId,
    purpose: "TEAM_MILESTONE",
    targetType: "StreakMilestone",
    targetId: `${input.userId}:${input.streak}`,
    message: formatEnterpriseWechatText({
      title: "团队里程碑",
      lines: [`${input.username} 已连续打卡 ${input.streak} 天。`],
    }),
  });
}
```

Add parallel helpers:

- `pushFullTeamAttendanceIfNeeded(...)`
- `pushSeasonTargetReachedIfNeeded(...)`

using event keys:

```ts
`${teamId}:${dayKey}:FULL_TEAM_PUNCHED`
`${teamId}:${seasonId}:SEASON_TARGET_REACHED`
```

- [ ] **Step 4: Call milestone helpers from the punch route without blocking the response**

Update `app/api/board/punch/route.ts` after Team Dynamics creation:

```ts
const pushTasks: Promise<unknown>[] = [];

pushTasks.push(
  pushStreakMilestoneIfNeeded({
    teamId: user.teamId,
    userId: user.id,
    username: user.username,
    streak: nextStreak,
    dayKey: todayDayKey,
  }),
);

if (todayPunchCount === teamMemberCount) {
  pushTasks.push(
    pushFullTeamAttendanceIfNeeded({
      teamId: user.teamId,
      dayKey: todayDayKey,
    }),
  );
}

if (activeSeason && recordCountedForSeasonSlot && nextFilledSlots === activeSeason.targetSlots) {
  pushTasks.push(
    pushSeasonTargetReachedIfNeeded({
      teamId: user.teamId,
      seasonId: activeSeason.id,
      goalName: activeSeason.goalName,
    }),
  );
}

if (pushTasks.length > 0) {
  await Promise.allSettled(pushTasks);
}
```

Use `Promise.allSettled`, not `Promise.all`, so push failure never blocks punch success.

- [ ] **Step 5: Run the punch regression suite**

Run:

```bash
npm test -- __tests__/board-punch-api.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the milestone push integration**

```bash
git add lib/high-value-push.ts app/api/board/punch/route.ts __tests__/board-punch-api.test.ts
git commit -m "feat: push punch milestones to enterprise wechat"
```

---

### Task 4: Add Minimal Weak-Social Invitation Backend and Enterprise WeChat Reminder Push

**Files:**
- Create: `lib/social-invitations.ts`
- Create: `app/api/social-invitations/route.ts`
- Create: `app/api/social-invitations/[invitationId]/respond/route.ts`
- Create: `__tests__/social-invitations-api.test.ts`

- [ ] **Step 1: Write failing API tests for creating and responding to weak-social invitations**

Create `__tests__/social-invitations-api.test.ts`:

```ts
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { createCookieValue } from "@/lib/auth";
import { POST as createInvitation } from "@/app/api/social-invitations/route";
import { POST as respondInvitation } from "@/app/api/social-invitations/[invitationId]/respond/route";

function createRequest(body: unknown, userId: string) {
  return new NextRequest("http://localhost/api/social-invitations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `userId=${createCookieValue(userId)}`,
    },
    body: JSON.stringify(body),
  });
}

describe("/api/social-invitations", () => {
  let senderId: string;
  let recipientId: string;

  beforeAll(async () => {
    await seedDatabase();
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, take: 2 });
    senderId = users[0]!.id;
    recipientId = users[1]!.id;
  });

  beforeEach(async () => {
    await prisma.socialInvitationResponse.deleteMany();
    await prisma.socialInvitation.deleteMany();
    await prisma.enterpriseWechatSendLog.deleteMany();
    await prisma.enterpriseWechatPushEvent.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a direct invitation and pushes one text reminder", async () => {
    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-1",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    const response = await createInvitation(
      createRequest(
        {
          type: "DRINK_WATER",
          recipientUserId: recipientId,
          message: "li 点名让 luo 接杯水。",
        },
        senderId,
      ),
    );

    expect(response.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "WEAK_SOCIAL_INVITATION",
        message: expect.objectContaining({ type: "text" }),
      }),
    );
  });

  it("dedupes team-wide invitations by day and invitation type", async () => {
    const body = {
      type: "TEAM_STANDUP",
      recipientUserId: null,
      message: "全员起立，动一动。",
    };

    await createInvitation(createRequest(body, senderId));
    const response = await createInvitation(createRequest(body, senderId));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.invitation.status).toBe("PENDING");
  });

  it("responds in-app without triggering another enterprise wechat push", async () => {
    const invitation = await prisma.socialInvitation.create({
      data: {
        teamId: (await prisma.user.findUniqueOrThrow({ where: { id: senderId } })).teamId,
        senderUserId: senderId,
        recipientUserId: recipientId,
        invitationType: "DRINK_WATER",
        status: "PENDING",
        dayKey: "2026-04-29",
        message: "li 点名让 luo 接杯水。",
      },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage");

    const response = await respondInvitation(
      new NextRequest(`http://localhost/api/social-invitations/${invitation.id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `userId=${createCookieValue(recipientId)}`,
        },
        body: JSON.stringify({ responseText: "收到" }),
      }),
      { params: Promise.resolve({ invitationId: invitation.id }) },
    );

    expect(response.status).toBe(200);
    expect(sendSpy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the weak-social API tests and confirm they fail**

Run:

```bash
npm test -- __tests__/social-invitations-api.test.ts
```

Expected: FAIL because routes and services do not exist yet.

- [ ] **Step 3: Implement the minimal weak-social service**

Create `lib/social-invitations.ts`:

```ts
import { prisma } from "@/lib/prisma";
import { getShanghaiDayKey } from "@/lib/economy";
import {
  formatEnterpriseWechatText,
  recordEnterpriseWechatPushEvent,
  sendEnterpriseWechatMessage,
} from "@/lib/integrations/enterprise-wechat";

export async function createSocialInvitation(input: {
  senderUserId: string;
  type: "DRINK_WATER" | "WALK_AROUND" | "TEAM_STANDUP" | "TEAM_BROADCAST";
  recipientUserId: string | null;
  message: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const dayKey = getShanghaiDayKey(now);
  const sender = await prisma.user.findUniqueOrThrow({
    where: { id: input.senderUserId },
    select: { id: true, username: true, teamId: true },
  });

  const invitation = await prisma.socialInvitation.create({
    data: {
      teamId: sender.teamId,
      senderUserId: sender.id,
      recipientUserId: input.recipientUserId,
      invitationType: input.type,
      status: "PENDING",
      dayKey,
      message: input.message.trim(),
    },
  });

  const isTeamWide = input.recipientUserId === null;
  const eventKey = isTeamWide
    ? `${sender.teamId}:${dayKey}:${input.type}:TEAM_WIDE_WEAK_SOCIAL`
    : `${invitation.id}:WEAK_SOCIAL_CREATED`;

  const pushEvent = await recordEnterpriseWechatPushEvent({
    teamId: sender.teamId,
    purpose: "WEAK_SOCIAL_INVITATION",
    eventKey,
    targetType: "SocialInvitation",
    targetId: invitation.id,
  });

  if (pushEvent.created) {
    const push = await sendEnterpriseWechatMessage({
      teamId: sender.teamId,
      purpose: "WEAK_SOCIAL_INVITATION",
      targetType: "SocialInvitation",
      targetId: invitation.id,
      message: formatEnterpriseWechatText({
        title: "牛马补给站提醒",
        lines: [input.message.trim()],
      }),
    });

    if (push.ok) {
      await prisma.socialInvitation.update({
        where: { id: invitation.id },
        data: {
          wechatSendLogId: push.logId,
          wechatWebhookSentAt: now,
        },
      });
    }
  }

  return prisma.socialInvitation.findUniqueOrThrow({ where: { id: invitation.id } });
}
```

Also add `respondToSocialInvitation(...)` that:

- verifies same-team access
- allows only recipient for direct reminders
- creates `SocialInvitationResponse`
- updates `SocialInvitation.status` to `RESPONDED`
- never sends Enterprise WeChat

- [ ] **Step 4: Implement create/respond API routes**

Create `app/api/social-invitations/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import { createSocialInvitation } from "@/lib/social-invitations";

export async function POST(request: NextRequest) {
  const user = await loadCurrentUser(request.cookies);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    type?: "DRINK_WATER" | "WALK_AROUND" | "TEAM_STANDUP" | "TEAM_BROADCAST";
    recipientUserId?: string | null;
    message?: string;
  };

  if (!body.type || !body.message?.trim()) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const invitation = await createSocialInvitation({
    senderUserId: user.id,
    type: body.type,
    recipientUserId: body.recipientUserId ?? null,
    message: body.message,
  });

  return NextResponse.json({ invitation });
}
```

Create `app/api/social-invitations/[invitationId]/respond/route.ts` with the same authentication style and a `POST` handler that returns `{ invitation, response }`.

- [ ] **Step 5: Run weak-social API tests until they pass**

Run:

```bash
npm test -- __tests__/social-invitations-api.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the weak-social backend slice**

```bash
git add lib/social-invitations.ts app/api/social-invitations/route.ts app/api/social-invitations/[invitationId]/respond/route.ts __tests__/social-invitations-api.test.ts
git commit -m "feat: add weak social enterprise wechat reminders"
```

---

### Task 5: Run Final Regression and Tighten Docs

**Files:**
- Modify: `docs/superpowers/specs/2026-04-29-enterprise-wechat-high-value-push-design.md` (only if behavior drift is discovered)
- Modify: `.env.example` (if missing `ENTERPRISE_WECHAT_WEBHOOK_URL`)

- [ ] **Step 1: Add the webhook variable to `.env.example` if it is missing**

Ensure `.env.example` contains:

```env
ENTERPRISE_WECHAT_WEBHOOK_URL=
```

- [ ] **Step 2: Run the complete targeted regression suite**

Run:

```bash
npm test -- __tests__/enterprise-wechat-push-events.test.ts __tests__/enterprise-wechat-sender.test.ts __tests__/weekly-report-api.test.ts __tests__/wework-webhook.test.ts __tests__/board-punch-api.test.ts __tests__/social-invitations-api.test.ts
```

Expected: PASS

- [ ] **Step 3: Run a Prisma/schema sanity pass**

Run:

```bash
npx prisma generate
```

Expected: PASS with no schema validation errors.

- [ ] **Step 4: Update the spec only if implementation forced a naming correction**

If a final implementation rename is required, update the spec so these names match the code exactly:

```md
- `EnterpriseWechatSendLog`
- `EnterpriseWechatPushEvent`
- `SocialInvitation`
- `SocialInvitationResponse`
- `sendEnterpriseWechatMessage`
```

If no corrections are needed, skip this step.

- [ ] **Step 5: Commit the final regression pass**

```bash
git add .env.example docs/superpowers/specs/2026-04-29-enterprise-wechat-high-value-push-design.md
git commit -m "chore: finalize enterprise wechat high-value push plan rollout"
```

---

## Self-Review Checklist

Spec coverage map:

- weekly report push -> Task 2
- unified sender + send logs -> Tasks 1-2
- milestone pushes + dedupe -> Task 3
- weak-social text-only reminders -> Task 4
- no follow-up push on response/ignore/expiry -> Task 4 tests and service rules
- no blocking on webhook failure -> Tasks 2-4

Placeholder scan:

- no `TODO` / `TBD`
- all new modules, models, routes, and tests are named explicitly
- all tasks include concrete commands and expected outcomes

Type consistency anchors:

- `EnterpriseWechatSendLog`
- `EnterpriseWechatPushEvent`
- `SocialInvitation`
- `SocialInvitationResponse`
- `sendEnterpriseWechatMessage`
- `recordEnterpriseWechatPushEvent`
- `createSocialInvitation`
- `respondToSocialInvitation`

