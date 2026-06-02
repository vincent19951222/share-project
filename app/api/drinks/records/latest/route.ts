import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildDrinkSnapshotForUser } from "@/lib/drink-state";
import {
  isDrinkRecordNotFoundError,
  removeLatestDrinkRecordForUser,
} from "@/lib/drink-records";
import { isDrinkType } from "@/lib/drinks";
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

    const body = (await request.json().catch(() => ({}))) as { drinkType?: unknown };

    if (body.drinkType !== undefined && !isDrinkType(body.drinkType)) {
      return NextResponse.json({ error: "饮品类型不支持" }, { status: 400 });
    }

    try {
      await removeLatestDrinkRecordForUser({
        user,
        drinkType: body.drinkType,
        activityMode: "drink",
      });
    } catch (error) {
      if (isDrinkRecordNotFoundError(error)) {
        return NextResponse.json({ error: "今天还没有可撤销的饮品" }, { status: 409 });
      }

      throw error;
    }

    const snapshot = await buildDrinkSnapshotForUser(user.id);

    if (!snapshot) {
      return NextResponse.json({ error: "快照生成失败" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
