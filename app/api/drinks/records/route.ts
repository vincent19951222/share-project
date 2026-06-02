import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildDrinkSnapshotForUser } from "@/lib/drink-state";
import { createDrinkRecordForUser } from "@/lib/drink-records";
import { isDrinkType, normalizeDrinkNote } from "@/lib/drinks";
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

    const body = (await request.json().catch(() => null)) as {
      drinkType?: unknown;
      note?: unknown;
    } | null;

    if (!isDrinkType(body?.drinkType)) {
      return NextResponse.json({ error: "饮品类型不支持" }, { status: 400 });
    }

    await createDrinkRecordForUser({
      user,
      drinkType: body.drinkType,
      note: normalizeDrinkNote(body.note),
      activityMode: "drink",
    });

    const snapshot = await buildDrinkSnapshotForUser(user.id);

    if (!snapshot) {
      return NextResponse.json({ error: "快照生成失败" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
