# GM-15 Weekly Report / Report Center Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weekly `牛马补给站` report to Report Center and let admins publish the same snapshot to Team Dynamics, with optional Enterprise WeChat delivery.

**Architecture:** Add a server-side `lib/gamification/weekly-report.ts` service that computes a team-scoped weekly snapshot from GM-04 through GM-13 data. Expose it through read and publish API routes, render it in a new `GamificationWeeklyReportPanel`, and keep publish side effects limited to Team Dynamics plus optional GM-11 Enterprise WeChat sending.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict mode, Prisma + SQLite, Vitest + jsdom, existing Team Dynamics and Enterprise WeChat services.

---

## File Structure

- Create: `lib/gamification/weekly-report.ts`
  - Week normalization, metrics aggregation, highlights, summary copy, TeamDynamic publish helper, and Enterprise WeChat summary builder.
- Create: `app/api/gamification/reports/weekly/route.ts`
  - Authenticated read route for current or requested week.
- Create: `app/api/gamification/reports/weekly/publish/route.ts`
  - Admin-only publish route.
- Modify: `lib/types.ts`
  - Add `GamificationWeeklyReportSnapshot`, metric, card, highlight, and publish response types.
- Modify: `lib/api.ts`
  - Add `fetchGamificationWeeklyReport` and `publishGamificationWeeklyReportRequest`.
- Create: `components/report-center/GamificationWeeklyReportPanel.tsx`
  - Client panel for loading, error, empty, metric cards, highlights, and admin publish actions.
- Modify: `components/report-center/ReportCenter.tsx`
  - Mount the gamification weekly report panel below the existing trend / coffee area.
- Modify: `app/globals.css`
  - Brutalist panel, cards, status, and publish button styles.
- Create: `__tests__/gamification-weekly-report.test.ts`
  - Service-level metrics, date windows, empty state, highlights, and publish idempotency coverage.
- Create: `__tests__/gamification-weekly-report-api.test.ts`
  - GET and publish route coverage.
- Create: `__tests__/gamification-weekly-report-panel.test.tsx`
  - Panel render, loading, error, empty state, admin action, and non-admin visibility coverage.
- Modify: `__tests__/report-center-component.test.tsx`
  - Assert Report Center includes the gamification weekly report panel.

## Implementation Rules

- Do not add Prisma models or migrations.
- Do not mutate any gamification business data when reading or publishing a report.
- Publishing only creates or reuses a `TeamDynamic`; it does not grant coins, tickets, items, streaks, or season contribution.
- Query data only for the current user's team.
- Use Asia/Shanghai week boundaries; Monday starts the week.
- The read route is available to any signed-in team member.
- The publish route is admin-only.
- Repeated publish for the same team and `weekStartDayKey` must reuse the existing TeamDynamic.
- Enterprise WeChat send failure must not roll back TeamDynamic publish.
- If GM-04 through GM-13 tables or services are missing, stop GM-15 implementation and finish dependencies first.

---

### Task 1: Add Weekly Report Service Tests and Types

**Files:**
- Modify: `lib/types.ts`
- Create: `__tests__/gamification-weekly-report.test.ts`
- Create: `lib/gamification/weekly-report.ts`

- [ ] **Step 1: Verify upstream gamification and integration dependencies**

Run:

```bash
test -f lib/gamification/tasks.ts
test -f lib/gamification/lottery.ts
test -f lib/gamification/boost-settlement.ts
test -f lib/gamification/social-invitations.ts
test -f lib/team-dynamics-service.ts
test -f lib/integrations/enterprise-wechat.ts
```

Expected: all commands exit with code `0`. If any command fails, stop GM-15 and finish the missing earlier GM story first.

- [ ] **Step 2: Add shared weekly report types**

Modify `lib/types.ts`:

```ts
export interface GamificationWeeklyReportMetric {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone: "default" | "success" | "warning" | "highlight";
}

export interface GamificationWeeklyReportCard {
  key: string;
  title: string;
  body: string;
  tone: "default" | "success" | "warning" | "highlight";
}

export interface GamificationWeeklyReportHighlight {
  id: string;
  title: string;
  summary: string;
  sourceType: string;
  sourceId: string;
  occurredAt: string;
}

export interface GamificationWeeklyReportMetrics {
  teamMemberCount: number;
  daysInWindow: number;
  expectedTaskCount: number;
  completedTaskCount: number;
  taskCompletionRate: number;
  allFourCompletionDays: number;
  fitnessTicketsEarned: number;
  lifeTicketsEarned: number;
  paidTicketsBought: number;
  ticketsSpent: number;
  netTicketChange: number;
  drawCount: number;
  singleDrawCount: number;
  tenDrawCount: number;
  coinSpent: number;
  coinRewarded: number;
  rareRewardCount: number;
  realWorldRewardCount: number;
  itemUseCount: number;
  boostUseCount: number;
  boostAssetBonusTotal: number;
  boostSeasonBonusTotal: number;
  leaveCouponUseCount: number;
  pendingItemUseCount: number;
  expiredItemUseCount: number;
  socialInvitationCount: number;
  directInvitationCount: number;
  teamInvitationCount: number;
  socialResponseCount: number;
  socialResponseRate: number;
  gameDynamicCount: number;
  rarePrizeDynamicCount: number;
  boostDynamicCount: number;
  socialMomentDynamicCount: number;
}

export interface GamificationWeeklyReportSnapshot {
  teamId: string;
  weekStartDayKey: string;
  weekEndDayKey: string;
  generatedAt: string;
  published: boolean;
  publishedDynamicId: string | null;
  metrics: GamificationWeeklyReportMetrics;
  metricCards: GamificationWeeklyReportMetric[];
  summaryCards: GamificationWeeklyReportCard[];
  highlights: GamificationWeeklyReportHighlight[];
}

export interface GamificationWeeklyReportPublishResult {
  snapshot: GamificationWeeklyReportSnapshot;
  teamDynamic: {
    status: "CREATED" | "EXISTING";
    id: string;
  };
  wechat: {
    status: "NOT_REQUESTED" | "SENT" | "SKIPPED" | "FAILED";
    failureReason?: string;
  };
}
```

- [ ] **Step 3: Write failing service tests**

