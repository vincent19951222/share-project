import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildSupplyStationViewModelForUser } from "@/lib/gamification/supply-view-model";
import {
  ensureTodayTaskAssignments,
  GamificationTaskError,
} from "@/lib/gamification/tasks";

export async function GET(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    await ensureTodayTaskAssignments({ userId });
    const snapshot = await buildSupplyStationViewModelForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof GamificationTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
