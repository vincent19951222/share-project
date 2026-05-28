import { describe, expect, it } from "vitest";
import {
  toSupplyBackpackPreview,
  toSupplyDashboardPreview,
  toSupplyDrawPoolPreview,
  toSupplyShopPreview,
  toSupplyTaskRecordPreview,
} from "@/components/gamification/production/supply-ui-lab-adapters";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

const snapshot = {
  currentUserId: "u1",
  currentUserRole: "MEMBER",
  teamId: "t1",
  dayKey: "2026-05-26",
  resources: {
    coins: { label: "银子", value: 845 },
    ticket: { label: "抽奖券", value: 5 },
    backpack: { label: "背包", value: 17, maxValue: 60 },
  },
  profile: {
    username: "li",
    avatarKey: "male1",
    totalExp: 50,
    level: 1,
    currentLevelExp: 50,
    nextLevelExp: 1000,
    title: "自律牛马",
  },
  dashboard: {
    todayEffects: [],
    dailyQuests: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "站一站，不然屁股长根",
        description: "起身、走动、拉伸、短暂恢复。",
        assignment: {
          id: "a1",
          taskCardId: "movement_002",
          title: "屁股离线",
          description: "找一个理由离开座位走一小圈。",
          status: "completed",
          completedAt: "2026-05-26T14:37:34.211Z",
          completionText: null,
          rerollCount: 0,
          rerollLimit: 1,
          canComplete: false,
          canReroll: false,
        },
      },
    ],
  },
  drawPool: {
    wallet: {
      maxFreeTicketsToday: 2,
      todayEarned: 0,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: false,
      taskCompletedCount: 1,
      lifeTicketClaimable: false,
      ticketBalance: 5,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: true,
      tenDrawEnabled: true,
      tenDrawTopUpRequired: 5,
      tenDrawTopUpCoinCost: 200,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "还差 5 张券，可用 200 银子补齐十连。",
      recentDraws: [],
    },
  },
  backpack: {
    status: "active",
    totalQuantity: 17,
    ownedItemCount: 1,
    previewItems: [],
    groups: [],
    todayEffects: [],
    emptyMessage: "背包为空",
    capacity: { usedSlots: 17, totalSlots: 60 },
  },
  shop: {
    products: [
      {
        itemId: "task_reroll_coupon",
        name: "任务换班券",
        description: "把当天一个四维任务换成同维度另一张卡。",
        category: "task",
        priceCoins: 150,
        ownedQuantity: 3,
        dailyLimit: 1,
        purchaseEnabled: true,
        purchaseDisabledReason: null,
        requiresAdminConfirmation: false,
      },
    ],
  },
  taskRecord: {
    dates: [{ key: "2026-05-26", label: "今天", dateLabel: "05/26", weekday: "周二" }],
    timeline: [
      {
        id: "row-1",
        dayKey: "2026-05-26",
        occurredAt: "2026-05-26T14:38:02.964Z",
        title: "购买补给",
        subtitle: "任务换班券 x1",
        category: "shop",
        statusLabel: "SETTLED",
      },
    ],
  },
  social: {
    status: "active",
    pendingSentCount: 0,
    pendingReceivedCount: 0,
    teamWidePendingCount: 0,
    sent: [],
    received: [],
    teamWide: [],
    recentResponses: [],
    availableRecipients: [],
    message: "队友雷达可用。",
  },
  redemptions: { mine: [], adminQueue: [] },
} satisfies SupplyStationProductionSnapshot;

describe("supply production to UI Lab adapters", () => {
  it("maps dashboard resources, profile, quests, and media assets", () => {
    const dashboard = toSupplyDashboardPreview(snapshot);

    expect(dashboard.profile).toMatchObject({
      username: "li",
      title: "自律牛马",
      level: 1,
      currentLevelExp: 50,
      nextLevelExp: 1000,
    });
    expect(dashboard.resources.map((resource) => resource.label)).toEqual(["银子", "抽奖券", "背包"]);
    expect(dashboard.resources[2]).toMatchObject({ value: 17, maxValue: 60 });
    expect(dashboard.dailyQuests[0]).toMatchObject({
      id: "movement",
      title: "屁股离线",
      completed: true,
    });
    expect(dashboard.dailyQuests[0].image).toContain("/assets/");
    expect(dashboard.shortcutLinks.map((link) => link.id)).toEqual([
      "home",
      "backpack",
      "draw-pool",
      "task-record",
    ]);
  });

  it("maps secondary panels without mock values", () => {
    expect(toSupplyDrawPoolPreview(snapshot).wallet.ticketBalance).toBe(5);
    expect(toSupplyBackpackPreview(snapshot).sidebar.capacity).toBe("17/60");
    expect(toSupplyShopPreview(snapshot).products[0]).toMatchObject({
      sourceItemId: "task_reroll_coupon",
      name: "任务换班券",
      price: { amount: 150 },
      ownedQuantity: 3,
    });
    expect(toSupplyTaskRecordPreview(snapshot).recordsByDate["2026-05-26"][0]).toMatchObject({
      id: "row-1",
      title: "购买补给",
    });
  });

  it("maps available teammates to direct social backpack items", () => {
    const socialSnapshot: SupplyStationProductionSnapshot = {
      ...snapshot,
      backpack: {
        ...snapshot.backpack,
        groups: [
          {
            category: "social",
            label: "社交",
            totalQuantity: 1,
            items: [
              {
                itemId: "drink_water_ping",
                category: "social",
                categoryLabel: "社交",
                name: "点名喝水令",
                description: "点名一位成员喝水，对方确认后生成响应记录。",
                quantity: 1,
                reservedQuantity: 0,
                availableQuantity: 1,
                useEnabled: true,
                useDisabledReason: null,
                useTiming: "instant",
                useTimingLabel: "立即生效",
                effectSummary: "发起 1 次喝水提醒",
                usageLimitSummary: "每天最多使用 2 张",
                stackable: true,
                requiresAdminConfirmation: false,
                enabled: true,
                knownDefinition: true,
              },
            ],
          },
        ],
      },
      social: {
        ...snapshot.social,
        availableRecipients: [
          { userId: "u2", username: "han", avatarKey: "female1" },
          { userId: "u3", username: "wang", avatarKey: "male2" },
        ],
      },
    };

    const backpack = toSupplyBackpackPreview(socialSnapshot, "drink_water_ping");

    expect(backpack.selectedItemDetail.socialTargets).toEqual(socialSnapshot.social.availableRecipients);
  });

  it("maps claimed daily quest reward state to the dashboard preview", () => {
    const claimedSnapshot: SupplyStationProductionSnapshot = {
      ...snapshot,
      drawPool: {
        ...snapshot.drawPool,
        wallet: {
          ...snapshot.drawPool.wallet,
          lifeTicketClaimable: false,
          lifeTicketEarned: true,
        },
      },
    };

    expect(toSupplyDashboardPreview(claimedSnapshot).dailyReward).toEqual({
      claimable: false,
      claimed: true,
    });
  });
});
