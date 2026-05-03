import { getShanghaiDayKey } from "@/lib/economy";
import {
  getGamificationDimensions,
  getItemDefinition,
  getItemDefinitions,
  getTaskCards,
} from "@/lib/gamification/content";
import {
  BACKPACK_CATEGORY_ORDER,
  getBackpackCategoryLabel,
  getItemUseStatusLabel,
  getUseTimingLabel,
  normalizeBackpackCategory,
  normalizeUseTiming,
  summarizeItemEffect,
  summarizeUsageLimit,
} from "@/lib/gamification/item-display";
import { expirePastPendingItemUses } from "@/lib/gamification/item-use";
import { expirePastSocialInvitations } from "@/lib/gamification/social-invitations";
import { buildRedemptionSnapshot } from "@/lib/gamification/redemptions";
import { prisma } from "@/lib/prisma";
import type {
  GamificationBackpackGroupSnapshot,
  GamificationBackpackItemSnapshot,
  GamificationBackpackSummary,
  GamificationDimensionSnapshot,
  GamificationLotteryDrawSnapshot,
  GamificationLotteryRewardSnapshot,
  GamificationStateSnapshot,
  GamificationTodayEffectSnapshot,
  SocialInvitationSnapshot,
} from "@/lib/types";

const LOTTERY_TICKET_PRICE = 40;
const DAILY_TOP_UP_LIMIT = 10;
const TEN_DRAW_SIZE = 10;

function parseLotteryRewardSnapshot(raw: string): GamificationLotteryRewardSnapshot {
  try {
    const reward = JSON.parse(raw) as {
      id?: string;
      tier?: string;
      kind?: string;
      name?: string;
      description?: string;
      effectSummary?: string;
    };

    return {
      rewardId: reward.id ?? "unknown",
      rewardTier: reward.tier ?? "unknown",
      rewardKind: reward.kind ?? "unknown",
      name: reward.name ?? "未知奖励",
      description: reward.description ?? "历史奖励快照缺少描述。",
      effectSummary: reward.effectSummary ?? reward.description ?? "未知奖励",
    };
  } catch {
    return {
      rewardId: "unknown",
      rewardTier: "unknown",
      rewardKind: "unknown",
      name: "未知奖励",
      description: "历史奖励快照解析失败。",
      effectSummary: "未知奖励",
    };
  }
}

function buildBackpackItemSnapshot(input: {
  itemId: string;
  quantity: number;
  reservedQuantity: number;
}): GamificationBackpackItemSnapshot {
  const definition = getItemDefinition(input.itemId);
  const category = normalizeBackpackCategory(definition?.category);
  const useTiming = normalizeUseTiming(definition?.useTiming);
  const availability = getItemUseAvailability({
    quantity: input.quantity,
    reservedQuantity: input.reservedQuantity,
    knownDefinition: Boolean(definition),
    enabled: definition?.enabled ?? false,
    effectType: definition?.effect.type ?? null,
  });

  return {
    itemId: input.itemId,
    category,
    categoryLabel: getBackpackCategoryLabel(category),
    name: definition?.name ?? "未知补给",
    description:
      definition?.description ?? "这个道具配置已经不存在，请联系管理员确认。",
    quantity: input.quantity,
    reservedQuantity: input.reservedQuantity,
    availableQuantity: availability.availableQuantity,
    useEnabled: availability.useEnabled,
    useDisabledReason: availability.useDisabledReason,
    useTiming,
    useTimingLabel: getUseTimingLabel(useTiming),
    effectSummary: summarizeItemEffect(definition?.effect),
    usageLimitSummary: summarizeUsageLimit(definition),
    stackable: definition?.stackable ?? false,
    requiresAdminConfirmation: definition?.requiresAdminConfirmation ?? false,
    enabled: definition?.enabled ?? false,
    knownDefinition: Boolean(definition),
  };
}

