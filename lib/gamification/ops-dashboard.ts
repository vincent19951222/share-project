import { getPreviousShanghaiDayKey, getShanghaiDayKey } from "@/lib/economy";
import { getItemDefinition } from "@/lib/gamification/content";
import { prisma } from "@/lib/prisma";
import type {
  GamificationOpsDashboardSnapshot,
  GamificationOpsLeaderboardItem,
  GamificationOpsMetricCard,
  GamificationOpsPendingRedemption,
  GamificationOpsRepeatedDirectInvitation,
  GamificationOpsRiskCard,
} from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 7;
const TICKET_HOARDING_THRESHOLD = 30;
const OVERDUE_REDEMPTION_DAYS = 2;
const REPEATED_DIRECT_INVITATION_THRESHOLD = 3;
const REAL_WORLD_REWARD_WATCH_THRESHOLD = 3;

interface BuildOpsDashboardInput {
  teamId: string;
  now?: Date;
  windowDays?: number;
}

function parseShanghaiDayStart(dayKey: string) {
  return new Date(`${dayKey}T00:00:00+08:00`);
}

function getWindowStartDayKey(endDayKey: string, days: number) {
  let cursor = endDayKey;

  for (let index = 1; index < days; index += 1) {
    cursor = getPreviousShanghaiDayKey(cursor);
  }

  return cursor;
}

function getWindow(input: { now: Date; windowDays?: number }) {
  const days = Math.max(1, Math.floor(input.windowDays ?? DEFAULT_WINDOW_DAYS));
  const endDayKey = getShanghaiDayKey(input.now);
  const startDayKey = getWindowStartDayKey(endDayKey, days);
  const startAt = parseShanghaiDayStart(startDayKey);
  const endExclusive = new Date(parseShanghaiDayStart(endDayKey).getTime() + DAY_MS);

  return {
    days,
    startDayKey,
    endDayKey,
    startAt,
    endExclusive,
  };
}

