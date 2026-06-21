import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildDashboardSnapshotForUser } from "@/lib/dashboard-state";
import { parseScopeFromQuery } from "@/lib/dashboard-scope";

export async function GET(request: NextRequest) {
  const userId = parseCookieValue(request.cookies.get("userId")?.value);

  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const now = new Date();
  const scope = parseScopeFromQuery(new URL(request.url).searchParams, now);

  try {
    const snapshot = await buildDashboardSnapshotForUser(userId, scope, now);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Dashboard state error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
