import { getNextShanghaiDayKey, getShanghaiDayKey, getShanghaiWeekKey } from "@/lib/economy";
import type { TeamDynamic } from "@/lib/generated/prisma/client";
import { sendEnterpriseWechatMessage } from "@/lib/integrations/enterprise-wechat";
import { prisma } from "@/lib/prisma";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";
import type {
  GamificationWeeklyReportCard,
  GamificationWeeklyReportHighlight,
  GamificationWeeklyReportMetric,
  GamificationWeeklyReportMetrics,
  GamificationWeeklyReportPublishResult,
  GamificationWeeklyReportSnapshot,
} from "@/lib/types";

const WEEKLY_REPORT_SOURCE_TYPE = "gamification_weekly_report";
const DAY_MS = 24 * 60 * 60 * 1000;

export class WeeklyReportError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "WeeklyReportError";
    this.code = code;
    this.status = status;
  }
}

function parseShanghaiDayStart(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00+08:00`);
}

function formatPercent(value: number) {
  return `${value}%`;
}

function roundPercent(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function enumerateDayKeys(weekStartDayKey: string, weekEndDayKey: string) {
  const dayKeys: string[] = [];
  let cursor = weekStartDayKey;

  while (cursor <= weekEndDayKey) {
    dayKeys.push(cursor);
    if (cursor === weekEndDayKey) {
      break;
    }
    cursor = getNextShanghaiDayKey(cursor);
  }

  return dayKeys;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function parseRewardSnapshot(payloadJson: string): Record<string, unknown> {
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function rewardCoins(payloadJson: string) {
  const payload = parseRewardSnapshot(payloadJson);
  return typeof payload.coins === "number" ? payload.coins : 0;
}

function isLeaveCoupon(itemUse: { itemId: string; effectSnapshotJson: string }) {
  if (itemUse.itemId.includes("leave")) {
    return true;
  }

  return itemUse.effectSnapshotJson.includes("fitness_streak_protection");
}

function isGameDynamicType(type: string) {
  return type.startsWith("GAME_");
}

function buildMetricCards(
  metrics: GamificationWeeklyReportMetrics,
): GamificationWeeklyReportMetric[] {
  const ticketsEarned =
    metrics.fitnessTicketsEarned + metrics.lifeTicketsEarned + metrics.paidTicketsBought;

  return [
    {
      key: "task-rate",
      label: "四维完成率",
      value: formatPercent(metrics.taskCompletionRate),
      helper: `${metrics.completedTaskCount}/${metrics.expectedTaskCount} 个任务完成`,
      tone: metrics.taskCompletionRate >= 70 ? "success" : "default",
    },
    {
      key: "tickets-earned",
      label: "本周发券",
      value: String(ticketsEarned),
      helper: `健身 ${metrics.fitnessTicketsEarned} · 四维 ${metrics.lifeTicketsEarned} · 补券 ${metrics.paidTicketsBought}`,
      tone: ticketsEarned > 0 ? "highlight" : "default",
    },
    {
      key: "draws",
      label: "抽奖次数",
      value: String(metrics.drawCount),
      helper: `单抽 ${metrics.singleDrawCount} · 十连 ${metrics.tenDrawCount}`,
      tone: metrics.drawCount > 0 ? "success" : "default",
    },
    {
      key: "social-response",
      label: "弱社交响应",
      value: formatPercent(metrics.socialResponseRate),
      helper: `${metrics.socialResponseCount}/${metrics.socialInvitationCount} 个邀请有回应`,
      tone: metrics.socialResponseRate >= 60 ? "success" : "default",
    },
  ];
}

function buildSummaryCards(
  metrics: GamificationWeeklyReportMetrics,
): GamificationWeeklyReportCard[] {
  if (
    metrics.completedTaskCount === 0 &&
    metrics.drawCount === 0 &&
    metrics.itemUseCount === 0 &&
    metrics.socialInvitationCount === 0
  ) {
    return [
      {
        key: "rhythm",
        title: "补给站节奏",
        body: "补给站还在热机，本周暂时没有游戏化活动。先攒点素材，下周再写得热闹一点。",
        tone: "default",
      },
      {
        key: "lottery",
        title: "抽奖机播报",
        body: "抽奖机这周还没开转，没有稀有奖励或真实福利需要播报。",
        tone: "default",
      },
      {
        key: "social",
        title: "办公室互动",
        body: "弱社交还没发起，办公室空气很安静。",
        tone: "default",
      },
    ];
  }

  return [
    {
      key: "rhythm",
      title: "补给站节奏",
      body: `本周四维任务完成率 ${metrics.taskCompletionRate}%，累计 ${metrics.allFourCompletionDays} 次四维全清。`,
      tone: metrics.taskCompletionRate >= 70 ? "success" : "default",
    },
    {
      key: "lottery",
      title: "抽奖机播报",
      body: `抽奖机转了 ${metrics.drawCount} 次，产出 ${metrics.rareRewardCount} 个稀有奖励和 ${metrics.realWorldRewardCount} 个真实福利。`,
      tone: metrics.rareRewardCount + metrics.realWorldRewardCount > 0 ? "highlight" : "default",
    },
    {
      key: "social",
      title: "办公室互动",
      body: `弱社交发起 ${metrics.socialInvitationCount} 次，收到 ${metrics.socialResponseCount} 个回应。`,
      tone: metrics.socialResponseRate >= 60 ? "success" : "default",
    },
  ];
}

function buildHighlights(
  teamDynamics: Array<{
    id: string;
    title: string;
    summary: string;
    sourceType: string | null;
    sourceId: string | null;
    occurredAt: Date;
  }>,
): GamificationWeeklyReportHighlight[] {
  return teamDynamics.slice(0, 5).map((dynamic) => ({
    id: dynamic.id,
    title: dynamic.title,
    summary: dynamic.summary,
    sourceType: "team_dynamic",
    sourceId: dynamic.sourceId ?? dynamic.id,
    occurredAt: dynamic.occurredAt.toISOString(),
  }));
}

export function normalizeGamificationReportWeek(input: {
  now?: Date;
  weekStartDayKey?: string;
}) {
  const now = input.now ?? new Date();
  const currentDayKey = getShanghaiDayKey(now);
  const weekStartDayKey = input.weekStartDayKey ?? getShanghaiWeekKey(currentDayKey);

  if (getShanghaiWeekKey(weekStartDayKey) !== weekStartDayKey) {
    throw new WeeklyReportError(
      "INVALID_WEEK_START",
      400,
      "weekStartDayKey must be an Asia/Shanghai Monday.",
    );
  }

  const naturalWeekEnd = getShanghaiDayKey(
    new Date(parseShanghaiDayStart(weekStartDayKey).getTime() + 6 * DAY_MS),
  );
  const weekEndDayKey =
    input.weekStartDayKey || naturalWeekEnd <= currentDayKey ? naturalWeekEnd : currentDayKey;
  const dayKeys = enumerateDayKeys(weekStartDayKey, weekEndDayKey);

  return {
    weekStartDayKey,
    weekEndDayKey,
    daysInWindow: dayKeys.length,
    dayKeys,
    startAt: parseShanghaiDayStart(weekStartDayKey),
    endExclusiveAt: parseShanghaiDayStart(getNextShanghaiDayKey(weekEndDayKey)),
  };
}

export async function buildGamificationWeeklyReport(input: {
  teamId: string;
  now?: Date;
  weekStartDayKey?: string;
}): Promise<GamificationWeeklyReportSnapshot> {
  const now = input.now ?? new Date();
  const window = normalizeGamificationReportWeek({
    now,
    weekStartDayKey: input.weekStartDayKey,
  });

  const [
    memberCount,
    completedTasks,
    ticketLedgers,
    lotteryDraws,
    itemUses,
    punchRecords,
    socialInvitations,
    socialResponses,
    gameDynamics,
    publishedDynamic,
  ] = await Promise.all([
    prisma.user.count({ where: { teamId: input.teamId } }),
    prisma.dailyTaskAssignment.findMany({
      where: {
        teamId: input.teamId,
        dayKey: { gte: window.weekStartDayKey, lte: window.weekEndDayKey },
        completedAt: { not: null },
      },
      select: { userId: true, dayKey: true, dimensionKey: true },
    }),
    prisma.lotteryTicketLedger.findMany({
      where: {
        teamId: input.teamId,
        dayKey: { gte: window.weekStartDayKey, lte: window.weekEndDayKey },
      },
      select: { delta: true, reason: true },
    }),
    prisma.lotteryDraw.findMany({
      where: {
        teamId: input.teamId,
        createdAt: { gte: window.startAt, lt: window.endExclusiveAt },
      },
      include: { results: true },
    }),
    prisma.itemUseRecord.findMany({
      where: {
        teamId: input.teamId,
        dayKey: { gte: window.weekStartDayKey, lte: window.weekEndDayKey },
      },
      select: {
        itemId: true,
        targetType: true,
        status: true,
        effectSnapshotJson: true,
      },
    }),
    prisma.punchRecord.findMany({
      where: {
        user: { teamId: input.teamId },
        dayKey: { gte: window.weekStartDayKey, lte: window.weekEndDayKey },
      },
      select: { boostAssetBonus: true, boostSeasonBonus: true },
    }),
    prisma.socialInvitation.findMany({
      where: {
        teamId: input.teamId,
        dayKey: { gte: window.weekStartDayKey, lte: window.weekEndDayKey },
      },
      select: { recipientUserId: true },
    }),
    prisma.socialInvitationResponse.findMany({
      where: {
        teamId: input.teamId,
        dayKey: { gte: window.weekStartDayKey, lte: window.weekEndDayKey },
      },
      select: { id: true },
    }),
    prisma.teamDynamic.findMany({
      where: {
        teamId: input.teamId,
        type: { in: ["GAME_RARE_PRIZE", "GAME_TASK_STREAK_MILESTONE", "GAME_BOOST_MILESTONE", "GAME_TEAM_BROADCAST", "GAME_SOCIAL_MOMENT"] },
        occurredAt: { gte: window.startAt, lt: window.endExclusiveAt },
      },
      orderBy: [{ importance: "desc" }, { occurredAt: "desc" }],
      select: {
        id: true,
        type: true,
        title: true,
        summary: true,
        sourceType: true,
        sourceId: true,
        occurredAt: true,
      },
    }),
    prisma.teamDynamic.findUnique({
      where: {
        teamId_sourceType_sourceId: {
          teamId: input.teamId,
          sourceType: WEEKLY_REPORT_SOURCE_TYPE,
          sourceId: `${input.teamId}:${window.weekStartDayKey}`,
        },
      },
      select: { id: true },
    }),
  ]);

  const completedByUserDay = new Map<string, Set<string>>();
  for (const task of completedTasks) {
    const key = `${task.userId}:${task.dayKey}`;
    const dimensions = completedByUserDay.get(key) ?? new Set<string>();
    dimensions.add(task.dimensionKey);
    completedByUserDay.set(key, dimensions);
  }

  const allFourCompletionDays = Array.from(completedByUserDay.values()).filter(
    (dimensions) => dimensions.size >= 4,
  ).length;
  const expectedTaskCount = memberCount * window.daysInWindow * 4;
  const completedTaskCount = completedTasks.length;
  const fitnessTicketsEarned = sum(
    ticketLedgers
      .filter((ledger) => ledger.reason === "FITNESS_PUNCH_GRANTED")
      .map((ledger) => ledger.delta),
  );
  const lifeTicketsEarned = sum(
    ticketLedgers
      .filter((ledger) => ledger.reason === "DAILY_TASKS_GRANTED")
      .map((ledger) => ledger.delta),
  );
  const paidTicketsBought = sum(
    ticketLedgers
      .filter((ledger) => ledger.reason === "COIN_PURCHASE_GRANTED")
      .map((ledger) => ledger.delta),
  );
  const ticketsSpent = Math.abs(
    sum(
      ticketLedgers
        .filter((ledger) => ledger.reason === "LOTTERY_DRAW_SPENT")
        .map((ledger) => ledger.delta),
    ),
  );
  const directInvitationCount = socialInvitations.filter(
    (invitation) => invitation.recipientUserId,
  ).length;
  const teamInvitationCount = socialInvitations.length - directInvitationCount;
  const gameDynamicCount = gameDynamics.filter((dynamic) => isGameDynamicType(dynamic.type)).length;

  const metrics: GamificationWeeklyReportMetrics = {
    teamMemberCount: memberCount,
    daysInWindow: window.daysInWindow,
    expectedTaskCount,
    completedTaskCount,
    taskCompletionRate: roundPercent(completedTaskCount, expectedTaskCount),
    allFourCompletionDays,
    fitnessTicketsEarned,
    lifeTicketsEarned,
    paidTicketsBought,
    ticketsSpent,
    netTicketChange: sum(ticketLedgers.map((ledger) => ledger.delta)),
    drawCount: lotteryDraws.length,
    singleDrawCount: lotteryDraws.filter((draw) => draw.drawType === "SINGLE").length,
    tenDrawCount: lotteryDraws.filter((draw) => draw.drawType === "TEN").length,
    coinSpent: sum(lotteryDraws.map((draw) => draw.coinSpent)),
    coinRewarded: sum(lotteryDraws.flatMap((draw) => draw.results.map((result) => rewardCoins(result.rewardSnapshotJson)))),
    rareRewardCount: lotteryDraws.flatMap((draw) => draw.results).filter((result) => result.rewardTier === "rare").length,
    realWorldRewardCount: lotteryDraws
      .flatMap((draw) => draw.results)
      .filter((result) => result.rewardTier === "real_world" || result.rewardKind === "real_world").length,
    itemUseCount: itemUses.length,
    boostUseCount: itemUses.filter((itemUse) => itemUse.targetType === "PUNCH_RECORD").length,
    boostAssetBonusTotal: sum(punchRecords.map((record) => record.boostAssetBonus)),
    boostSeasonBonusTotal: sum(punchRecords.map((record) => record.boostSeasonBonus)),
    leaveCouponUseCount: itemUses.filter(isLeaveCoupon).length,
    pendingItemUseCount: itemUses.filter((itemUse) => itemUse.status === "PENDING").length,
    expiredItemUseCount: itemUses.filter((itemUse) => itemUse.status === "EXPIRED").length,
    socialInvitationCount: socialInvitations.length,
    directInvitationCount,
    teamInvitationCount,
    socialResponseCount: socialResponses.length,
    socialResponseRate: roundPercent(socialResponses.length, socialInvitations.length),
    gameDynamicCount,
    rarePrizeDynamicCount: gameDynamics.filter((dynamic) => dynamic.type === "GAME_RARE_PRIZE").length,
    boostDynamicCount: gameDynamics.filter((dynamic) => dynamic.type === "GAME_BOOST_MILESTONE").length,
    socialMomentDynamicCount: gameDynamics.filter((dynamic) => dynamic.type === "GAME_SOCIAL_MOMENT").length,
  };

  return {
    teamId: input.teamId,
    weekStartDayKey: window.weekStartDayKey,
    weekEndDayKey: window.weekEndDayKey,
    generatedAt: now.toISOString(),
    published: Boolean(publishedDynamic),
    publishedDynamicId: publishedDynamic?.id ?? null,
    metrics,
    metricCards: buildMetricCards(metrics),
    summaryCards: buildSummaryCards(metrics),
    highlights: buildHighlights(gameDynamics),
  };
}

export function buildGamificationWeeklyReportMessage(
  snapshot: GamificationWeeklyReportSnapshot,
) {
  const [taskRate, tickets, draws, social] = snapshot.metricCards;

  return [
    "【牛马补给周报】",
    `${snapshot.weekStartDayKey} 至 ${snapshot.weekEndDayKey}`,
    `${taskRate.label}: ${taskRate.value} (${taskRate.helper})`,
    `${tickets.label}: ${tickets.value} (${tickets.helper})`,
    `${draws.label}: ${draws.value} (${draws.helper})`,
    `${social.label}: ${social.value} (${social.helper})`,
  ].join("\n");
}

function serializeDynamicPayload(snapshot: GamificationWeeklyReportSnapshot, publisherUserId: string) {
  return {
    version: 1,
    kind: "gamification_weekly_report",
    weekStartDayKey: snapshot.weekStartDayKey,
    weekEndDayKey: snapshot.weekEndDayKey,
    metrics: snapshot.metrics,
    highlights: snapshot.highlights,
    summaryCards: snapshot.summaryCards,
    publishedByUserId: publisherUserId,
  };
}

function buildDynamicCopy(snapshot: GamificationWeeklyReportSnapshot) {
  return {
    title: `牛马补给周报 ${snapshot.weekStartDayKey}`,
    summary: snapshot.summaryCards.map((card) => card.body).join(" "),
  };
}

async function findPublishedDynamic(teamId: string, weekStartDayKey: string) {
  return prisma.teamDynamic.findUnique({
    where: {
      teamId_sourceType_sourceId: {
        teamId,
        sourceType: WEEKLY_REPORT_SOURCE_TYPE,
        sourceId: `${teamId}:${weekStartDayKey}`,
      },
    },
  });
}

async function createOrReuseWeeklyDynamic(input: {
  snapshot: GamificationWeeklyReportSnapshot;
  publisherUserId: string;
  now: Date;
}) {
  const sourceId = `${input.snapshot.teamId}:${input.snapshot.weekStartDayKey}`;
  const existing = await findPublishedDynamic(
    input.snapshot.teamId,
    input.snapshot.weekStartDayKey,
  );

  if (existing) {
    return { status: "EXISTING" as const, dynamic: existing };
  }

  const copy = buildDynamicCopy(input.snapshot);
  const dynamic = await prisma.teamDynamic.create({
    data: {
      teamId: input.snapshot.teamId,
      type: TEAM_DYNAMIC_TYPES.WEEKLY_REPORT_CREATED,
      title: copy.title,
      summary: copy.summary,
      payloadJson: JSON.stringify(serializeDynamicPayload(input.snapshot, input.publisherUserId)),
      actorUserId: input.publisherUserId,
      sourceType: WEEKLY_REPORT_SOURCE_TYPE,
      sourceId,
      importance: "high",
      occurredAt: input.now,
    },
  });

  return { status: "CREATED" as const, dynamic };
}

function serializePublishedSnapshot(
  snapshot: GamificationWeeklyReportSnapshot,
  dynamic: TeamDynamic,
): GamificationWeeklyReportSnapshot {
  return {
    ...snapshot,
    published: true,
    publishedDynamicId: dynamic.id,
  };
}

export async function publishGamificationWeeklyReport(input: {
  teamId: string;
  publisherUserId: string;
  weekStartDayKey: string;
  sendEnterpriseWechat: boolean;
  now?: Date;
}): Promise<GamificationWeeklyReportPublishResult> {
  const now = input.now ?? new Date();
  const snapshot = await buildGamificationWeeklyReport({
    teamId: input.teamId,
    weekStartDayKey: input.weekStartDayKey,
    now,
  });
  const { status, dynamic } = await createOrReuseWeeklyDynamic({
    snapshot,
    publisherUserId: input.publisherUserId,
    now,
  });
  const publishedSnapshot = serializePublishedSnapshot(snapshot, dynamic);

  if (!input.sendEnterpriseWechat) {
    return {
      snapshot: publishedSnapshot,
      teamDynamic: { status, id: dynamic.id },
      wechat: { status: "NOT_REQUESTED" },
    };
  }

  try {
    const result = await sendEnterpriseWechatMessage({
      teamId: input.teamId,
      purpose: "WEEKLY_REPORT",
      targetType: "TeamDynamic",
      targetId: dynamic.id,
      message: {
        type: "markdown",
        content: buildGamificationWeeklyReportMessage(publishedSnapshot),
      },
    });

    return {
      snapshot: publishedSnapshot,
      teamDynamic: { status, id: dynamic.id },
      wechat:
        result.status === "SENT"
          ? { status: "SENT" }
          : {
              status: result.status,
              failureReason: "reason" in result ? result.reason : undefined,
            },
    };
  } catch (error) {
    return {
      snapshot: publishedSnapshot,
      teamDynamic: { status, id: dynamic.id },
      wechat: {
        status: "FAILED",
        failureReason: error instanceof Error ? error.message : "Unknown sender failure",
      },
    };
  }
}
