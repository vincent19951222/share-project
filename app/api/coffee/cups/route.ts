import { NextRequest, NextResponse } from "next/server";
import { buildCoffeeSnapshotForUser } from "@/lib/coffee-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get("userId")?.value;

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, teamId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    await prisma.coffeeRecord.create({
      data: {
        userId: user.id,
        teamId: user.teamId,
        dayKey: getShanghaiDayKey(),
      },
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
