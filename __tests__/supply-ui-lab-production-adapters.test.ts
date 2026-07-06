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
  supplyAiImage: {
    wallet: { coins: 0, generationCostPerImage: 60, themeDrawCost: 200 },
    themes: { unlocked: [], locked: [], allUnlocked: false },
    recentTasks: [],
    recentArtworks: [],
  },
  legacyArchive: { ticketBalance: 0, inventoryQuantity: 0, redemptionCount: 0, latestTaskRecordCount: 0 },
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
    expect(dashboard.resources.map((resource) => resource.label)).toEqual(["银子"]);
    expect(dashboard.resources[0]).toMatchObject({ value: 845 });
    expect(dashboard.dailyQuests[0]).toMatchObject({
      id: "movement",
      title: "屁股离线",
      description: "找一个理由离开座位走一小圈。",
      completed: true,
    });
    expect(dashboard.dailyQuests[0].image).toContain("share_project_public_assets_task_cards_illustrations_");
    expect(dashboard.shortcutLinks.map((link) => link.id)).toEqual([
      "home",
      "backpack",
    ]);
  });

  it("does not promote legacy draw, task record, ticket, or redemption entrypoints from the dashboard preview", () => {
    const dashboard = toSupplyDashboardPreview({
      ...snapshot,
      drawPool: {
        ...snapshot.drawPool,
        wallet: {
          ...snapshot.drawPool.wallet,
          lifeTicketClaimable: true,
          lifeTicketEarned: false,
        },
      },
    });
    const serializedShortcuts = JSON.stringify(dashboard.shortcutLinks);

    expect(serializedShortcuts).not.toContain("draw-pool");
    expect(serializedShortcuts).not.toContain("task-record");
    expect(serializedShortcuts).not.toContain("/dashboard/cards");
    expect(serializedShortcuts).not.toContain("/dashboard/quest");
    expect(serializedShortcuts).not.toContain("抽奖池");
    expect(serializedShortcuts).not.toContain("任务记录");
    expect(dashboard.motto).not.toContain("今日主线");
    expect(dashboard.dailyReward).toEqual({ claimable: false, claimed: true });
  });

  it("maps pending received social invitations to dashboard notice without restoring task-record shortcuts", () => {
    const snapshotWithInvite: SupplyStationProductionSnapshot = {
      ...snapshot,
      social: {
        ...snapshot.social,
        pendingReceivedCount: 1,
        received: [
          {
            id: "invite-water-1",
            senderUserId: "u2",
            senderUsername: "luo",
            recipientUserId: "u1",
            recipientUsername: "li",
            invitationType: "DRINK_WATER",
            status: "PENDING",
            dayKey: "2026-06-04",
            message: "喝口水",
            responseCount: 0,
            wechatWebhookSentAt: null,
            respondedAt: null,
            expiredAt: null,
            createdAt: "2026-06-04T02:00:00.000Z",
          },
        ],
      },
    };

    const dashboard = toSupplyDashboardPreview(snapshotWithInvite);

    expect(dashboard.socialInvitationNotice).toEqual({
      pendingCount: 1,
      title: "队友邀请待响应",
      message: "luo 邀请你喝水：喝口水",
      actionLabel: "去回应",
      target: "task-record",
    });
    expect(dashboard.shortcutLinks.find((link) => link.id === "task-record")).toBeUndefined();
  });

  it("maps secondary panels without mock values", () => {
    const taskRecord = toSupplyTaskRecordPreview(snapshot);

    expect(toSupplyDrawPoolPreview(snapshot).wallet.ticketBalance).toBe(5);
    expect(toSupplyBackpackPreview(snapshot).sidebar.capacity).toBe("17/60");
    expect(toSupplyShopPreview(snapshot).products[0]).toMatchObject({
      sourceItemId: "task_reroll_coupon",
      name: "任务换班券",
      price: { amount: 150 },
      ownedQuantity: 3,
    });
    expect(taskRecord.recordsByDate["2026-05-26"][0]).toMatchObject({
      id: "row-1",
      title: "购买补给",
    });
    expect(taskRecord.recordsByDate["2026-05-26"][0].reward).toBeUndefined();
    expect(taskRecord.recordsByDate["2026-05-26"][0].reward?.label).not.toBe("记录");
  });

  it("maps recent draw reward ids to their matching catalog media", () => {
    const drawPool = toSupplyDrawPoolPreview({
      ...snapshot,
      drawPool: {
        ...snapshot.drawPool,
        lottery: {
          ...snapshot.drawPool.lottery,
          recentDraws: [
            {
              id: "draw-recent",
              drawType: "TEN",
              ticketSpent: 10,
              coinSpent: 0,
              guaranteeApplied: false,
              createdAt: "2026-05-26T08:00:00.000Z",
              rewards: [
                {
                  rewardId: "reward_luckin_coffee",
                  rewardTier: "rare",
                  rewardKind: "real_world_redemption",
                  name: "瑞幸咖啡券",
                  description: "获得 1 张瑞幸咖啡券。",
                  effectSummary: "瑞幸咖啡券 x1",
                },
                {
                  rewardId: "reward_double_niuma",
                  rewardTier: "rare",
                  rewardKind: "inventory_item",
                  name: "双倍牛马券",
                  description: "获得 1 张双倍牛马券。",
                  effectSummary: "双倍牛马券 x1",
                },
              ],
            },
          ],
        },
      },
    });

    expect(drawPool.recentDrops[0]).toMatchObject({
      name: "瑞幸咖啡券",
      rarity: "SSR",
      image:
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_luckin_coffee_coupon.png",
    });
    expect(drawPool.recentDrops[1]).toMatchObject({
      name: "双倍牛马券",
      rarity: "SSR",
      image:
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_items_double_niuma_coupon.webp",
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