Create `__tests__/gamification-weekly-report.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import {
  buildGamificationWeeklyReport,
  buildGamificationWeeklyReportMessage,
  normalizeGamificationReportWeek,
  publishGamificationWeeklyReport,
  WeeklyReportError,
} from "@/lib/gamification/weekly-report";
import { prisma } from "@/lib/prisma";

describe("gamification weekly report service", () => {
  const now = new Date("2026-04-26T10:00:00+08:00");
  let teamId: string;
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    userId = member.id;
    teamId = admin.teamId;

    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    await prisma.dailyTaskAssignment.deleteMany({ where: { teamId } });
    await prisma.lotteryTicketLedger.deleteMany({ where: { teamId } });
    await prisma.lotteryDrawResult.deleteMany({ where: { draw: { teamId } } });
    await prisma.lotteryDraw.deleteMany({ where: { teamId } });
    await prisma.itemUseRecord.deleteMany({ where: { teamId } });
    await prisma.punchRecord.deleteMany({ where: { teamId } });
    await prisma.socialInvitationResponse.deleteMany({ where: { teamId } });
    await prisma.socialInvitation.deleteMany({ where: { teamId } });
    await prisma.teamDynamic.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("normalizes Shanghai week boundaries", () => {
    expect(normalizeGamificationReportWeek({ now }).weekStartDayKey).toBe("2026-04-20");
    expect(normalizeGamificationReportWeek({ now }).weekEndDayKey).toBe("2026-04-26");
    expect(
      normalizeGamificationReportWeek({
        now,
        weekStartDayKey: "2026-04-20",
      }),
    ).toMatchObject({
      weekStartDayKey: "2026-04-20",
      weekEndDayKey: "2026-04-26",
      daysInWindow: 7,
    });
    expect(() =>
      normalizeGamificationReportWeek({
        now,
        weekStartDayKey: "2026-04-21",
      }),
    ).toThrow(WeeklyReportError);
  });

  it("returns a safe empty report when the team has no game activity", async () => {
    const snapshot = await buildGamificationWeeklyReport({
      teamId,
      now,
    });

    expect(snapshot).toMatchObject({
      teamId,
      weekStartDayKey: "2026-04-20",
      weekEndDayKey: "2026-04-26",
      published: false,
      publishedDynamicId: null,
    });
    expect(snapshot.metrics.taskCompletionRate).toBe(0);
    expect(snapshot.metrics.drawCount).toBe(0);
    expect(snapshot.metricCards.map((card) => card.value)).toEqual(["0%", "0", "0", "0%"]);
    expect(snapshot.summaryCards[0].body).toContain("补给站还在热机");
  });

  it("aggregates tasks, tickets, lottery, boost, social, and game dynamics", async () => {
    await seedWeeklyGameActivity({ teamId, adminId, userId });

    const snapshot = await buildGamificationWeeklyReport({
      teamId,
      now,
    });

    expect(snapshot.metrics).toMatchObject({
      completedTaskCount: 10,
      allFourCompletionDays: 2,
      fitnessTicketsEarned: 3,
      lifeTicketsEarned: 2,
      paidTicketsBought: 1,
      ticketsSpent: 4,
      netTicketChange: 2,
      drawCount: 2,
      singleDrawCount: 1,
      tenDrawCount: 1,
      coinSpent: 40,
      coinRewarded: 25,
      rareRewardCount: 1,
      realWorldRewardCount: 1,
      itemUseCount: 4,
      boostUseCount: 1,
      boostAssetBonusTotal: 40,
      boostSeasonBonusTotal: 40,
      leaveCouponUseCount: 1,
      socialInvitationCount: 2,
      directInvitationCount: 1,
      teamInvitationCount: 1,
      socialResponseCount: 2,
      socialResponseRate: 100,
      gameDynamicCount: 2,
    });
    expect(snapshot.metricCards.map((card) => card.label)).toEqual([
      "四维完成率",
      "本周发券",
      "抽奖次数",
      "弱社交响应",
    ]);
    expect(snapshot.highlights.map((highlight) => highlight.sourceType)).toContain("team_dynamic");
  });

  it("builds a concise enterprise wechat message from the snapshot", async () => {
    await seedWeeklyGameActivity({ teamId, adminId, userId });
    const snapshot = await buildGamificationWeeklyReport({ teamId, now });

    expect(buildGamificationWeeklyReportMessage(snapshot)).toContain("【牛马补给周报】");
    expect(buildGamificationWeeklyReportMessage(snapshot)).toContain("四维完成率");
    expect(buildGamificationWeeklyReportMessage(snapshot)).toContain("抽奖");
  });

  it("publishes idempotently to Team Dynamics and does not require enterprise wechat", async () => {
    await seedWeeklyGameActivity({ teamId, adminId, userId });

    const first = await publishGamificationWeeklyReport({
      teamId,
      publisherUserId: adminId,
      weekStartDayKey: "2026-04-20",
      sendEnterpriseWechat: false,
      now,
    });
    const second = await publishGamificationWeeklyReport({
      teamId,
      publisherUserId: adminId,
      weekStartDayKey: "2026-04-20",
      sendEnterpriseWechat: false,
      now,
    });

    expect(first.teamDynamic.status).toBe("CREATED");
    expect(second.teamDynamic.status).toBe("EXISTING");
    expect(first.teamDynamic.id).toBe(second.teamDynamic.id);
    expect(first.wechat.status).toBe("NOT_REQUESTED");
    expect(
      await prisma.teamDynamic.count({
        where: {
          teamId,
          sourceType: "gamification_weekly_report",
          sourceId: `${teamId}:2026-04-20`,
        },
      }),
    ).toBe(1);
  });
});
```

Add this helper in the same test file below the `describe` block:

