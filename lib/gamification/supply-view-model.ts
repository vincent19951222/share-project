import { buildSupplyAiImageSnapshot } from "@/lib/gamification/ai-image/snapshot";
import { settleTimedOutAiImageTasksForUser } from "@/lib/gamification/ai-image/tasks";
import { convertLegacyTicketsForUser } from "@/lib/gamification/legacy-ticket-conversion";
import { buildLegacySupplyArchiveSnapshot } from "@/lib/gamification/legacy-supply-archive";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import { buildSupplyTaskRecordSnapshot } from "@/lib/gamification/task-records";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

export const SUPPLY_BACKPACK_CAPACITY = 60;

export async function buildSupplyStationViewModelForUser(
  userId: string,
  now: Date = new Date(),
): Promise<SupplyStationProductionSnapshot | null> {
  const snapshot = await buildGamificationStateForUser(userId, now);

  if (!snapshot) {
    return null;
  }

  await settleTimedOutAiImageTasksForUser({ userId, now });

  const user = await convertLegacyTicketsForUser(userId);

  if (!user) {
    return null;
  }

  const [taskRecord, supplyAiImage, legacyArchive] = await Promise.all([
    buildSupplyTaskRecordSnapshot({
      userId: user.id,
      teamId: snapshot.teamId,
      now,
    }),
    buildSupplyAiImageSnapshot({
      userId: user.id,
      teamId: snapshot.teamId,
      coins: user.coins,
    }),
    buildLegacySupplyArchiveSnapshot({
      userId: user.id,
      teamId: snapshot.teamId,
      ticketBalance: user.ticketBalance,
    }),
  ]);

  return {
    currentUserId: snapshot.currentUserId,
    currentUserRole: snapshot.currentUserRole,
    teamId: snapshot.teamId,
    dayKey: snapshot.dayKey,
    resources: {
      coins: { label: "银子", value: user.coins },
    },
    profile: {
      ...snapshot.profile,
      username: user.username,
      avatarKey: user.avatarKey,
    },
    dashboard: {
      dailyQuests: [],
      todayEffects: snapshot.backpack.todayEffects,
    },
    drawPool: {
      wallet: {
        ...snapshot.ticketSummary,
        ticketBalance: 0,
      },
      lottery: {
        ...snapshot.lottery,
        status: "active",
        singleDrawEnabled: false,
        tenDrawEnabled: false,
        message: "旧抽奖池已下线，主题扭蛋请使用 AI 生图入口。",
      },
    },
    backpack: {
      ...snapshot.backpack,
      capacity: {
        usedSlots: snapshot.backpack.totalQuantity,
        totalSlots: SUPPLY_BACKPACK_CAPACITY,
      },
    },
    shop: {
      products: [],
    },
    taskRecord,
    social: snapshot.social,
    redemptions: snapshot.redemptions,
    supplyAiImage,
    legacyArchive,
  };
}
