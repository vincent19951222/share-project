import { NextResponse, type NextRequest } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { drawAiImageTheme } from "@/lib/gamification/ai-image/theme-unlocks";

function resolveThemeDrawErrorStatus(message: string) {
  if (message === "用户不存在") {
    return 401;
  }

  if (message === "银子不足" || message === "主题已集齐") {
    return 409;
  }

  return 500;
}

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const result = await drawAiImageTheme({ userId });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: resolveThemeDrawErrorStatus(error.message) },
      );
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
