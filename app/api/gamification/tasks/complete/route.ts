import { NextResponse, type NextRequest } from "next/server";
import type { TaskDimensionKey } from "@/content/gamification/types";
import { parseCookieValue } from "@/lib/auth";
import { completeDailyTask, GamificationTaskError } from "@/lib/gamification/tasks";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
      dimensionKey?: string;
      completionText?: string;
    };

    if (!payload.dimensionKey) {
      return NextResponse.json({ error: "缺少任务维度" }, { status: 400 });
    }

    const snapshot = await completeDailyTask({
      userId,
      dimensionKey: payload.dimensionKey as TaskDimensionKey,
      completionText: payload.completionText,
    });

    return NextResponse.json({ snapshot });
  } catch (error) {
    if (error instanceof GamificationTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
