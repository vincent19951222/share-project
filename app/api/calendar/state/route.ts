import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import {
  buildCalendarMonthSnapshotForUser,
  readCalendarMonthKey,
} from "@/lib/calendar-state";
import { getShanghaiDayKey } from "@/lib/economy";

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const currentMonthKey = getShanghaiDayKey(now).slice(0, 7);
    const monthKey = readCalendarMonthKey(
      request.nextUrl.searchParams.get("month"),
      currentMonthKey,
    );
    const snapshot = await buildCalendarMonthSnapshotForUser(userId, monthKey, now);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
