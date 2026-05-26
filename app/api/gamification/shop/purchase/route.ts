import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { purchaseShopItem, ShopPurchaseError } from "@/lib/gamification/shop";
import { buildGamificationStateForUser } from "@/lib/gamification/state";

type ShopPurchasePayload = {
  itemId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as ShopPurchasePayload | null;

    if (!payload || typeof payload.itemId !== "string" || payload.itemId.trim().length === 0) {
      return NextResponse.json({ error: "缺少商品 ID" }, { status: 400 });
    }

    const result = await purchaseShopItem({ userId, itemId: payload.itemId.trim() });
    const snapshot = await buildGamificationStateForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "用户不存在" }, { status: 401 });
    }

    return NextResponse.json({ purchase: result.purchase, snapshot });
  } catch (error) {
    if (error instanceof ShopPurchaseError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
