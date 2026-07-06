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
    const completedTask = await prisma.aiImageGenerationTask.create({
      data: {
        userId,
        teamId,
        themeId: "theme-01",
        userPrompt: "训练海报",
        requestedCount: 1,
        status: "completed",
        coinCost: 60,
        coinRefunded: false,
        refundedCoinAmount: 0,
        providerModel: "gpt-image-2",
        promptSnapshotJson: JSON.stringify({ providerPrompt: "secret server prompt" }),
        createdAt: new Date("2026-05-25T08:20:00+08:00"),
      },
    });
    const completedItem = await prisma.aiImageGenerationItem.create({
      data: {
        taskId: completedTask.id,
        userId,
        teamId,
        themeId: "theme-01",
        index: 0,
        status: "completed",
        imageUrl: "https://example.com/artwork.png",
        cosKey: "share-project/ai-images/li/artwork.png",
      },
    });
    await prisma.aiImageArtwork.create({
      data: {
        taskId: completedTask.id,
        itemId: completedItem.id,
        userId,
        teamId,
        themeId: "theme-01",
        imageUrl: completedItem.imageUrl!,
        cosKey: completedItem.cosKey!,
        promptSnapshotJson: completedTask.promptSnapshotJson,
      },
    });
    await prisma.experienceLedger.create({
      data: {
        userId,
        teamId,
        dayKey: "2026-05-25",
        delta: 50,
        balanceAfter: 2720,
        reason: "DAILY_TASK_COMPLETION_EXP",
        sourceType: "view_model_test",
        sourceId: "view-model-exp-1",
        createdAt: new Date("2026-05-25T08:30:00+08:00"),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("maps real state into the phase 1 supply snapshot and archives old systems", async () => {
    const snapshot = await buildSupplyStationViewModelForUser(userId, fixedNow);

    expect(snapshot).toMatchObject({
      currentUserId: userId,
      currentUserRole: role,
      teamId,
      dayKey: "2026-05-25",
      resources: {
        coins: { label: "银子", value: 2450 },
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
    expect(snapshot?.resources.ticket).toBeUndefined();
    expect(snapshot?.dashboard.dailyQuests).toEqual([]);
    expect(snapshot?.dashboard.todayEffects).toEqual([]);
    expect(snapshot?.drawPool.wallet.ticketBalance).toBe(0);
    expect(snapshot?.drawPool.lottery.status).toBe("active");
    expect(snapshot?.drawPool.lottery.singleDrawEnabled).toBe(false);
    expect(snapshot?.drawPool.lottery.tenDrawEnabled).toBe(false);
    expect(snapshot?.drawPool.lottery.message).toBe("旧抽奖池已下线，主题扭蛋请使用 AI 生图入口。");
    expect(snapshot?.shop.products).toEqual([]);
    expect(snapshot?.supplyAiImage.wallet).toMatchObject({
      coins: 2450,
      generationCostPerImage: 60,
      themeDrawCost: 200,
    });
    expect(snapshot?.supplyAiImage.recentTasks).toMatchObject([
      {
        themeId: "theme-01",
        status: "completed",
        requestedCount: 1,
      },
    ]);
    expect(snapshot?.supplyAiImage.recentArtworks).toMatchObject([
      {
        themeId: "theme-01",
        imageUrl: "https://example.com/artwork.png",
      },
    ]);
    expect(snapshot?.legacyArchive).toEqual({
      ticketBalance: 18,
      inventoryQuantity: 2,
      redemptionCount: 0,
      latestTaskRecordCount: 4,
    });
    expect(snapshot?.taskRecord.dates).toHaveLength(7);
    expect(snapshot?.taskRecord.dates[0]).toMatchObject({
      key: "2026-05-25",
      label: "今天",
      dateLabel: "05/25",
      weekday: "周一",
    });
    expect(snapshot?.taskRecord.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "exp",
          title: "获得 EXP",
          subtitle: expect.stringContaining("+50 EXP"),
        }),
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toContain("promptTemplate");
    expect(JSON.stringify(snapshot)).not.toContain("secret server prompt");
  });

  it("returns null for an unknown user", async () => {
    await expect(buildSupplyStationViewModelForUser("missing-user", fixedNow)).resolves.toBeNull();
  });
});
