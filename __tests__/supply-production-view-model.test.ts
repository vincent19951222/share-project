import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { buildSupplyStationViewModelForUser } from "@/lib/gamification/supply-view-model";
import { ensureTodayTaskAssignments } from "@/lib/gamification/tasks";
import { prisma } from "@/lib/prisma";

describe("supply production view model", () => {
  const fixedNow = new Date("2026-05-25T09:00:00+08:00");
  let userId: string;
  let teamId: string;
  let username: string;
  let avatarKey: string;
  let role: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    username = user.username;
    avatarKey = user.avatarKey;
    role = user.role;

    await ensureTodayTaskAssignments({ userId, now: fixedNow, rng: () => 0.01 });
    await prisma.user.update({
      where: { id: userId },
      data: { coins: 2450, ticketBalance: 18, exp: 2720 },
    });
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "task_reroll_coupon", quantity: 2 },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("maps real state into the production supply snapshot", async () => {
    const snapshot = await buildSupplyStationViewModelForUser(userId, fixedNow);

    expect(snapshot).toMatchObject({
      currentUserId: userId,
      currentUserRole: role,
      teamId,
      dayKey: "2026-05-25",
      resources: {
        coins: { label: "银子", value: 2450 },
        ticket: { label: "抽奖券", value: 18 },
        backpack: { label: "背包", value: 2, maxValue: 60 },
      },
      profile: {
        username,
        avatarKey,
        level: 3,
        totalExp: 2720,
        currentLevelExp: 720,
        nextLevelExp: 1000,
        title: "自律牛马",
      },
    });
    expect(snapshot?.dashboard.dailyQuests).toHaveLength(4);
    expect(snapshot?.dashboard.todayEffects).toEqual([]);
    expect(snapshot?.drawPool.wallet.ticketBalance).toBe(18);
    expect(snapshot?.drawPool.lottery.status).toBe("active");
    expect(snapshot?.backpack.capacity).toEqual({ usedSlots: 2, totalSlots: 60 });
    expect(snapshot?.backpack.previewItems[0]).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 2,
    });
    expect(snapshot?.shop.products[0]).toMatchObject({
      itemId: "task_reroll_coupon",
      name: "任务换班券",
      priceCoins: 150,
      ownedQuantity: 2,
      dailyLimit: 1,
      purchaseEnabled: true,
      purchaseDisabledReason: null,
      requiresAdminConfirmation: false,
    });
    expect(snapshot?.taskRecord.dates).toHaveLength(7);
    expect(snapshot?.taskRecord.dates[0]).toMatchObject({
      key: "2026-05-25",
      label: "今天",
      dateLabel: "05/25",
      weekday: "周一",
    });
    expect(snapshot?.taskRecord.timeline).toEqual([]);
  });

  it("returns null for an unknown user", async () => {
    await expect(buildSupplyStationViewModelForUser("missing-user", fixedNow)).resolves.toBeNull();
  });
});
