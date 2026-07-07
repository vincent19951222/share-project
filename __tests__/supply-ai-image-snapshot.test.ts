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
        coinCost: 20,
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

    const unsafeTask = await prisma.aiImageGenerationTask.create({
      data: {
        userId,
        teamId,
        themeId: "theme-01",
        userPrompt: "unsafe image payload",
        requestedCount: 1,
        status: "completed",
        coinCost: 10,
        coinRefunded: false,
        refundedCoinAmount: 0,
        providerModel: "gpt-image-2",
        promptSnapshotJson: JSON.stringify({
          themeId: "theme-01",
          providerPrompt: "unsafe prompt metadata",
        }),
        createdAt: new Date("2026-07-06T07:30:00+08:00"),
      },
    });

    const unsafeItem = await prisma.aiImageGenerationItem.create({
      data: {
        taskId: unsafeTask.id,
        userId,
        teamId,
        themeId: "theme-01",
        index: 0,
        status: "completed",
        imageUrl: "data:image/png;base64,c2VjcmV0",
      },
    });

    await prisma.aiImageArtwork.create({
      data: {
        taskId: unsafeTask.id,
        itemId: unsafeItem.id,
        userId,
        teamId,
        themeId: "theme-01",
        imageUrl: "data:image/png;base64,c2VjcmV0",
        cosKey: "unsafe-cos-key",
        promptSnapshotJson: unsafeTask.promptSnapshotJson,
        createdAt: new Date("2026-07-06T07:35:00+08:00"),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns converted coins, AI themes, recent tasks, artworks, and no primary ticket resource", async () => {
    const snapshot = await buildSupplyStationViewModelForUser(userId, fixedNow);
    const userAfterSnapshot = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(snapshot?.resources).toEqual({
      coins: { label: "银子", value: 1050 },
    });
    expect(snapshot?.supplyAiImage.wallet).toMatchObject({
      coins: 1050,
      generationCostPerImage: 10,
      themeDrawCost: 200,
    });
    expect(userAfterSnapshot.coins).toBe(1050);
    expect(userAfterSnapshot.ticketBalance).toBe(0);
    expect(snapshot?.supplyAiImage.themes.unlocked).toHaveLength(13);
    expect(snapshot?.supplyAiImage.themes.locked).toHaveLength(0);
    expect(snapshot?.supplyAiImage.themes.allUnlocked).toBe(true);
    expect(snapshot?.supplyAiImage.recentTasks).toMatchObject([
      {
        themeId: "theme-01",
        userPrompt: "训练后的像素海报",
        requestedCount: 2,
        status: "partial",
        coinCost: 20,
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
      {
        themeId: "theme-01",
        userPrompt: "unsafe image payload",
        items: [
          {
            index: 0,
            status: "completed",
            imageUrl: null,
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
    const serializedSnapshot = JSON.stringify(snapshot);
    expect(serializedSnapshot).not.toContain("promptTemplate");
    expect(serializedSnapshot).not.toContain("providerPrompt");
    expect(serializedSnapshot).not.toContain("server only prompt");
    expect(serializedSnapshot).not.toContain("unsafe prompt metadata");
    expect(serializedSnapshot).not.toContain("data:image");
    expect(serializedSnapshot).not.toContain("base64");
    expect(JSON.stringify(snapshot?.supplyAiImage.themes)).not.toContain("promptTemplate");
  });

  it("settles timed out running image tasks while building the primary supply snapshot", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { coins: 990, ticketBalance: 0 },
    });
    const task = await prisma.aiImageGenerationTask.create({
      data: {
        userId,
        teamId,
        themeId: "theme-01",
        userPrompt: "stuck task",
        requestedCount: 1,
        status: "running",
        coinCost: 10,
        coinRefunded: false,
        refundedCoinAmount: 0,
        providerModel: "gpt-image-2",
        promptSnapshotJson: JSON.stringify({
          themeId: "theme-01",
          providerPrompt: "server only prompt",
        }),
        createdAt: new Date("2026-07-06T08:40:00+08:00"),
        updatedAt: new Date("2026-07-06T08:40:00+08:00"),
      },
    });
    await prisma.aiImageGenerationItem.create({
      data: {
        taskId: task.id,
        userId,
        teamId,
        themeId: "theme-01",
        index: 0,
        status: "running",
        updatedAt: new Date("2026-07-06T08:40:00+08:00"),
      },
    });

    const snapshot = await buildSupplyStationViewModelForUser(userId, fixedNow);
    const settledTask = await prisma.aiImageGenerationTask.findUniqueOrThrow({
      where: { id: task.id },
      include: { items: true },
    });
    const userAfterSnapshot = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(settledTask.status).toBe("failed");
    expect(settledTask.refundedCoinAmount).toBe(10);
    expect(settledTask.items[0]?.status).toBe("failed");
    expect(userAfterSnapshot.coins).toBe(1000);
    expect(snapshot?.supplyAiImage.recentTasks[0]).toMatchObject({
      id: task.id,
      status: "failed",
      refundedCoinAmount: 10,
      retryAvailable: true,
    });
  });

  it("does not require old daily task assignments", async () => {
    const dayKey = getShanghaiDayKey(fixedNow);

    await buildSupplyStationViewModelForUser(userId, fixedNow);

    await expect(prisma.dailyTaskAssignment.count({ where: { userId, dayKey } })).resolves.toBe(0);
  });
});