```ts
async function seedWeeklyGameActivity(input: {
  teamId: string;
  adminId: string;
  userId: string;
}) {
  const { teamId, adminId, userId } = input;
  const days = ["2026-04-20", "2026-04-21", "2026-04-22"];

  for (const dayKey of days) {
    for (const dimensionKey of ["movement", "hydration", "social", "learning"]) {
      await prisma.dailyTaskAssignment.create({
        data: {
          teamId,
          userId: adminId,
          dayKey,
          dimensionKey,
          taskCardId: `${dimensionKey}_001`,
          completedAt: new Date(`${dayKey}T02:00:00.000Z`),
        },
      });
    }
  }

  await prisma.dailyTaskAssignment.deleteMany({
    where: {
      userId: adminId,
      dayKey: "2026-04-22",
      dimensionKey: { in: ["social", "learning"] },
    },
  });

  await prisma.lotteryTicketLedger.createMany({
    data: [
      { teamId, userId: adminId, dayKey: "2026-04-20", delta: 1, balanceAfter: 1, reason: "FITNESS_PUNCH_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-21", delta: 1, balanceAfter: 2, reason: "FITNESS_PUNCH_GRANTED" },
      { teamId, userId, dayKey: "2026-04-21", delta: 1, balanceAfter: 1, reason: "FITNESS_PUNCH_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-20", delta: 1, balanceAfter: 2, reason: "DAILY_TASKS_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-21", delta: 1, balanceAfter: 3, reason: "DAILY_TASKS_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-22", delta: 1, balanceAfter: 4, reason: "COIN_PURCHASE_GRANTED" },
      { teamId, userId: adminId, dayKey: "2026-04-22", delta: -4, balanceAfter: 0, reason: "LOTTERY_DRAW_SPENT" },
    ],
  });

  const singleDraw = await prisma.lotteryDraw.create({
    data: {
      teamId,
      userId: adminId,
      drawType: "SINGLE",
      ticketSpent: 1,
      coinSpent: 0,
      createdAt: new Date("2026-04-22T03:00:00.000Z"),
    },
  });
  await prisma.lotteryDrawResult.create({
    data: {
      drawId: singleDraw.id,
      position: 1,
      rewardId: "coins_025",
      rewardTier: "common",
      rewardKind: "coins",
      rewardSnapshotJson: JSON.stringify({ name: "25 银子", coins: 25 }),
    },
  });

  const tenDraw = await prisma.lotteryDraw.create({
    data: {
      teamId,
      userId: adminId,
      drawType: "TEN",
      ticketSpent: 3,
      coinSpent: 40,
      createdAt: new Date("2026-04-23T03:00:00.000Z"),
    },
  });
  await prisma.lotteryDrawResult.createMany({
    data: [
      {
        drawId: tenDraw.id,
        position: 1,
        rewardId: "double_niuma_coupon",
        rewardTier: "rare",
        rewardKind: "item",
        rewardSnapshotJson: JSON.stringify({ name: "双倍牛马券" }),
      },
      {
        drawId: tenDraw.id,
        position: 2,
        rewardId: "luckin_coffee_coupon",
        rewardTier: "real_world",
        rewardKind: "item",
        rewardSnapshotJson: JSON.stringify({ name: "瑞幸咖啡券" }),
      },
    ],
  });

  await prisma.itemUseRecord.createMany({
    data: [
      {
        id: "boost_use_1",
        teamId,
        userId: adminId,
        itemId: "double_niuma_coupon",
        status: "SETTLED",
        targetType: "PUNCH_RECORD",
        targetId: "punch_boost_1",
        dayKey: "2026-04-23",
        effectSnapshotJson: JSON.stringify({
          type: "fitness_coin_and_season_multiplier",
          multiplier: 2,
        }),
        settledAt: new Date("2026-04-23T03:10:00.000Z"),
      },
      {
        id: "leave_use_1",
        teamId,
        userId,
        itemId: "fitness_leave_coupon",
        status: "SETTLED",
        targetType: "FITNESS_STREAK",
        targetId: null,
        dayKey: "2026-04-24",
        effectSnapshotJson: JSON.stringify({ type: "fitness_streak_protection" }),
        settledAt: new Date("2026-04-24T03:10:00.000Z"),
      },
      {
        id: "social_use_1",
        teamId,
        userId: adminId,
        itemId: "drink_water_ping",
        status: "SETTLED",
        targetType: "SOCIAL_INVITATION",
        targetId: null,
        dayKey: "2026-04-24",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
        settledAt: new Date("2026-04-24T03:15:00.000Z"),
      },
      {
        id: "social_use_2",
        teamId,
        userId: adminId,
        itemId: "team_standup_ping",
        status: "SETTLED",
        targetType: "SOCIAL_INVITATION",
        targetId: null,
        dayKey: "2026-04-24",
        effectSnapshotJson: JSON.stringify({ type: "social_invitation" }),
        settledAt: new Date("2026-04-24T03:20:00.000Z"),
      },
    ],
  });

  await prisma.punchRecord.create({
    data: {
      id: "punch_boost_1",
      teamId,
      userId: adminId,
      dayIndex: 23,
      dayKey: "2026-04-23",
      assetAwarded: 80,
      baseAssetAwarded: 40,
      boostAssetBonus: 40,
      baseSeasonContribution: 40,
      boostSeasonBonus: 40,
      seasonContributionAwarded: 80,
      boostItemUseRecordId: "boost_use_1",
    },
  });

  const direct = await prisma.socialInvitation.create({
    data: {
      teamId,
      senderUserId: adminId,
      recipientUserId: userId,
      invitationType: "DRINK_WATER",
      itemUseRecordId: "social_use_1",
      status: "RESPONDED",
      dayKey: "2026-04-24",
      message: "喝白白",
      respondedAt: new Date("2026-04-24T03:00:00.000Z"),
    },
  });
  const teamWide = await prisma.socialInvitation.create({
    data: {
      teamId,
      senderUserId: adminId,
      recipientUserId: null,
      invitationType: "TEAM_STANDUP",
      itemUseRecordId: "social_use_2",
      status: "RESPONDED",
      dayKey: "2026-04-24",
      message: "全员起立",
      respondedAt: new Date("2026-04-24T03:30:00.000Z"),
    },
  });
  await prisma.socialInvitationResponse.createMany({
    data: [
      { teamId, invitationId: direct.id, responderUserId: userId, dayKey: "2026-04-24" },
      { teamId, invitationId: teamWide.id, responderUserId: userId, dayKey: "2026-04-24" },
    ],
  });

  await prisma.teamDynamic.createMany({
    data: [
      {
        teamId,
        type: "GAME_RARE_PRIZE",
        title: "li 抽中了瑞幸咖啡券",
        summary: "补给站出大货了",
        payloadJson: "{}",
        actorUserId: adminId,
        sourceType: "lottery_draw_result",
        sourceId: "rare_result_1",
        importance: "high",
        occurredAt: new Date("2026-04-23T04:00:00.000Z"),
      },
      {
        teamId,
        type: "GAME_SOCIAL_MOMENT",
        title: "全员起立令收到 2 个响应",
        summary: "办公室还没完全冷掉",
        payloadJson: "{}",
        actorUserId: adminId,
        sourceType: "social_invitation_moment",
        sourceId: teamWide.id,
        importance: "normal",
        occurredAt: new Date("2026-04-24T04:00:00.000Z"),
      },
    ],
  });
}
```

- [ ] **Step 4: Run the service test and confirm it fails**

Run:

```bash
npm test -- __tests__/gamification-weekly-report.test.ts
```

Expected: FAIL because `lib/gamification/weekly-report.ts` does not exist.

- [ ] **Step 5: Implement weekly report service foundation**

Create `lib/gamification/weekly-report.ts`:

