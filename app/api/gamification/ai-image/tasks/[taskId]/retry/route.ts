import { NextResponse, type NextRequest } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { AiImageTaskError, retryAiImageTask } from "@/lib/gamification/ai-image/tasks";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { taskId } = await params;
    const task = await retryAiImageTask({ userId, taskId });

    return NextResponse.json({ taskId: task.id });
  } catch (error) {
    if (error instanceof AiImageTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
