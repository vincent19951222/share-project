import "server-only";

import { buildSupplyAiImageSnapshot } from "@/lib/gamification/ai-image/snapshot";
import { settleTimedOutAiImageTasksForUser } from "@/lib/gamification/ai-image/tasks";
import { prisma } from "@/lib/prisma";
import type { AiImageSnapshot } from "@/lib/types";

export async function buildAiImageViewModelForUser(
  userId: string,
  now: Date = new Date(),
): Promise<AiImageSnapshot | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true, coins: true },
  });

  if (!user) {
    return null;
  }

  await settleTimedOutAiImageTasksForUser({ userId: user.id, now });

  return buildSupplyAiImageSnapshot({
    userId: user.id,
    teamId: user.teamId,
    coins: user.coins,
  });
}
