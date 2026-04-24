import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import {
  ACTIVITY_EVENT_TYPES,
  buildCoffeeRemoveActivityMessage,
} from "@/lib/activity-events";
import { buildCoffeeSnapshotForUser } from "@/lib/coffee-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
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

    const dayKey = getShanghaiDayKey();

    try {
      await prisma.$transaction(async (tx) => {
        const latest = await tx.coffeeRecord.findFirst({
          where: {
            userId: user.id,
            teamId: user.teamId,
            dayKey,
            deletedAt: null,
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });

        if (!latest) {
          throw new Error("COFFEE_NOT_FOUND");
        }

        await tx.coffeeRecord.update({
          where: { id: latest.id },
          data: { deletedAt: new Date() },
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
            type: ACTIVITY_EVENT_TYPES.COFFEE_REMOVE,
            message: buildCoffeeRemoveActivityMessage(user.username, totalCups),
            assetAwarded: null,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "COFFEE_NOT_FOUND") {
        return NextResponse.json(
          { error: "今天还没有可撤销的咖啡" },
          { status: 409 },
        );
      }

      throw error;
    }
    const snapshot = await buildCoffeeSnapshotForUser(user.id);

    if (!snapshot) {
      return NextResponse.json({ error: "快照生成失败" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
