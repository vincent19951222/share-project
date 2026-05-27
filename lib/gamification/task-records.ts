import {
  getNextShanghaiDayKey,
  getPreviousShanghaiDayKey,
  getShanghaiDayKey,
} from "@/lib/economy";
import { getItemDefinition, getTaskCards } from "@/lib/gamification/content";
import { prisma } from "@/lib/prisma";
import type { SupplyTaskRecordSnapshot } from "@/lib/types";

type TimelineRow = SupplyTaskRecordSnapshot["timeline"][number];

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"] as const;

function getDateLabel(dayKey: string) {
  const [, month, day] = dayKey.split("-");

  return `${month}/${day}`;
}

function getWeekdayLabel(dayKey: string) {
  return WEEKDAY_LABELS[new Date(`${dayKey}T12:00:00+08:00`).getUTCDay()];
}

function buildDateKeys(todayDayKey: string) {
  const dayKeys = [todayDayKey];

  while (dayKeys.length < 7) {
    dayKeys.push(getPreviousShanghaiDayKey(dayKeys[dayKeys.length - 1]));
  }

  return dayKeys;
}

function buildDates(todayDayKey: string): SupplyTaskRecordSnapshot["dates"] {
  return buildDateKeys(todayDayKey).map((dayKey, index) => ({
    key: dayKey,
    label: index === 0 ? "今天" : index === 1 ? "昨天" : `${index} 天前`,
    dateLabel: getDateLabel(dayKey),
    weekday: getWeekdayLabel(dayKey),
  }));
}

function getShanghaiDayStart(dayKey: string) {
  return new Date(`${dayKey}T00:00:00+08:00`);
}

function isRecentDay(dayKeys: Set<string>, value: Date) {
  return dayKeys.has(getShanghaiDayKey(value));
}

function getItemName(itemId: string) {
  return getItemDefinition(itemId)?.name ?? "未知补给";
}

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : String(delta);
}

function sortTimeline(rows: TimelineRow[]) {
  return rows.sort((a, b) => {
    const timeDiff = new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();

    if (timeDiff !== 0) {
      return timeDiff;
    }

    return a.id.localeCompare(b.id);
  });
}