function getItemUseAvailability(input: {
  quantity: number;
  reservedQuantity: number;
  knownDefinition: boolean;
  enabled: boolean;
  effectType: string | null;
}) {
  const availableQuantity = Math.max(0, input.quantity - input.reservedQuantity);

  if (!input.knownDefinition || !input.enabled) {
    return {
      availableQuantity,
      useEnabled: false,
      useDisabledReason: "道具配置不可用",
    };
  }

  if (
    input.effectType !== "fitness_coin_multiplier" &&
    input.effectType !== "fitness_season_multiplier" &&
    input.effectType !== "fitness_coin_and_season_multiplier" &&
    input.effectType !== "task_reroll" &&
    input.effectType !== "leave_protection" &&
    input.effectType !== "social_invitation"
  ) {
    return {
      availableQuantity,
      useEnabled: false,
      useDisabledReason: "这个道具的使用入口还没开放",
    };
  }

  if (availableQuantity < 1) {
    return {
      availableQuantity,
      useEnabled: false,
      useDisabledReason: "库存已被今日效果预占",
    };
  }

  return {
    availableQuantity,
    useEnabled: true,
    useDisabledReason: null,
  };
}

function buildBackpackGroups(
  items: GamificationBackpackItemSnapshot[],
): GamificationBackpackGroupSnapshot[] {
  return BACKPACK_CATEGORY_ORDER.map((category) => {
    const categoryItems = items.filter((item) => item.category === category);

    return {
      category,
      label: getBackpackCategoryLabel(category),
      totalQuantity: categoryItems.reduce((sum, item) => sum + item.quantity, 0),
      items: categoryItems,
    };
  }).filter((group) => group.items.length > 0);
}

