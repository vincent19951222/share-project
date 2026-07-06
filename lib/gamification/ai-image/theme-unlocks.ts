import "server-only";

import { AI_IMAGE_THEME_DRAW_COIN_COST } from "@/lib/gamification/ai-image/constants";
import { toClientThemeSnapshot } from "@/lib/gamification/ai-image/theme-snapshot";
import { getDefaultUnlockedAiImageThemeIds, getAiImageThemeById, getAiImageThemes } from "@/lib/gamification/ai-image/themes";
import { prisma, type PrismaClientOrTransaction } from "@/lib/prisma";
import type { AiImageThemeSnapshot } from "@/lib/types";

function buildUnlockedThemeSet(themeIds: string[]) {
  return new Set<string>([...getDefaultUnlockedAiImageThemeIds(), ...themeIds]);
}

async function listUnlockedThemeIds(
  client: PrismaClientOrTransaction,
  userId: string,
): Promise<string[]> {
  const unlocks = await client.aiImageThemeUnlock.findMany({
    where: { userId },
    select: { themeId: true },
  });

  return unlocks.map((unlock) => unlock.themeId);
}

export async function getUnlockedAiImageThemeIds(userId: string): Promise<Set<string>> {
  return buildUnlockedThemeSet(await listUnlockedThemeIds(prisma, userId));
}

export async function assertAiImageThemeUnlocked(input: {
  userId: string;
  themeId: string;
}): Promise<void> {
  const theme = getAiImageThemeById(input.themeId);

  if (!theme || !theme.enabled) {
    throw new Error("主题不存在");
  }

  const unlockedThemeIds = await getUnlockedAiImageThemeIds(input.userId);

  if (!unlockedThemeIds.has(input.themeId)) {
    throw new Error("主题未解锁");
  }
}

function pickTheme<T>(items: T[], rng: () => number) {
  const clamped = Math.min(Math.max(rng(), 0), 0.999999);
  return items[Math.floor(clamped * items.length)] ?? items[0];
}

export async function drawAiImageTheme(input: {
  userId: string;
  rng?: () => number;
}): Promise<{ theme: AiImageThemeSnapshot }> {
  const rng = input.rng ?? Math.random;

  const theme = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, teamId: true, coins: true },
    });

    if (!user) {
      throw new Error("用户不存在");
    }

    const unlockedThemeIds = buildUnlockedThemeSet(await listUnlockedThemeIds(tx, input.userId));
    const candidates = getAiImageThemes().filter(
      (themeEntry) => themeEntry.enabled && !unlockedThemeIds.has(themeEntry.id),
    );

    if (candidates.length === 0) {
      throw new Error("主题已集齐");
    }

    if (user.coins < AI_IMAGE_THEME_DRAW_COIN_COST) {
      throw new Error("银子不足");
    }

    const selected = pickTheme(candidates, rng);

    await tx.user.update({
      where: { id: user.id },
      data: { coins: { decrement: AI_IMAGE_THEME_DRAW_COIN_COST } },
    });
    await tx.aiImageThemeUnlock.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        themeId: selected.id,
        source: "draw",
      },
    });

    return toClientThemeSnapshot(selected, true);
  });

  return { theme };
}