export async function buildSupplyTaskRecordSnapshot(input: {
  userId: string;
  teamId: string;
  now?: Date;
}): Promise<SupplyTaskRecordSnapshot> {
  const now = input.now ?? new Date();
  const todayDayKey = getShanghaiDayKey(now);
  const dates = buildDates(todayDayKey);
  const dayKeys = new Set(dates.map((date) => date.key));
  const oldestDayKey = dates[dates.length - 1].key;
  const rangeStart = getShanghaiDayStart(oldestDayKey);
  const rangeEnd = getShanghaiDayStart(getNextShanghaiDayKey(todayDayKey));
  const taskCardsById = new Map(getTaskCards().map((card) => [card.id, card]));

  const [
    taskAssignments,
    lotteryDraws,
    ticketLedgers,
    experienceLedgers,
    shopPurchases,
    itemUseRecords,
    redemptions,
    socialInvitations,
    socialResponses,
  ] = await Promise.all([
    prisma.dailyTaskAssignment.findMany({
      where: {
        userId: input.userId,
        teamId: input.teamId,
        dayKey: { in: [...dayKeys] },
        completedAt: { not: null },
      },
      orderBy: { completedAt: "desc" },
    }),
    prisma.lotteryDraw.findMany({
      where: {
        userId: input.userId,
        teamId: input.teamId,
        createdAt: { gte: rangeStart, lt: rangeEnd },
      },
      include: { results: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lotteryTicketLedger.findMany({
      where: {
        userId: input.userId,
        teamId: input.teamId,
        dayKey: { in: [...dayKeys] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.experienceLedger.findMany({
      where: {
        userId: input.userId,
        teamId: input.teamId,
        dayKey: { in: [...dayKeys] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.shopPurchase.findMany({
      where: {
        userId: input.userId,
        teamId: input.teamId,
        dayKey: { in: [...dayKeys] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.itemUseRecord.findMany({
      where: {
        userId: input.userId,
        teamId: input.teamId,
        dayKey: { in: [...dayKeys] },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.realWorldRedemption.findMany({
      where: {
        userId: input.userId,
        teamId: input.teamId,
        requestedAt: { gte: rangeStart, lt: rangeEnd },
      },
      orderBy: { requestedAt: "desc" },
    }),
    prisma.socialInvitation.findMany({
      where: {
        teamId: input.teamId,
        dayKey: { in: [...dayKeys] },
        OR: [
          { senderUserId: input.userId },
          { recipientUserId: input.userId },
          { recipientUserId: null },
        ],
      },
      include: {
        senderUser: { select: { username: true } },
        recipientUser: { select: { username: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.socialInvitationResponse.findMany({
      where: {
        teamId: input.teamId,
        dayKey: { in: [...dayKeys] },
      },
      include: {
        responderUser: { select: { username: true } },
        invitation: {
          select: {
            senderUserId: true,
            recipientUserId: true,
            recipientUser: { select: { username: true } },
            message: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const timeline: TimelineRow[] = [
    ...taskAssignments.map((assignment): TimelineRow => {
      const taskCard = taskCardsById.get(assignment.taskCardId);

      return {
        id: `task:${assignment.id}`,
        dayKey: assignment.dayKey,
        occurredAt: assignment.completedAt?.toISOString() ?? assignment.updatedAt.toISOString(),
        title: "完成任务",
        subtitle: `${taskCard?.title ?? "未知任务"} · ${assignment.dimensionKey}`,
        category: "task",
        statusLabel: "已完成",
      };
    }),
    ...lotteryDraws
      .filter((draw) => isRecentDay(dayKeys, draw.createdAt))
      .map((draw): TimelineRow => ({
        id: `draw:${draw.id}`,
        dayKey: getShanghaiDayKey(draw.createdAt),
        occurredAt: draw.createdAt.toISOString(),
        title: "补给抽卡",
        subtitle: `${draw.drawType === "TEN" ? "十连" : "单抽"} · 消耗 ${draw.ticketSpent} 张券${
          draw.coinSpent > 0 ? ` · 补券 ${draw.coinSpent} 银子` : ""
        } · ${draw.results.length} 个奖励`,
        category: "draw",
        statusLabel: draw.guaranteeApplied ? "触发保底" : "已归档",
      })),
    ...ticketLedgers.map((ledger): TimelineRow => ({
      id: `ticket:${ledger.id}`,
      dayKey: ledger.dayKey,
      occurredAt: ledger.createdAt.toISOString(),
      title: ledger.delta >= 0 ? "抽奖券收入" : "抽奖券支出",
      subtitle: `${formatDelta(ledger.delta)} 张 · 余额 ${ledger.balanceAfter} · ${ledger.reason}`,
      category: "ticket",
      statusLabel: "已入账",
    })),
    ...experienceLedgers.map((ledger): TimelineRow => ({
      id: `exp:${ledger.id}`,
      dayKey: ledger.dayKey,
      occurredAt: ledger.createdAt.toISOString(),
      title: "获得 EXP",
      subtitle: `${formatDelta(ledger.delta)} EXP · 累计 ${ledger.balanceAfter} · ${ledger.reason}`,
      category: "exp",
      statusLabel: "已入账",
    })),
    ...shopPurchases.map((purchase): TimelineRow => ({
      id: `shop:${purchase.id}`,
      dayKey: purchase.dayKey,
      occurredAt: purchase.createdAt.toISOString(),
      title: "购买补给",
      subtitle: `${getItemName(purchase.itemId)} x${purchase.quantity} · ${purchase.totalPriceCoins} 银子`,
      category: "shop",
      statusLabel: purchase.status,
    })),
    ...itemUseRecords.map((record): TimelineRow => ({
      id: `item:${record.id}`,
      dayKey: record.dayKey,
      occurredAt: record.createdAt.toISOString(),
      title: "使用补给",
      subtitle: `${getItemName(record.itemId)} · ${record.status}`,
      category: "item",
      statusLabel: record.status,
    })),
    ...redemptions
      .filter((redemption) => isRecentDay(dayKeys, redemption.requestedAt))
      .map((redemption): TimelineRow => ({
        id: `redemption:${redemption.id}`,
        dayKey: getShanghaiDayKey(redemption.requestedAt),
        occurredAt: redemption.requestedAt.toISOString(),
        title: "真实福利兑换",
        subtitle: `${getItemName(redemption.itemId)} · ${redemption.status}`,
        category: "redemption",
        statusLabel: redemption.status,
      })),
    ...socialInvitations.map((invitation): TimelineRow => ({
      id: `social-invitation:${invitation.id}`,
      dayKey: invitation.dayKey,
      occurredAt: invitation.createdAt.toISOString(),
      title: "队友雷达",
      subtitle: `${invitation.senderUser.username} 邀请 ${
        invitation.recipientUser?.username ?? "全队"
      }：${invitation.message}`,
      category: "social",
      statusLabel: invitation.status,
    })),
    ...socialResponses
      .filter(
        (response) =>
          response.responderUserId === input.userId ||
          response.invitation.senderUserId === input.userId ||
          response.invitation.recipientUserId === input.userId ||
          response.invitation.recipientUserId === null,
      )
      .map((response): TimelineRow => ({
        id: `social-response:${response.id}`,
        dayKey: response.dayKey,
        occurredAt: response.createdAt.toISOString(),
        title: "队友雷达",
        subtitle: `${response.responderUser.username} 回应：${
          response.responseText ?? response.invitation.message
        }`,
        category: "social",
        statusLabel: "已回应",
      })),
  ];

  return {
    dates,
    timeline: sortTimeline(timeline),
  };
}
