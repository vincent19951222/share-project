import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildCoffeeAddActivityMessage, ACTIVITY_EVENT_TYPES } from "@/lib/activity-events";
import { buildCoffeeSnapshotForUser } from "@/lib/coffee-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, teamId: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    await prisma.$transaction(async (tx) => {
      const dayKey = getShanghaiDayKey();

      await tx.coffeeRecord.create({
        data: {
          userId: user.id,
          teamId: user.teamId,
          dayKey,
        },
      });

      const totalCups = await tx.coffeeRecord.count({
        where: {
          userId: user.id,
          teamId: user.teamId,
          dayKey,
          deletedAt: null,
        },
      });

      await tx.activityEvent.create({
        data: {
          teamId: user.teamId,
          userId: user.id,
          type: ACTIVITY_EVENT_TYPES.COFFEE_ADD,
          message: buildCoffeeAddActivityMessage(user.username, totalCups),
          assetAwarded: null,
        },
      });
    });

    const snapshot = await buildCoffeeSnapshotForUser(user.id);

    if (!snapshot) {
      return NextResponse.json({ error: "快照生成失败" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
