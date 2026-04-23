import { NextRequest, NextResponse } from "next/server";
import { buildCoffeeSnapshotForUser } from "@/lib/coffee-state";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
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

    const latest = await prisma.coffeeRecord.findFirst({
      where: {
        userId: user.id,
        teamId: user.teamId,
        dayKey: getShanghaiDayKey(),
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!latest) {
      return NextResponse.json(
        { error: "今天还没有可撤销的咖啡" },
        { status: 409 },
      );
    }

    await prisma.coffeeRecord.update({
      where: { id: latest.id },
      data: { deletedAt: new Date() },
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