```ts
import { createOrReuseTeamDynamic } from "@/lib/team-dynamics-service";
import { sendEnterpriseWechatMessage } from "@/lib/integrations/enterprise-wechat";
import { prisma } from "@/lib/prisma";
import type {
  GamificationWeeklyReportCard,
  GamificationWeeklyReportHighlight,
  GamificationWeeklyReportMetric,
  GamificationWeeklyReportMetrics,
  GamificationWeeklyReportPublishResult,
  GamificationWeeklyReportSnapshot,
} from "@/lib/types";

export class WeeklyReportError extends Error {
  constructor(
    public code: "INVALID_WEEK_START" | "PUBLISH_FAILED",
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const GAME_DYNAMIC_TYPES = [
  "GAME_RARE_PRIZE",
  "GAME_TASK_STREAK_MILESTONE",
  "GAME_BOOST_MILESTONE",
  "GAME_TEAM_BROADCAST",
  "GAME_SOCIAL_MOMENT",
] as const;

function toShanghaiDateParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = formatter.format(date).split("-").map(Number);
  return { year, month, day };
}

function dayKeyFromUtcDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcDateFromDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(dayKey: string, days: number) {
  return dayKeyFromUtcDate(new Date(utcDateFromDayKey(dayKey).getTime() + days * DAY_MS));
}

function getShanghaiDayKey(date: Date) {
  const { year, month, day } = toShanghaiDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getShanghaiWeekday(dayKey: string) {
  return utcDateFromDayKey(dayKey).getUTCDay();
}

export function normalizeGamificationReportWeek(input: {
  now?: Date;
  weekStartDayKey?: string;
}) {
  const now = input.now ?? new Date();

  if (input.weekStartDayKey) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekStartDayKey)) {
      throw new WeeklyReportError("INVALID_WEEK_START", "weekStart must use YYYY-MM-DD");
    }
    if (getShanghaiWeekday(input.weekStartDayKey) !== 1) {
      throw new WeeklyReportError("INVALID_WEEK_START", "weekStart must be a Monday");
    }

    return {
      weekStartDayKey: input.weekStartDayKey,
      weekEndDayKey: addDays(input.weekStartDayKey, 6),
      daysInWindow: 7,
    };
  }

  const todayKey = getShanghaiDayKey(now);
  const weekday = getShanghaiWeekday(todayKey);
  const daysSinceMonday = (weekday + 6) % 7;
  const weekStartDayKey = addDays(todayKey, -daysSinceMonday);

  return {
    weekStartDayKey,
    weekEndDayKey: todayKey,
    daysInWindow: daysSinceMonday + 1,
  };
}

function pct(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function emptyMetrics(): GamificationWeeklyReportMetrics {
  return {
    teamMemberCount: 0,
    daysInWindow: 0,
    expectedTaskCount: 0,
    completedTaskCount: 0,
    taskCompletionRate: 0,
    allFourCompletionDays: 0,
    fitnessTicketsEarned: 0,
    lifeTicketsEarned: 0,
    paidTicketsBought: 0,
    ticketsSpent: 0,
    netTicketChange: 0,
    drawCount: 0,
    singleDrawCount: 0,
    tenDrawCount: 0,
    coinSpent: 0,
    coinRewarded: 0,
    rareRewardCount: 0,
    realWorldRewardCount: 0,
    itemUseCount: 0,
    boostUseCount: 0,
    boostAssetBonusTotal: 0,
    boostSeasonBonusTotal: 0,
    leaveCouponUseCount: 0,
    pendingItemUseCount: 0,
    expiredItemUseCount: 0,
    socialInvitationCount: 0,
    directInvitationCount: 0,
    teamInvitationCount: 0,
    socialResponseCount: 0,
    socialResponseRate: 0,
    gameDynamicCount: 0,
    rarePrizeDynamicCount: 0,
    boostDynamicCount: 0,
    socialMomentDynamicCount: 0,
  };
}

function buildMetricCards(metrics: GamificationWeeklyReportMetrics): GamificationWeeklyReportMetric[] {
  const ticketsEarned =
    metrics.fitnessTicketsEarned + metrics.lifeTicketsEarned + metrics.paidTicketsBought;

  return [
    {
      key: "task-rate",
      label: "四维完成率",
      value: `${metrics.taskCompletionRate}%`,
      helper: `${metrics.completedTaskCount}/${metrics.expectedTaskCount} 个任务完成`,
      tone: metrics.taskCompletionRate >= 70 ? "success" : "default",
    },
    {
      key: "tickets-earned",
      label: "本周发券",
      value: String(ticketsEarned),
      helper: `健身 ${metrics.fitnessTicketsEarned} · 四维 ${metrics.lifeTicketsEarned} · 补券 ${metrics.paidTicketsBought}`,
      tone: "highlight",
    },
    {
      key: "draws",
      label: "抽奖次数",
      value: String(metrics.drawCount),
      helper: `单抽 ${metrics.singleDrawCount} · 十连 ${metrics.tenDrawCount}`,
      tone: metrics.rareRewardCount + metrics.realWorldRewardCount > 0 ? "success" : "default",
    },
    {
      key: "social-response",
      label: "弱社交响应",
      value: `${metrics.socialResponseRate}%`,
      helper: `${metrics.socialResponseCount}/${metrics.socialInvitationCount} 个邀请有回应`,
      tone: metrics.socialResponseRate >= 50 ? "success" : "default",
    },
  ];
}

function buildSummaryCards(metrics: GamificationWeeklyReportMetrics): GamificationWeeklyReportCard[] {
  return [
    {
      key: "rhythm",
      title: "补给站节奏",
      body:
        metrics.completedTaskCount > 0
          ? `本周四维任务完成率 ${metrics.taskCompletionRate}%，生活券拿了 ${metrics.lifeTicketsEarned} 张。`
          : "本周补给站还在热机，先从一次四维全完成开始。",
      tone: metrics.taskCompletionRate >= 70 ? "success" : "default",
    },
    {
      key: "lottery",
      title: "抽奖机播报",
      body:
        metrics.drawCount > 0
          ? `抽奖机转了 ${metrics.drawCount} 次，稀有或真实福利高光 ${metrics.rareRewardCount + metrics.realWorldRewardCount} 次。`
          : "抽奖机本周没怎么转，券可以先攒着等十连。",
      tone: metrics.rareRewardCount + metrics.realWorldRewardCount > 0 ? "highlight" : "default",
    },
    {
      key: "social",
      title: "办公室互动",
      body:
        metrics.socialInvitationCount > 0
          ? `弱社交发起 ${metrics.socialInvitationCount} 次，收到 ${metrics.socialResponseCount} 个响应。`
          : "本周没人点名喝水，办公室暂时靠自觉续命。",
      tone: metrics.socialResponseCount > 0 ? "success" : "default",
    },
  ];
}

export function buildGamificationWeeklyReportMessage(snapshot: GamificationWeeklyReportSnapshot) {
  return [
    "【牛马补给周报】",
    `${snapshot.weekStartDayKey} 至 ${snapshot.weekEndDayKey}`,
    `四维完成率：${snapshot.metrics.taskCompletionRate}%`,
    `发券：健身 ${snapshot.metrics.fitnessTicketsEarned} / 四维 ${snapshot.metrics.lifeTicketsEarned} / 补券 ${snapshot.metrics.paidTicketsBought}`,
    `抽奖：${snapshot.metrics.drawCount} 次，稀有高光 ${snapshot.metrics.rareRewardCount + snapshot.metrics.realWorldRewardCount} 次`,
    `弱社交：${snapshot.metrics.socialInvitationCount} 次邀请，${snapshot.metrics.socialResponseCount} 个响应`,
  ].join("\n");
}

export async function buildGamificationWeeklyReport(input: {
  teamId: string;
  now?: Date;
  weekStartDayKey?: string;
}): Promise<GamificationWeeklyReportSnapshot> {
  const now = input.now ?? new Date();
  const week = normalizeGamificationReportWeek({
    now,
    weekStartDayKey: input.weekStartDayKey,
  });
  const dayKeys = Array.from({ length: week.daysInWindow }, (_, index) =>
    addDays(week.weekStartDayKey, index),
  );
  const members = await prisma.user.findMany({ where: { teamId: input.teamId } });
  const metrics = emptyMetrics();
  metrics.teamMemberCount = members.length;
  metrics.daysInWindow = week.daysInWindow;
  metrics.expectedTaskCount = members.length * week.daysInWindow * 4;

  const [
    assignments,
    ledgers,
    draws,
    itemUses,
    boostedPunches,
    invitations,
    responses,
    dynamics,
    publishedDynamic,
  ] = await Promise.all([
    prisma.dailyTaskAssignment.findMany({
      where: { teamId: input.teamId, dayKey: { in: dayKeys } },
    }),
    prisma.lotteryTicketLedger.findMany({
      where: { teamId: input.teamId, dayKey: { in: dayKeys } },
    }),
    prisma.lotteryDraw.findMany({
      where: {
        teamId: input.teamId,
        createdAt: {
          gte: new Date(`${week.weekStartDayKey}T00:00:00+08:00`),
          lte: new Date(`${week.weekEndDayKey}T23:59:59+08:00`),
        },
      },
      include: { results: true },
    }),
    prisma.itemUseRecord.findMany({
      where: { teamId: input.teamId, dayKey: { in: dayKeys } },
    }),
    prisma.punchRecord.findMany({
      where: {
        teamId: input.teamId,
        dayKey: { in: dayKeys },
        boostItemUseRecordId: { not: null },
      },
    }),
    prisma.socialInvitation.findMany({
      where: { teamId: input.teamId, dayKey: { in: dayKeys } },
    }),
    prisma.socialInvitationResponse.findMany({
      where: { teamId: input.teamId, dayKey: { in: dayKeys } },
    }),
    prisma.teamDynamic.findMany({
      where: {
        teamId: input.teamId,
        type: { in: [...GAME_DYNAMIC_TYPES] },
        occurredAt: {
          gte: new Date(`${week.weekStartDayKey}T00:00:00+08:00`),
          lte: new Date(`${week.weekEndDayKey}T23:59:59+08:00`),
        },
      },
      orderBy: { occurredAt: "desc" },
      take: 6,
    }),
    prisma.teamDynamic.findFirst({
      where: {
        teamId: input.teamId,
        sourceType: "gamification_weekly_report",
        sourceId: `${input.teamId}:${week.weekStartDayKey}`,
      },
    }),
  ]);

  metrics.completedTaskCount = assignments.filter((assignment) => assignment.completedAt !== null).length;
  metrics.taskCompletionRate = pct(metrics.completedTaskCount, metrics.expectedTaskCount);

  const completedByUserDay = new Map<string, number>();
  for (const assignment of assignments) {
    if (assignment.completedAt === null) continue;
    const key = `${assignment.userId}:${assignment.dayKey}`;
    completedByUserDay.set(key, (completedByUserDay.get(key) ?? 0) + 1);
  }
  metrics.allFourCompletionDays = Array.from(completedByUserDay.values()).filter((count) => count >= 4).length;

  for (const ledger of ledgers) {
    if (ledger.reason === "FITNESS_PUNCH_GRANTED") metrics.fitnessTicketsEarned += ledger.delta;
    if (ledger.reason === "DAILY_TASKS_GRANTED") metrics.lifeTicketsEarned += ledger.delta;
    if (ledger.reason === "COIN_PURCHASE_GRANTED") metrics.paidTicketsBought += ledger.delta;
    if (ledger.reason === "LOTTERY_DRAW_SPENT") metrics.ticketsSpent += Math.abs(ledger.delta);
    metrics.netTicketChange += ledger.delta;
  }

  metrics.drawCount = draws.length;
  metrics.singleDrawCount = draws.filter((draw) => draw.drawType === "SINGLE").length;
  metrics.tenDrawCount = draws.filter((draw) => draw.drawType === "TEN").length;
  metrics.coinSpent = draws.reduce((sum, draw) => sum + draw.coinSpent, 0);
  for (const draw of draws) {
    for (const result of draw.results) {
      if (result.rewardKind === "coins") {
        const snapshot = JSON.parse(result.rewardSnapshotJson || "{}") as { coins?: number; amount?: number };
        metrics.coinRewarded += snapshot.coins ?? snapshot.amount ?? 0;
      }
      if (result.rewardTier === "rare") metrics.rareRewardCount += 1;
      if (result.rewardTier === "real_world" || result.rewardKind === "real_world") metrics.realWorldRewardCount += 1;
    }
  }

  metrics.itemUseCount = itemUses.length;
  metrics.pendingItemUseCount = itemUses.filter((item) => item.status === "PENDING").length;
  metrics.expiredItemUseCount = itemUses.filter((item) => item.status === "EXPIRED").length;
  metrics.leaveCouponUseCount = itemUses.filter((item) => item.itemId === "fitness_leave_coupon").length;
  metrics.boostUseCount = boostedPunches.length;
  metrics.boostAssetBonusTotal = boostedPunches.reduce((sum, punch) => sum + punch.boostAssetBonus, 0);
  metrics.boostSeasonBonusTotal = boostedPunches.reduce((sum, punch) => sum + punch.boostSeasonBonus, 0);

  metrics.socialInvitationCount = invitations.length;
  metrics.directInvitationCount = invitations.filter((invitation) => invitation.recipientUserId !== null).length;
  metrics.teamInvitationCount = invitations.filter((invitation) => invitation.recipientUserId === null).length;
  metrics.socialResponseCount = responses.length;
  metrics.socialResponseRate = pct(metrics.socialResponseCount, metrics.socialInvitationCount);

  metrics.gameDynamicCount = dynamics.length;
  metrics.rarePrizeDynamicCount = dynamics.filter((dynamic) => dynamic.type === "GAME_RARE_PRIZE").length;
  metrics.boostDynamicCount = dynamics.filter((dynamic) => dynamic.type === "GAME_BOOST_MILESTONE").length;
  metrics.socialMomentDynamicCount = dynamics.filter((dynamic) => dynamic.type === "GAME_SOCIAL_MOMENT").length;

  const highlights: GamificationWeeklyReportHighlight[] = dynamics.map((dynamic) => ({
    id: dynamic.id,
    title: dynamic.title,
    summary: dynamic.summary,
    sourceType: "team_dynamic",
    sourceId: dynamic.id,
    occurredAt: dynamic.occurredAt.toISOString(),
  }));

  return {
    teamId: input.teamId,
    weekStartDayKey: week.weekStartDayKey,
    weekEndDayKey: week.weekEndDayKey,
    generatedAt: now.toISOString(),
    published: publishedDynamic !== null,
    publishedDynamicId: publishedDynamic?.id ?? null,
    metrics,
    metricCards: buildMetricCards(metrics),
    summaryCards: buildSummaryCards(metrics),
    highlights,
  };
}

export async function publishGamificationWeeklyReport(input: {
  teamId: string;
  publisherUserId: string;
  weekStartDayKey: string;
  sendEnterpriseWechat: boolean;
  now?: Date;
}): Promise<GamificationWeeklyReportPublishResult> {
  const snapshot = await buildGamificationWeeklyReport({
    teamId: input.teamId,
    weekStartDayKey: input.weekStartDayKey,
    now: input.now,
  });
  const dynamic = await createOrReuseTeamDynamic({
    teamId: input.teamId,
    type: "WEEKLY_REPORT_CREATED",
    title: `${snapshot.weekStartDayKey} 牛马补给周报`,
    summary: snapshot.summaryCards.map((card) => card.body).join(" "),
    payloadJson: JSON.stringify({
      version: 1,
      kind: "gamification_weekly_report",
      ...snapshot,
      publishedByUserId: input.publisherUserId,
    }),
    actorUserId: input.publisherUserId,
    sourceType: "gamification_weekly_report",
    sourceId: `${input.teamId}:${snapshot.weekStartDayKey}`,
    importance: "high",
    occurredAt: input.now ?? new Date(),
  });

  let wechat: GamificationWeeklyReportPublishResult["wechat"] = { status: "NOT_REQUESTED" };
  if (input.sendEnterpriseWechat) {
    const sendResult = await sendEnterpriseWechatMessage({
      teamId: input.teamId,
      purpose: "GAMIFICATION_WEEKLY_REPORT",
      targetType: "TeamDynamic",
      targetId: dynamic.id,
      message: buildGamificationWeeklyReportMessage(snapshot),
    });
    wechat =
      sendResult.status === "SENT"
        ? { status: "SENT" }
        : { status: sendResult.status, failureReason: sendResult.failureReason };
  }

  return {
    snapshot: {
      ...snapshot,
      published: true,
      publishedDynamicId: dynamic.id,
    },
    teamDynamic: {
      status: dynamic.created ? "CREATED" : "EXISTING",
      id: dynamic.id,
    },
    wechat,
  };
}
```

