import { NextResponse, type NextRequest } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { AiImageTaskError, createAiImageTask } from "@/lib/gamification/ai-image/tasks";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
      themeId?: string;
      userPrompt?: string;
      requestedCount?: 1 | 2 | 4;
      referenceImages?: Array<{ dataUrl: string; filename: string }>;
    };

    const task = await createAiImageTask({
      userId,
      themeId: payload.themeId ?? "",
      userPrompt: payload.userPrompt,
      requestedCount: payload.requestedCount ?? 1,
      referenceImages: Array.isArray(payload.referenceImages) ? payload.referenceImages : [],
    });

    return NextResponse.json({ taskId: task.id });
  } catch (error) {
    if (error instanceof AiImageTaskError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
