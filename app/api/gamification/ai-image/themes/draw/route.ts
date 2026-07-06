import { NextResponse, type NextRequest } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import {
  AiImageThemeDrawError,
  drawAiImageTheme,
} from "@/lib/gamification/ai-image/theme-unlocks";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const result = await drawAiImageTheme({ userId });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AiImageThemeDrawError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
