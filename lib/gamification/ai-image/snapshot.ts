import "server-only";

import {
  AI_IMAGE_GENERATION_COIN_COST,
  AI_IMAGE_THEME_DRAW_COIN_COST,
} from "@/lib/gamification/ai-image/constants";
import { toClientThemeSnapshot } from "@/lib/gamification/ai-image/theme-snapshot";
import { getAiImageThemes } from "@/lib/gamification/ai-image/themes";
import { getUnlockedAiImageThemeIds } from "@/lib/gamification/ai-image/theme-unlocks";
import { prisma } from "@/lib/prisma";
import type { SupplyAiImageSnapshot } from "@/lib/types";

function isRetryAvailable(status: string) {
  return status === "failed" || status === "partial";
}

export async function buildSupplyAiImageSnapshot({
  userId,
  teamId,
  coins,
}: {
  userId: string;
  teamId: string;
  coins: number;
}): Promise<SupplyAiImageSnapshot> {
  const unlockedThemeIds = await getUnlockedAiImageThemeIds(userId);
  const themeSnapshots = getAiImageThemes()
    .filter((theme) => theme.enabled)
    .map((theme) => toClientThemeSnapshot(theme, unlockedThemeIds.has(theme.id)));

  const [recentTasks, recentArtworks] = await Promise.all([
    prisma.aiImageGenerationTask.findMany({
      where: { userId, teamId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 8,
      include: {
        items: {
          orderBy: { index: "asc" },
          select: {
            id: true,
            index: true,
            status: true,
            imageUrl: true,
            errorMessage: true,
          },
        },
      },
    }),
    prisma.aiImageArtwork.findMany({
      where: { userId, teamId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12,
      select: {
        id: true,
        taskId: true,
        itemId: true,
        themeId: true,
        imageUrl: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    wallet: {
      coins,
      generationCostPerImage: AI_IMAGE_GENERATION_COIN_COST,
      themeDrawCost: AI_IMAGE_THEME_DRAW_COIN_COST,
    },
    themes: {
      unlocked: themeSnapshots.filter((theme) => theme.unlocked),
      locked: themeSnapshots.filter((theme) => !theme.unlocked),
      allUnlocked: themeSnapshots.every((theme) => theme.unlocked),
    },
    recentTasks: recentTasks.map((task) => ({
      id: task.id,
      themeId: task.themeId,
      userPrompt: task.userPrompt ?? "",
      requestedCount: task.requestedCount,
      status: task.status as SupplyAiImageSnapshot["recentTasks"][number]["status"],
      coinCost: task.coinCost,
      refundedCoinAmount: task.refundedCoinAmount,
      errorMessage: task.errorMessage,
      retryAvailable: isRetryAvailable(task.status),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      items: task.items.map((item) => ({
        id: item.id,
        index: item.index,
        status: item.status as SupplyAiImageSnapshot["recentTasks"][number]["items"][number]["status"],
        imageUrl: item.imageUrl,
        errorMessage: item.errorMessage,
      })),
    })),
    recentArtworks: recentArtworks.map((artwork) => ({
      id: artwork.id,
      taskId: artwork.taskId,
      itemId: artwork.itemId,
      themeId: artwork.themeId,
      imageUrl: artwork.imageUrl,
      createdAt: artwork.createdAt.toISOString(),
    })),
  };
}
