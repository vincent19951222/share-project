import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import {
  drawLottery,
  LotteryDrawError,
  type LotteryDrawType,
} from "@/lib/gamification/lottery";

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
      drawType?: string;
      useCoinTopUp?: boolean;
    };

    if (payload.drawType !== "SINGLE" && payload.drawType !== "TEN") {
      return NextResponse.json({ error: "未知抽奖类型" }, { status: 400 });
    }

    const result = await drawLottery({
      userId,
      drawType: payload.drawType as LotteryDrawType,
      useCoinTopUp: payload.useCoinTopUp === true,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof LotteryDrawError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