function parseEffectSnapshot(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function buildTodayEffectSnapshot(record: {
  id: string;
  itemId: string;
  status: string;
  effectSnapshotJson: string;
  createdAt: Date;
  settledAt: Date | null;
}): GamificationTodayEffectSnapshot {
  const definition = getItemDefinition(record.itemId);
  const parsedEffect = parseEffectSnapshot(record.effectSnapshotJson);

  return {
    id: record.id,
    itemId: record.itemId,
    name: definition?.name ?? "未知补给",
    status: record.status as GamificationTodayEffectSnapshot["status"],
    statusLabel: getItemUseStatusLabel(record.status),
    effectSummary: summarizeItemEffect(parsedEffect ?? definition?.effect),
    createdAt: record.createdAt.toISOString(),
    settledAt: record.settledAt?.toISOString() ?? null,
  };
}

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

function buildBackpackSummary(user: {
  inventoryItems: { itemId: string; quantity: number }[];
  itemUseRecords: {
    id: string;
    itemId: string;
    status: string;
    effectSnapshotJson: string;
    createdAt: Date;
    settledAt: Date | null;
  }[];
}): GamificationBackpackSummary {
  const knownItemIds = new Set(getItemDefinitions().map((item) => item.id));
  const todayPendingUses = user.itemUseRecords.filter((record) => record.status === "PENDING");
  const items = user.inventoryItems
    .filter((item) => item.quantity > 0)
    .map((item) =>
      buildBackpackItemSnapshot({
        ...item,
        reservedQuantity: todayPendingUses.filter((record) => record.itemId === item.itemId).length,
      }),
    )
    .sort((a, b) => {
      const categoryDiff =
        BACKPACK_CATEGORY_ORDER.indexOf(a.category) -
        BACKPACK_CATEGORY_ORDER.indexOf(b.category);

      if (categoryDiff !== 0) {
        return categoryDiff;
      }

      if (a.knownDefinition !== b.knownDefinition) {
        return a.knownDefinition ? -1 : 1;
      }

      return a.name.localeCompare(b.name, "zh-Hans-CN");
    });
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const configuredItemCount = items.filter((item) => knownItemIds.has(item.itemId)).length;
  const todayEffectStatusOrder = new Map([
    ["PENDING", 0],
    ["SETTLED", 1],
  ]);

  return {
    status: "active",
    totalQuantity,
    ownedItemCount: items.length,
    previewItems: items.slice(0, 3),
    groups: buildBackpackGroups(items),
    todayEffects: user.itemUseRecords
      .map((record) => buildTodayEffectSnapshot(record))
      .sort((a, b) => {
        const statusDiff =
          (todayEffectStatusOrder.get(a.status) ?? 99) -
          (todayEffectStatusOrder.get(b.status) ?? 99);

        if (statusDiff !== 0) {
          return statusDiff;
        }

        return b.createdAt.localeCompare(a.createdAt);
      }),
    emptyMessage:
      totalQuantity === 0
        ? "背包空空，先去抽奖机薅点补给。"
        : `已收纳 ${items.length} 种补给，其中 ${configuredItemCount} 种配置正常。`,
  };
}

export async function buildGamificationStateForUser(
  userId: string,
  now: Date = new Date(),
): Promise<GamificationStateSnapshot | null> {
  const dayKey = getShanghaiDayKey(now);

  await expirePastPendingItemUses({ userId, todayDayKey: dayKey });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      teamId: true,
      role: true,
      coins: true,
      ticketBalance: true,
      dailyTaskAssignments: {
        where: { dayKey },
        select: {
          id: true,
          dimensionKey: true,
          taskCardId: true,
          completionText: true,
          rerollCount: true,
          completedAt: true,
        },
      },
      lotteryTicketLedgers: {
        where: { dayKey },
        select: {
          delta: true,
          reason: true,
          sourceType: true,
        },
      },
      inventoryItems: {
        orderBy: [{ updatedAt: "desc" }, { itemId: "asc" }],
        select: {
          itemId: true,
          quantity: true,
        },
      },
      itemUseRecords: {
        where: {
          dayKey,
          status: { in: ["PENDING", "SETTLED"] },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          itemId: true,
          status: true,
          effectSnapshotJson: true,
          createdAt: true,
          settledAt: true,
        },
      },
      lotteryDraws: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          drawType: true,
          ticketSpent: true,
          coinSpent: true,
          guaranteeApplied: true,
          createdAt: true,
          results: {
            orderBy: { position: "asc" },
            select: {
              rewardId: true,
              rewardTier: true,
              rewardKind: true,
              rewardSnapshotJson: true,
            },
          },
        },
      },
      sentSocialInvitations: {
        where: {
          dayKey,
          status: "PENDING",
        },
        select: { id: true },
      },
      receivedSocialInvitations: {
        where: {
          dayKey,
          status: "PENDING",
        },
        select: { id: true },
      },
    },
  });

  if (!user) {
    return null;
  }

  await expirePastSocialInvitations({ teamId: user.teamId, todayDayKey: dayKey, now });

  const taskCardsById = new Map(getTaskCards().map((card) => [card.id, card]));
  const assignmentsByDimension = new Map(
    user.dailyTaskAssignments.map((assignment) => [assignment.dimensionKey, assignment]),
  );

  const dimensions: GamificationDimensionSnapshot[] = getGamificationDimensions().map(
    (dimension) => {
      const assignment = assignmentsByDimension.get(dimension.key);
      const taskCard = assignment ? taskCardsById.get(assignment.taskCardId) : null;

      return {
        key: dimension.key,
        title: dimension.title,
        subtitle: dimension.subtitle,
        description: dimension.description,
        assignment: assignment
          ? {
              id: assignment.id,
              taskCardId: assignment.taskCardId,
              title: taskCard?.title ?? "未知任务",
              description: taskCard?.description ?? "这张任务卡已经不在本地配置中。",
              status: assignment.completedAt ? "completed" : "pending",
              completedAt: assignment.completedAt?.toISOString() ?? null,
              completionText: assignment.completionText ?? null,
              rerollCount: assignment.rerollCount,
              rerollLimit: 1,
              canComplete: !assignment.completedAt,
              canReroll: !assignment.completedAt && assignment.rerollCount < 1,
            }
          : null,
      };
    },
  );

  const todayEarned = user.lotteryTicketLedgers
    .filter((ledger) => ledger.delta > 0)
    .reduce((sum, ledger) => sum + ledger.delta, 0);
  const todaySpent = user.lotteryTicketLedgers
    .filter((ledger) => ledger.delta < 0)
    .reduce((sum, ledger) => sum + Math.abs(ledger.delta), 0);
  const taskCompletedCount = dimensions.filter(
    (dimension) => dimension.assignment?.status === "completed",
  ).length;
  const lifeTicketEarned = user.lotteryTicketLedgers.some(
    (ledger) => ledger.reason === "DAILY_TASKS_GRANTED",
  );
  const dailyTopUpPurchased = user.lotteryTicketLedgers
    .filter(
      (ledger) =>
        ledger.reason === "COIN_PURCHASE_GRANTED" && ledger.sourceType === "lottery_topup",
    )
    .reduce((sum, ledger) => sum + Math.max(0, ledger.delta), 0);
  const tenDrawTopUpRequired = Math.max(0, TEN_DRAW_SIZE - user.ticketBalance);
  const tenDrawTopUpCoinCost = tenDrawTopUpRequired * LOTTERY_TICKET_PRICE;
  const remainingDailyTopUp = Math.max(0, DAILY_TOP_UP_LIMIT - dailyTopUpPurchased);
  const tenDrawCanTopUp =
    tenDrawTopUpRequired > 0 &&
    dailyTopUpPurchased + tenDrawTopUpRequired <= DAILY_TOP_UP_LIMIT &&
    user.coins >= tenDrawTopUpCoinCost;

  const recentDraws: GamificationLotteryDrawSnapshot[] = user.lotteryDraws.map((draw) => ({
    id: draw.id,
    drawType: draw.drawType as "SINGLE" | "TEN",
    ticketSpent: draw.ticketSpent,
    coinSpent: draw.coinSpent,
    guaranteeApplied: draw.guaranteeApplied,
    createdAt: draw.createdAt.toISOString(),
    rewards: draw.results.map((result) =>
      parseLotteryRewardSnapshot(result.rewardSnapshotJson),
    ),
  }));
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

  return {
    currentUserId: user.id,
    currentUserRole: user.role,
    teamId: user.teamId,
    dayKey,
    ticketBalance: user.ticketBalance,
    dimensions,
    ticketSummary: {
      maxFreeTicketsToday: 2,
      todayEarned,
      todaySpent,
      lifeTicketEarned,
      fitnessTicketEarned: user.lotteryTicketLedgers.some(
        (ledger) => ledger.reason === "FITNESS_PUNCH_GRANTED",
      ),
      taskCompletedCount,
      lifeTicketClaimable: taskCompletedCount === 4 && !lifeTicketEarned,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: user.ticketBalance >= 1,
      tenDrawEnabled: user.ticketBalance >= TEN_DRAW_SIZE || tenDrawCanTopUp,
      tenDrawTopUpRequired,
      tenDrawTopUpCoinCost,
      dailyTopUpPurchased,
      dailyTopUpLimit: DAILY_TOP_UP_LIMIT,
      ticketPrice: LOTTERY_TICKET_PRICE,
      message:
        user.ticketBalance >= TEN_DRAW_SIZE
          ? "十连抽已就绪。"
          : tenDrawCanTopUp
            ? `还差 ${tenDrawTopUpRequired} 张券，可用 ${tenDrawTopUpCoinCost} 银子补齐十连。`
            : tenDrawTopUpRequired > remainingDailyTopUp
              ? `今日最多还能补 ${remainingDailyTopUp} 张券。`
              : `还差 ${tenDrawTopUpRequired} 张券，需要 ${tenDrawTopUpCoinCost} 银子补齐十连。`,
      recentDraws,
    },
    backpack: buildBackpackSummary(user),
    redemptions: {
      mine: myRedemptions.map((record) => buildRedemptionSnapshot(record)),
      adminQueue: adminQueue.map((record) => buildRedemptionSnapshot(record)),
    },
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
      message: "点名喝水、出门溜达和全员起立已开放；对方可以响应，也可以选择忽略。",
    },
  };
}
