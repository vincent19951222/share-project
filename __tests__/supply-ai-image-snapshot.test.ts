import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { buildSupplyStationViewModelForUser } from "@/lib/gamification/supply-view-model";
import { prisma } from "@/lib/prisma";

describe("supply AI image snapshot", () => {
  const fixedNow = new Date("2026-07-06T09:00:00+08:00");
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;

    await prisma.user.update({
      where: { id: userId },
      data: { coins: 800, ticketBalance: 5 },
    });

    const task = await prisma.aiImageGenerationTask.create({
      data: {
        userId,
        teamId,
        themeId: "theme-01",
        userPrompt: "训练后的像素海报",
        requestedCount: 2,
        status: "partial",
        coinCost: 120,
        coinRefunded: false,
        refundedCoinAmount: 0,
        providerModel: "gpt-image-2",
        errorMessage: "有一张生成失败",
        promptSnapshotJson: JSON.stringify({
          themeId: "theme-01",
          providerPrompt: "server only prompt",
        }),
        createdAt: new Date("2026-07-06T08:00:00+08:00"),
      },
    });

    const completedItem = await prisma.aiImageGenerationItem.create({
      data: {
        taskId: task.id,
        userId,
        teamId,
        themeId: "theme-01",
        index: 0,
        status: "completed",
        imageUrl: "https://example.com/output-1.png",
        cosKey: "share-project/ai-images/li/output-1.png",
      },
    });

    await prisma.aiImageGenerationItem.create({
      data: {
        taskId: task.id,
        userId,
        teamId,
        themeId: "theme-01",
        index: 1,
        status: "failed",
        errorMessage: "provider timeout",
      },
    });

    await prisma.aiImageArtwork.create({
      data: {
        taskId: task.id,
        itemId: completedItem.id,
        userId,
        teamId,
        themeId: "theme-01",
        imageUrl: "https://example.com/output-1.png",
        cosKey: "share-project/ai-images/li/output-1.png",
        promptSnapshotJson: task.promptSnapshotJson,
        createdAt: new Date("2026-07-06T08:05:00+08:00"),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns coins, AI themes, recent tasks, artworks, and no primary ticket resource", async () => {
    const snapshot = await buildSupplyStationViewModelForUser(userId, fixedNow);

    expect(snapshot?.resources).toEqual({
      coins: { label: "银子", value: 800 },
    });
    expect(snapshot?.supplyAiImage.wallet).toMatchObject({
      coins: 800,
      generationCostPerImage: 60,
      themeDrawCost: 200,
    });
    expect(snapshot?.supplyAiImage.themes.unlocked).toHaveLength(1);
    expect(snapshot?.supplyAiImage.themes.locked).toHaveLength(12);
    expect(snapshot?.supplyAiImage.recentTasks).toMatchObject([
      {
        themeId: "theme-01",
        userPrompt: "训练后的像素海报",
        requestedCount: 2,
        status: "partial",
        coinCost: 120,
        refundedCoinAmount: 0,
        errorMessage: "有一张生成失败",
        retryAvailable: true,
        items: [
          {
            index: 0,
            status: "completed",
            imageUrl: "https://example.com/output-1.png",
          },
          {
            index: 1,
            status: "failed",
            errorMessage: "provider timeout",
          },
        ],
      },
    ]);
    expect(snapshot?.supplyAiImage.recentArtworks).toMatchObject([
      {
        themeId: "theme-01",
        imageUrl: "https://example.com/output-1.png",
      },
    ]);
    expect(JSON.stringify(snapshot)).not.toContain("promptTemplate");
    expect(JSON.stringify(snapshot)).not.toContain("server only prompt");
  });

  it("does not require old daily task assignments", async () => {
    const dayKey = getShanghaiDayKey(fixedNow);

    await buildSupplyStationViewModelForUser(userId, fixedNow);

    await expect(prisma.dailyTaskAssignment.count({ where: { userId, dayKey } })).resolves.toBe(0);
  });
});
