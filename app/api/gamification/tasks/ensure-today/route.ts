import { NextResponse, type NextRequest } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import {
  ensureTodayTaskAssignments,
  GamificationTaskError,
} from "@/lib/gamification/tasks";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const snapshot = await ensureTodayTaskAssignments({ userId });
    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof GamificationTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