- [ ] **Step 6: Run the service tests**

Run:

```bash
npm test -- __tests__/gamification-weekly-report.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit service foundation**

```bash
git add lib/types.ts lib/gamification/weekly-report.ts __tests__/gamification-weekly-report.test.ts
git commit -m "feat: add gamification weekly report service"
```

---

### Task 2: Add Weekly Report API Routes

**Files:**
- Create: `app/api/gamification/reports/weekly/route.ts`
- Create: `app/api/gamification/reports/weekly/publish/route.ts`
- Create: `__tests__/gamification-weekly-report-api.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `__tests__/gamification-weekly-report-api.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/gamification/reports/weekly/route";
import { POST } from "@/app/api/gamification/reports/weekly/publish/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function getRequest(userId?: string, weekStart = "2026-04-20") {
  return new NextRequest(`http://localhost/api/gamification/reports/weekly?weekStart=${weekStart}`, {
    method: "GET",
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

function publishRequest(userId: string | undefined, body: unknown) {
  return new NextRequest("http://localhost/api/gamification/reports/weekly/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("gamification weekly report api", () => {
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-26T10:00:00+08:00"));
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    teamId = admin.teamId;
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("returns 401 for unauthenticated reads", async () => {
    const response = await GET(getRequest());
    expect(response.status).toBe(401);
  });

  it("returns a team scoped weekly report snapshot", async () => {
    const response = await GET(getRequest(memberId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot).toMatchObject({
      teamId,
      weekStartDayKey: "2026-04-20",
      weekEndDayKey: "2026-04-26",
      published: false,
    });
    expect(body.snapshot.metricCards.map((card: { label: string }) => card.label)).toEqual([
      "四维完成率",
      "本周发券",
      "抽奖次数",
      "弱社交响应",
    ]);
  });

  it("rejects invalid week starts", async () => {
    const response = await GET(getRequest(memberId, "2026-04-21"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code).toBe("INVALID_WEEK_START");
  });

  it("rejects publish from non-admin users", async () => {
    const response = await POST(
      publishRequest(memberId, {
        weekStartDayKey: "2026-04-20",
        sendEnterpriseWechat: false,
      }),
    );

    expect(response.status).toBe(403);
  });

  it("publishes weekly report as admin", async () => {
    const response = await POST(
      publishRequest(adminId, {
        weekStartDayKey: "2026-04-20",
        sendEnterpriseWechat: false,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.result.teamDynamic.status).toBe("CREATED");
    expect(body.result.snapshot.published).toBe(true);
    expect(
      await prisma.teamDynamic.count({
        where: {
          teamId,
          type: "WEEKLY_REPORT_CREATED",
          sourceType: "gamification_weekly_report",
        },
      }),
    ).toBe(1);
  });
});
```

- [ ] **Step 2: Run API tests and confirm failure**

Run:

```bash
npm test -- __tests__/gamification-weekly-report-api.test.ts
```

Expected: FAIL because the API routes do not exist.

- [ ] **Step 3: Implement read route**

Create `app/api/gamification/reports/weekly/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { loadCurrentUser } from "@/lib/session";
import {
  buildGamificationWeeklyReport,
  WeeklyReportError,
} from "@/lib/gamification/weekly-report";

export async function GET(request: NextRequest) {
  const user = await loadCurrentUser(request.cookies);
  if (!user) {
    return NextResponse.json({ error: "未登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const weekStartDayKey = request.nextUrl.searchParams.get("weekStart") ?? undefined;
    const snapshot = await buildGamificationWeeklyReport({
      teamId: user.teamId,
      weekStartDayKey,
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof WeeklyReportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "服务器错误", code: "SERVER_ERROR" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Implement publish route**

Create `app/api/gamification/reports/weekly/publish/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { isAdminUser, loadCurrentUser } from "@/lib/session";
import {
  publishGamificationWeeklyReport,
  WeeklyReportError,
} from "@/lib/gamification/weekly-report";

export async function POST(request: NextRequest) {
  const user = await loadCurrentUser(request.cookies);
  if (!user) {
    return NextResponse.json({ error: "未登录", code: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "需要管理员权限", code: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      weekStartDayKey?: string;
      sendEnterpriseWechat?: boolean;
    };

    if (!body.weekStartDayKey) {
      return NextResponse.json(
        { error: "缺少 weekStartDayKey", code: "INVALID_WEEK_START" },
        { status: 400 },
      );
    }

    const result = await publishGamificationWeeklyReport({
      teamId: user.teamId,
      publisherUserId: user.id,
      weekStartDayKey: body.weekStartDayKey,
      sendEnterpriseWechat: body.sendEnterpriseWechat === true,
    });

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof WeeklyReportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "周报发布失败", code: "WEEKLY_REPORT_PUBLISH_FAILED" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 5: Run API tests**

Run:

```bash
npm test -- __tests__/gamification-weekly-report-api.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit API routes**

```bash
git add app/api/gamification/reports/weekly/route.ts \
  app/api/gamification/reports/weekly/publish/route.ts \
  __tests__/gamification-weekly-report-api.test.ts
git commit -m "feat: add gamification weekly report api"
```

---

### Task 3: Add Client API Helpers

**Files:**
- Modify: `lib/api.ts`

- [ ] **Step 1: Add client helper functions**

Modify `lib/api.ts`:

```ts
import type {
  GamificationWeeklyReportPublishResult,
  GamificationWeeklyReportSnapshot,
} from "@/lib/types";

export async function fetchGamificationWeeklyReport(weekStartDayKey?: string) {
  const suffix = weekStartDayKey ? `?weekStart=${encodeURIComponent(weekStartDayKey)}` : "";
  const response = await fetch(`/api/gamification/reports/weekly${suffix}`);
  const body = (await response.json()) as {
    snapshot?: GamificationWeeklyReportSnapshot;
    error?: string;
  };

  if (!response.ok || !body.snapshot) {
    throw new Error(body.error ?? "获取牛马补给周报失败");
  }

  return body.snapshot;
}

export async function publishGamificationWeeklyReportRequest(input: {
  weekStartDayKey: string;
  sendEnterpriseWechat: boolean;
}) {
  const response = await fetch("/api/gamification/reports/weekly/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = (await response.json()) as {
    result?: GamificationWeeklyReportPublishResult;
    error?: string;
  };

  if (!response.ok || !body.result) {
    throw new Error(body.error ?? "发布牛马补给周报失败");
  }

  return body.result;
}
```

- [ ] **Step 2: Run type check**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit API client helpers**

```bash
git add lib/api.ts
git commit -m "feat: add gamification weekly report client helpers"
```

---

### Task 4: Render Weekly Report Panel

**Files:**
- Create: `components/report-center/GamificationWeeklyReportPanel.tsx`
- Create: `__tests__/gamification-weekly-report-panel.test.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Write failing panel tests**

Create `__tests__/gamification-weekly-report-panel.test.tsx`:

```tsx
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GamificationWeeklyReportPanel } from "@/components/report-center/GamificationWeeklyReportPanel";
import type { GamificationWeeklyReportSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function snapshot(): GamificationWeeklyReportSnapshot {
  return {
    teamId: "team_1",
    weekStartDayKey: "2026-04-20",
    weekEndDayKey: "2026-04-26",
    generatedAt: "2026-04-26T02:00:00.000Z",
    published: false,
    publishedDynamicId: null,
    metrics: {
      teamMemberCount: 2,
      daysInWindow: 7,
      expectedTaskCount: 56,
      completedTaskCount: 28,
      taskCompletionRate: 50,
      allFourCompletionDays: 4,
      fitnessTicketsEarned: 5,
      lifeTicketsEarned: 4,
      paidTicketsBought: 1,
      ticketsSpent: 7,
      netTicketChange: 3,
      drawCount: 3,
      singleDrawCount: 2,
      tenDrawCount: 1,
      coinSpent: 40,
      coinRewarded: 25,
      rareRewardCount: 1,
      realWorldRewardCount: 1,
      itemUseCount: 2,
      boostUseCount: 1,
      boostAssetBonusTotal: 40,
      boostSeasonBonusTotal: 40,
      leaveCouponUseCount: 1,
      pendingItemUseCount: 0,
      expiredItemUseCount: 0,
      socialInvitationCount: 2,
      directInvitationCount: 1,
      teamInvitationCount: 1,
      socialResponseCount: 2,
      socialResponseRate: 100,
      gameDynamicCount: 2,
      rarePrizeDynamicCount: 1,
      boostDynamicCount: 0,
      socialMomentDynamicCount: 1,
    },
    metricCards: [
      { key: "task-rate", label: "四维完成率", value: "50%", helper: "28/56 个任务完成", tone: "default" },
      { key: "tickets-earned", label: "本周发券", value: "10", helper: "健身 5 · 四维 4 · 补券 1", tone: "highlight" },
      { key: "draws", label: "抽奖次数", value: "3", helper: "单抽 2 · 十连 1", tone: "success" },
      { key: "social-response", label: "弱社交响应", value: "100%", helper: "2/2 个邀请有回应", tone: "success" },
    ],
    summaryCards: [
      { key: "rhythm", title: "补给站节奏", body: "本周四维任务完成率 50%。", tone: "default" },
      { key: "lottery", title: "抽奖机播报", body: "抽奖机转了 3 次。", tone: "highlight" },
      { key: "social", title: "办公室互动", body: "弱社交发起 2 次。", tone: "success" },
    ],
    highlights: [
      {
        id: "dynamic_1",
        title: "li 抽中了瑞幸咖啡券",
        summary: "补给站出大货了",
        sourceType: "team_dynamic",
        sourceId: "dynamic_1",
        occurredAt: "2026-04-23T04:00:00.000Z",
      },
    ],
  };
}

describe("GamificationWeeklyReportPanel", () => {
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
    vi.restoreAllMocks();
  });

  it("renders weekly report metrics and highlights", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: snapshot() }),
      }),
    );

    await act(async () => {
      root.render(<GamificationWeeklyReportPanel isAdmin={false} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("牛马补给周报");
    expect(container.textContent).toContain("2026-04-20 至 2026-04-26");
    expect(container.textContent).toContain("四维完成率");
    expect(container.textContent).toContain("本周发券");
    expect(container.textContent).toContain("抽奖机播报");
    expect(container.textContent).toContain("li 抽中了瑞幸咖啡券");
    expect(container.textContent).not.toContain("发布到团队动态");
  });

  it("shows publish actions for admins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: snapshot() }),
      }),
    );

    await act(async () => {
      root.render(<GamificationWeeklyReportPanel isAdmin />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("发布到团队动态");
    expect(container.textContent).toContain("发布并发送企业微信");
  });

  it("shows local error state when loading fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "服务器错误" }),
      }),
    );

    await act(async () => {
      root.render(<GamificationWeeklyReportPanel isAdmin={false} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("牛马补给周报加载失败");
  });
});
```

- [ ] **Step 2: Run panel tests and confirm failure**

Run:

```bash
npm test -- __tests__/gamification-weekly-report-panel.test.tsx
```

Expected: FAIL because the panel component does not exist.

- [ ] **Step 3: Implement weekly report panel**

Create `components/report-center/GamificationWeeklyReportPanel.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  fetchGamificationWeeklyReport,
  publishGamificationWeeklyReportRequest,
} from "@/lib/api";
import type { GamificationWeeklyReportSnapshot } from "@/lib/types";

interface Props {
  isAdmin: boolean;
}

export function GamificationWeeklyReportPanel({ isAdmin }: Props) {
  const [snapshot, setSnapshot] = useState<GamificationWeeklyReportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const nextSnapshot = await fetchGamificationWeeklyReport();
        if (!cancelled) setSnapshot(nextSnapshot);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "牛马补给周报加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function publish(sendEnterpriseWechat: boolean) {
    if (!snapshot) return;

    setPublishing(true);
    setError(null);
    try {
      const result = await publishGamificationWeeklyReportRequest({
        weekStartDayKey: snapshot.weekStartDayKey,
        sendEnterpriseWechat,
      });
      setSnapshot(result.snapshot);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "发布牛马补给周报失败");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <section className="game-weekly-report">牛马补给周报加载中...</section>;
  }

  if (error && !snapshot) {
    return <section className="game-weekly-report game-weekly-report--error">牛马补给周报加载失败：{error}</section>;
  }

  if (!snapshot) {
    return <section className="game-weekly-report">本周还没有牛马补给数据。</section>;
  }

  return (
    <section className="game-weekly-report" aria-labelledby="game-weekly-report-title">
      <div className="game-weekly-report__header">
        <div>
          <p className="game-weekly-report__eyebrow">Weekly Supply</p>
          <h2 id="game-weekly-report-title">牛马补给周报</h2>
          <p>
            {snapshot.weekStartDayKey} 至 {snapshot.weekEndDayKey}
          </p>
        </div>
        <span className="game-weekly-report__status">
          {snapshot.published ? "已发布到团队动态" : "未发布"}
        </span>
      </div>

      <div className="game-weekly-report__metrics">
        {snapshot.metricCards.map((metric) => (
          <article key={metric.key} className={`game-weekly-card game-weekly-card--${metric.tone}`}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            <span>{metric.helper}</span>
          </article>
        ))}
      </div>

      <div className="game-weekly-report__summaries">
        {snapshot.summaryCards.map((card) => (
          <article key={card.key} className={`game-weekly-summary game-weekly-summary--${card.tone}`}>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </div>

      <div className="game-weekly-report__highlights">
        <h3>本周高光</h3>
        {snapshot.highlights.length > 0 ? (
          snapshot.highlights.map((highlight) => (
            <article key={highlight.id}>
              <strong>{highlight.title}</strong>
              <p>{highlight.summary}</p>
            </article>
          ))
        ) : (
          <p>本周还没有稀有奖励、暴击高光或多人响应。先攒一点素材。</p>
        )}
      </div>

      {error ? <p className="game-weekly-report__error">{error}</p> : null}

      {isAdmin ? (
        <div className="game-weekly-report__actions">
          <button type="button" disabled={publishing} onClick={() => void publish(false)}>
            发布到团队动态
          </button>
          <button type="button" disabled={publishing} onClick={() => void publish(true)}>
            发布并发送企业微信
          </button>
        </div>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 4: Add panel styles**

Modify `app/globals.css`:

```css
.game-weekly-report {
  border: 2px solid #1f2937;
  background: #fff7d6;
  box-shadow: 5px 5px 0 #1f2937;
  border-radius: 22px;
  padding: 1rem;
}

.game-weekly-report__header,
.game-weekly-report__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.game-weekly-report__eyebrow {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  color: #92400e;
  text-transform: uppercase;
}

.game-weekly-report__status {
  border: 2px solid #1f2937;
  border-radius: 999px;
  background: #fde047;
  padding: 0.35rem 0.7rem;
  font-weight: 900;
}

.game-weekly-report__metrics,
.game-weekly-report__summaries {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.game-weekly-card,
.game-weekly-summary,
.game-weekly-report__highlights article {
  border: 2px solid #1f2937;
  background: #ffffff;
  border-radius: 16px;
  padding: 0.8rem;
}

.game-weekly-card strong {
  display: block;
  font-size: 1.8rem;
}

.game-weekly-card--highlight,
.game-weekly-summary--highlight {
  background: #fde047;
}

.game-weekly-card--success,
.game-weekly-summary--success {
  background: #dcfce7;
}

.game-weekly-report__highlights {
  display: grid;
  gap: 0.6rem;
  margin-top: 1rem;
}

.game-weekly-report__actions button {
  border: 2px solid #1f2937;
  background: #fde047;
  box-shadow: 3px 3px 0 #1f2937;
  border-radius: 999px;
  font-weight: 900;
  padding: 0.55rem 0.9rem;
}

.game-weekly-report__actions button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.game-weekly-report__error,
.game-weekly-report--error {
  color: #991b1b;
  font-weight: 800;
}
```

- [ ] **Step 5: Run panel tests**

Run:

```bash
npm test -- __tests__/gamification-weekly-report-panel.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit panel implementation**

```bash
git add components/report-center/GamificationWeeklyReportPanel.tsx \
  __tests__/gamification-weekly-report-panel.test.tsx \
  app/globals.css
git commit -m "feat: render gamification weekly report panel"
```

---

### Task 5: Mount Panel in Report Center

**Files:**
- Modify: `components/report-center/ReportCenter.tsx`
- Modify: `__tests__/report-center-component.test.tsx`

- [ ] **Step 1: Add failing Report Center integration assertion**

Modify `__tests__/report-center-component.test.tsx` fetch stub so it also handles the weekly report endpoint:

```ts
if (String(input) === "/api/gamification/reports/weekly") {
  return Promise.resolve(
    createJsonResponse({
      snapshot: {
        teamId: "team_1",
        weekStartDayKey: "2026-04-20",
        weekEndDayKey: "2026-04-26",
        generatedAt: "2026-04-26T02:00:00.000Z",
        published: false,
        publishedDynamicId: null,
        metrics: {},
        metricCards: [
          { key: "task-rate", label: "四维完成率", value: "50%", helper: "28/56 个任务完成", tone: "default" },
          { key: "tickets-earned", label: "本周发券", value: "10", helper: "健身 5 · 四维 4 · 补券 1", tone: "highlight" },
          { key: "draws", label: "抽奖次数", value: "3", helper: "单抽 2 · 十连 1", tone: "success" },
          { key: "social-response", label: "弱社交响应", value: "100%", helper: "2/2 个邀请有回应", tone: "success" },
        ],
        summaryCards: [
          { key: "rhythm", title: "补给站节奏", body: "本周四维任务完成率 50%。", tone: "default" },
        ],
        highlights: [],
      },
    }),
  );
}
```

Add assertions:

```ts
expect(container.textContent).toContain("牛马补给周报");
expect(container.textContent).toContain("四维完成率");
expect(container.textContent).toContain("本周发券");
```

- [ ] **Step 2: Run Report Center component test and confirm failure**

Run:

```bash
npm test -- __tests__/report-center-component.test.tsx
```

Expected: FAIL because `ReportCenter` does not mount `GamificationWeeklyReportPanel`.

- [ ] **Step 3: Mount the panel**

Modify `components/report-center/ReportCenter.tsx`:

```tsx
import { GamificationWeeklyReportPanel } from "./GamificationWeeklyReportPanel";
```

Render it after the existing trend / coffee grid:

```tsx
<GamificationWeeklyReportPanel isAdmin={state.currentUser.isAdmin} />
```

- [ ] **Step 4: Run Report Center component test**

Run:

```bash
npm test -- __tests__/report-center-component.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit Report Center integration**

```bash
git add components/report-center/ReportCenter.tsx __tests__/report-center-component.test.tsx
git commit -m "feat: add gamification weekly report to report center"
```

---

### Task 6: Verify Full Regression

**Files:**
- No new source files.

- [ ] **Step 1: Run focused GM-15 tests**

Run:

```bash
npm test -- \
  __tests__/gamification-weekly-report.test.ts \
  __tests__/gamification-weekly-report-api.test.ts \
  __tests__/gamification-weekly-report-panel.test.tsx \
  __tests__/report-center-component.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: all commands exit with code `0`.

- [ ] **Step 3: Manual browser check**

Start the app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Expected:

- Login and open `战报中心`.
- `牛马补给周报` appears below the existing trend / coffee report area.
- Empty state is readable when no game data exists.
- Admin users see publish actions.
- Normal users do not see publish actions.
- Publishing creates a Team Dynamics item once and repeat publish returns the existing item.

---

## Acceptance Checklist

- [ ] Weekly report service computes Asia/Shanghai natural week windows.
- [ ] Report Center shows `牛马补给周报`.
- [ ] Snapshot includes four-dimension, ticket, lottery, item, boost, weak social, and game dynamic metrics.
- [ ] Read API is authenticated and team-scoped.
- [ ] Publish API is admin-only.
- [ ] Publish creates or reuses `WEEKLY_REPORT_CREATED` with `sourceType = gamification_weekly_report`.
- [ ] Enterprise WeChat failure does not roll back TeamDynamic creation.
- [ ] Publishing does not grant coins, tickets, items, streaks, or season contribution.
- [ ] Empty state, API failure, non-admin, and admin states are tested.