function rewardCoinAmount(raw: string) {
  try {
    const parsed = JSON.parse(raw) as {
      effect?: { type?: string; amount?: number };
      effectSummary?: string;
    };

    if (parsed.effect?.type === "grant_coins" && typeof parsed.effect.amount === "number") {
      return parsed.effect.amount;
    }

    const match = parsed.effectSummary?.match(/\+(\d+)\s*银子/);
    return match ? Number(match[1]) : 0;
  } catch {
    return 0;
  }
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function formatSigned(value: number) {
  return value >= 0 ? `+${value}` : String(value);
}

function getItemName(itemId: string) {
  return getItemDefinition(itemId)?.name ?? itemId;
}

function ageInDays(now: Date, requestedAt: Date) {
  return Math.max(0, Math.floor((now.getTime() - requestedAt.getTime()) / DAY_MS));
}

function createMetricCards(input: {
  netTicketChange: number;
  lotteryDrawCount: number;
  pendingRedemptionCount: number;
  socialResponseRate: number;
  realWorldRewardCount: number;
  wechatFailureCount: number;
}): GamificationOpsMetricCard[] {
  return [
    {
      key: "net_tickets",
      label: "抽奖券净变化",
      value: formatSigned(input.netTicketChange),
      helper: "近窗口发券减去抽奖消耗",
      tone: input.netTicketChange > 20 ? "warning" : "default",
    },
    {
      key: "lottery_draws",
      label: "抽奖次数",
      value: String(input.lotteryDrawCount),
      helper: "单抽和十连合计",
      tone: "highlight",
    },
    {
      key: "pending_redemptions",
      label: "待处理兑换",
      value: String(input.pendingRedemptionCount),
      helper: "需要管理员线下处理",
      tone: input.pendingRedemptionCount > 0 ? "warning" : "success",
    },
    {
      key: "social_response_rate",
      label: "弱社交响应率",
      value: `${input.socialResponseRate}%`,
      helper: "响应数 / 邀请数",
      tone: input.socialResponseRate >= 50 ? "success" : "default",
    },
    {
      key: "real_world_rewards",
      label: "真实福利产出",
      value: String(input.realWorldRewardCount),
      helper: "奖池产出的线下福利",
      tone: input.realWorldRewardCount >= REAL_WORLD_REWARD_WATCH_THRESHOLD ? "warning" : "default",
    },
    {
      key: "wechat_failures",
      label: "企微失败",
      value: String(input.wechatFailureCount),
      helper: "发送日志中的失败记录",
      tone: input.wechatFailureCount > 0 ? "danger" : "success",
    },
  ];
}

function createRiskCards(input: {
  ticketBalanceMismatchCount: number;
  coinBalanceMismatchCount: number;
  topTicketBalances: GamificationOpsLeaderboardItem[];
  pendingRedemptionCount: number;
  overdueRedemptionCount: number;
  repeatedDirectInvitations: GamificationOpsRepeatedDirectInvitation[];
  realWorldRewardCount: number;
  wechatFailureCount: number;
}): GamificationOpsRiskCard[] {
  const hoarders = input.topTicketBalances.filter(
    (item) => item.value >= TICKET_HOARDING_THRESHOLD,
  );

  return [
    {
      key: "asset_integrity",
      title: "资产一致性",
      severity:
        input.ticketBalanceMismatchCount > 0 || input.coinBalanceMismatchCount > 0
          ? "risk"
          : "ok",
      summary:
        input.ticketBalanceMismatchCount > 0 || input.coinBalanceMismatchCount > 0
          ? `发现 ${input.ticketBalanceMismatchCount} 个券余额异常、${input.coinBalanceMismatchCount} 个银子余额异常。`
          : "用户资产和可重算流水一致。",
      detailItems: [
        `抽奖券异常用户：${input.ticketBalanceMismatchCount}`,
        `银子异常用户：${input.coinBalanceMismatchCount}`,
      ],
    },
    {
      key: "ticket_hoarding",
      title: "抽奖券囤积",
      severity: hoarders.length > 0 ? "watch" : "ok",
      summary:
        hoarders.length > 0
          ? `${hoarders.length} 个用户持有 ${TICKET_HOARDING_THRESHOLD} 张以上抽奖券。`
          : "没有明显抽奖券囤积。",
      detailItems: hoarders.slice(0, 3).map((item) => `${item.username}: ${item.value} 张`),
    },
    {
      key: "redemption_queue",
      title: "兑换处理",
      severity:
        input.overdueRedemptionCount > 0
          ? "risk"
          : input.pendingRedemptionCount > 0
            ? "watch"
            : "ok",
      summary:
        input.pendingRedemptionCount > 0
          ? `${input.pendingRedemptionCount} 单待处理，其中 ${input.overdueRedemptionCount} 单超过 ${OVERDUE_REDEMPTION_DAYS} 天。`
          : "没有待处理真实福利兑换。",
      detailItems: [`待处理：${input.pendingRedemptionCount}`, `超时：${input.overdueRedemptionCount}`],
    },
    {
      key: "weak_social_frequency",
      title: "弱社交频率",
      severity: input.repeatedDirectInvitations.length > 0 ? "watch" : "ok",
      summary:
        input.repeatedDirectInvitations.length > 0
          ? `${input.repeatedDirectInvitations.length} 组点名关系达到高频阈值。`
          : "没有发现高频单点邀请。",
      detailItems: input.repeatedDirectInvitations
        .slice(0, 3)
        .map((item) => `${item.senderUsername} -> ${item.recipientUsername}: ${item.count} 次`),
    },
    {
      key: "real_world_cost",
      title: "真实福利成本",
      severity:
        input.realWorldRewardCount >= REAL_WORLD_REWARD_WATCH_THRESHOLD ? "watch" : "ok",
      summary:
        input.realWorldRewardCount >= REAL_WORLD_REWARD_WATCH_THRESHOLD
          ? `近窗口产出 ${input.realWorldRewardCount} 个真实福利，需要关注线下预算。`
          : `近窗口产出 ${input.realWorldRewardCount} 个真实福利。`,
      detailItems: [`真实福利奖励：${input.realWorldRewardCount}`],
    },
    {
      key: "wechat_delivery",
      title: "企业微信发送",
      severity: input.wechatFailureCount > 0 ? "risk" : "ok",
      summary:
        input.wechatFailureCount > 0
          ? `近窗口有 ${input.wechatFailureCount} 条企业微信发送失败。`
          : "企业微信发送日志没有失败记录。",
      detailItems: [`失败记录：${input.wechatFailureCount}`],
    },
  ];
}

export async function buildGamificationOpsDashboard({
  teamId,
  now = new Date(),
  windowDays = DEFAULT_WINDOW_DAYS,
}: BuildOpsDashboardInput): Promise<GamificationOpsDashboardSnapshot> {
  const window = getWindow({ now, windowDays });
  const [
    users,
    allTicketLedgers,
    windowTicketLedgers,
    punchRecords,
    allLotteryDraws,
    windowLotteryDraws,
    pendingRedemptions,
    socialInvitations,
    socialResponses,
    wechatFailures,
  ] = await Promise.all([
    prisma.user.findMany({
      where: { teamId },
      orderBy: { createdAt: "asc" },
      select: { id: true, username: true, coins: true, ticketBalance: true },
    }),
    prisma.lotteryTicketLedger.findMany({
      where: { teamId },
      select: { userId: true, delta: true },
    }),
    prisma.lotteryTicketLedger.findMany({
      where: { teamId, dayKey: { gte: window.startDayKey, lte: window.endDayKey } },
      select: { delta: true },
    }),
    prisma.punchRecord.findMany({
      where: { punched: true, user: { teamId } },
      select: { userId: true, assetAwarded: true },
    }),
    prisma.lotteryDraw.findMany({
      where: { teamId },
      select: {
        userId: true,
        coinSpent: true,
        results: { select: { rewardSnapshotJson: true } },
      },
    }),
    prisma.lotteryDraw.findMany({
      where: {
        teamId,
        createdAt: { gte: window.startAt, lt: window.endExclusive },
      },
      select: {
        coinSpent: true,
        results: {
          select: {
            rewardKind: true,
            rewardSnapshotJson: true,
          },
        },
      },
    }),
    prisma.realWorldRedemption.findMany({
      where: { teamId, status: "REQUESTED" },
      orderBy: { requestedAt: "asc" },
      include: { user: { select: { username: true } } },
    }),
    prisma.socialInvitation.findMany({
      where: {
        teamId,
        createdAt: { gte: window.startAt, lt: window.endExclusive },
      },
      include: {
        senderUser: { select: { username: true } },
        recipientUser: { select: { username: true } },
      },
    }),
    prisma.socialInvitationResponse.findMany({
      where: {
        teamId,
        createdAt: { gte: window.startAt, lt: window.endExclusive },
      },
      select: { id: true },
    }),
    prisma.enterpriseWechatSendLog.findMany({
      where: {
        teamId,
        status: "FAILED",
        createdAt: { gte: window.startAt, lt: window.endExclusive },
      },
      select: { id: true },
    }),
  ]);

  const ticketLedgerByUser = new Map<string, number>();
  for (const ledger of allTicketLedgers) {
    ticketLedgerByUser.set(ledger.userId, (ticketLedgerByUser.get(ledger.userId) ?? 0) + ledger.delta);
  }

  const punchCoinsByUser = new Map<string, number>();
  for (const record of punchRecords) {
    punchCoinsByUser.set(
      record.userId,
      (punchCoinsByUser.get(record.userId) ?? 0) + record.assetAwarded,
    );
  }

  const lotteryCoinDeltaByUser = new Map<string, number>();
  for (const draw of allLotteryDraws) {
    const rewardCoins = sum(draw.results.map((result) => rewardCoinAmount(result.rewardSnapshotJson)));
    lotteryCoinDeltaByUser.set(
      draw.userId,
      (lotteryCoinDeltaByUser.get(draw.userId) ?? 0) + rewardCoins - draw.coinSpent,
    );
  }

  const ticketBalanceMismatchCount = users.filter(
    (user) => user.ticketBalance !== (ticketLedgerByUser.get(user.id) ?? 0),
  ).length;
  const coinBalanceMismatchCount = users.filter(
    (user) =>
      user.coins !== (punchCoinsByUser.get(user.id) ?? 0) + (lotteryCoinDeltaByUser.get(user.id) ?? 0),
  ).length;

  const ticketsEarned = sum(windowTicketLedgers.filter((ledger) => ledger.delta > 0).map((ledger) => ledger.delta));
  const ticketsSpent = sum(
    windowTicketLedgers.filter((ledger) => ledger.delta < 0).map((ledger) => Math.abs(ledger.delta)),
  );
  const lotteryCoinSpent = sum(windowLotteryDraws.map((draw) => draw.coinSpent));
  const lotteryCoinRewarded = sum(
    windowLotteryDraws.flatMap((draw) =>
      draw.results.map((result) => rewardCoinAmount(result.rewardSnapshotJson)),
    ),
  );
  const realWorldRewardCount = windowLotteryDraws
    .flatMap((draw) => draw.results)
    .filter((result) => result.rewardKind === "real_world_redemption").length;
  const pendingRedemptionSnapshots: GamificationOpsPendingRedemption[] = pendingRedemptions.map(
    (redemption) => ({
      id: redemption.id,
      userId: redemption.userId,
      username: redemption.user.username,
      itemId: redemption.itemId,
      itemName: getItemName(redemption.itemId),
      requestedAt: redemption.requestedAt.toISOString(),
      ageDays: ageInDays(now, redemption.requestedAt),
    }),
  );
  const overdueRedemptionCount = pendingRedemptionSnapshots.filter(
    (item) => item.ageDays >= OVERDUE_REDEMPTION_DAYS,
  ).length;
  const directInvitationPairs = new Map<string, GamificationOpsRepeatedDirectInvitation>();

  for (const invitation of socialInvitations) {
    if (!invitation.recipientUserId) {
      continue;
    }

    const key = `${invitation.senderUserId}:${invitation.recipientUserId}`;
    const current = directInvitationPairs.get(key) ?? {
      senderUserId: invitation.senderUserId,
      senderUsername: invitation.senderUser.username,
      recipientUserId: invitation.recipientUserId,
      recipientUsername: invitation.recipientUser?.username ?? "未知成员",
      count: 0,
    };

    current.count += 1;
    directInvitationPairs.set(key, current);
  }

  const repeatedDirectInvitations = [...directInvitationPairs.values()]
    .filter((item) => item.count >= REPEATED_DIRECT_INVITATION_THRESHOLD)
    .sort((left, right) => right.count - left.count);
  const socialResponseRate =
    socialInvitations.length > 0
      ? Math.round((socialResponses.length / socialInvitations.length) * 100)
      : 0;
  const topTicketBalances: GamificationOpsLeaderboardItem[] = [...users]
    .sort((left, right) => right.ticketBalance - left.ticketBalance)
    .slice(0, 5)
    .map((user) => ({
      userId: user.id,
      username: user.username,
      value: user.ticketBalance,
      helper: `${user.coins} 银子`,
    }));
  const topCoinBalances: GamificationOpsLeaderboardItem[] = [...users]
    .sort((left, right) => right.coins - left.coins)
    .slice(0, 5)
    .map((user) => ({
      userId: user.id,
      username: user.username,
      value: user.coins,
      helper: `${user.ticketBalance} 张券`,
    }));
  const metrics = {
    teamMemberCount: users.length,
    windowDays: window.days,
    totalTicketBalance: sum(users.map((user) => user.ticketBalance)),
    totalCoinBalance: sum(users.map((user) => user.coins)),
    ticketsEarned,
    ticketsSpent,
    netTicketChange: ticketsEarned - ticketsSpent,
    lotteryDrawCount: windowLotteryDraws.length,
    lotteryCoinSpent,
    lotteryCoinRewarded,
    realWorldRewardCount,
    pendingRedemptionCount: pendingRedemptionSnapshots.length,
    overdueRedemptionCount,
    socialInvitationCount: socialInvitations.length,
    socialResponseCount: socialResponses.length,
    socialResponseRate,
    repeatedDirectInvitationPairCount: repeatedDirectInvitations.length,
    wechatFailureCount: wechatFailures.length,
    ticketBalanceMismatchCount,
    coinBalanceMismatchCount,
  };
  const metricCards = createMetricCards(metrics);
  const risks = createRiskCards({
    ...metrics,
    topTicketBalances,
    repeatedDirectInvitations,
  });

  return {
    teamId,
    window: {
      startDayKey: window.startDayKey,
      endDayKey: window.endDayKey,
      days: window.days,
      generatedAt: now.toISOString(),
    },
    metrics,
    metricCards,
    risks,
    pendingRedemptions: pendingRedemptionSnapshots.slice(0, 10),
    topTicketBalances,
    topCoinBalances,
    repeatedDirectInvitations: repeatedDirectInvitations.slice(0, 10),
  };
}
