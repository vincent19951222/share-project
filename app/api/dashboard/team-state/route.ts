import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildTeamDashboardSnapshot } from "@/lib/team-dashboard-state";
import type { DashboardPeriod } from "@/lib/types";

export async function GET(request: NextRequest) {
  const userId = parseCookieValue(request.cookies.get("userId")?.value);

  if (!userId) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true },
  });

  if (!user?.teamId) {
    return NextResponse.json({ error: "未加入团队" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawPeriod = searchParams.get("period");
  const period: DashboardPeriod = rawPeriod === "year" ? "year" : "month";

  try {
    const snapshot = await buildTeamDashboardSnapshot(user.teamId, period, new Date());

    if (!snapshot) {
      return NextResponse.json({ error: "团队不存在" }, { status: 404 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Team dashboard state error:", error);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
