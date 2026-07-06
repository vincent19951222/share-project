import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

describe("AI image schema", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("stores theme unlocks, generation tasks, items, input images, and artworks", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });

    const unlock = await prisma.aiImageThemeUnlock.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        themeId: "theme-01",
        source: "default",
      },
    });

    const task = await prisma.aiImageGenerationTask.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        themeId: unlock.themeId,
        userPrompt: "训练后的像素海报",
        requestedCount: 2,
        status: "queued",
        coinCost: 120,
        coinRefunded: false,
        refundedCoinAmount: 0,
        providerModel: "gpt-image-2",
        promptSnapshotJson: JSON.stringify({ themeId: unlock.themeId }),
      },
    });

    const input = await prisma.aiImageTaskInputImage.create({
      data: {
        taskId: task.id,
        userId: user.id,
        teamId: user.teamId,
        imageUrl: "https://example.com/input.png",
        cosKey: "share-project/ai-images-inputs/u1/input.png",
        mimeType: "image/png",
        sizeBytes: 120,
        sortOrder: 0,
      },
    });

    const item = await prisma.aiImageGenerationItem.create({
      data: {
        taskId: task.id,
        userId: user.id,
        teamId: user.teamId,
        themeId: unlock.themeId,
        index: 0,
        status: "completed",
        imageUrl: "https://example.com/output.png",
        cosKey: "share-project/ai-images/u1/output.png",
      },
    });

    const artwork = await prisma.aiImageArtwork.create({
      data: {
        taskId: task.id,
        itemId: item.id,
        userId: user.id,
        teamId: user.teamId,
        themeId: unlock.themeId,
        imageUrl: item.imageUrl!,
        cosKey: item.cosKey!,
        promptSnapshotJson: task.promptSnapshotJson,
      },
    });

    await expect(
      prisma.aiImageTaskInputImage.findUnique({ where: { id: input.id } }),
    ).resolves.toBeTruthy();
    await expect(
      prisma.aiImageArtwork.findUnique({ where: { id: artwork.id } }),
    ).resolves.toBeTruthy();
  });

  it("seedDatabase clears AI image rows for the seed team", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const task = await prisma.aiImageGenerationTask.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        themeId: "theme-01",
        requestedCount: 1,
        status: "failed",
        coinCost: 60,
        coinRefunded: true,
        refundedCoinAmount: 60,
        providerModel: "gpt-image-2",
        errorMessage: "mock failure",
        promptSnapshotJson: "{}",
      },
    });

    await prisma.aiImageGenerationItem.create({
      data: {
        taskId: task.id,
        userId: user.id,
        teamId: user.teamId,
        themeId: "theme-01",
        index: 0,
        status: "failed",
        errorMessage: "mock failure",
      },
    });

    await seedDatabase();

    await expect(prisma.aiImageGenerationTask.count()).resolves.toBe(0);
    await expect(prisma.aiImageGenerationItem.count()).resolves.toBe(0);
  });
});
