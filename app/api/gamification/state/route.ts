import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildGamificationStateForUser } from "@/lib/gamification/state";

export async function GET(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const snapshot = await buildGamificationStateForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
