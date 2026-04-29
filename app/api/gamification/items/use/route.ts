import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import { buildGamificationStateForUser } from "@/lib/gamification/state";
import { ItemUseError, useInventoryItem } from "@/lib/gamification/item-use";

type ItemUsePayload = {
  itemId?: unknown;
  target?: {
    dimensionKey?: unknown;
  };
};

function normalizeDimensionKey(value: unknown) {
  if (
    value === "movement" ||
    value === "hydration" ||
    value === "social" ||
    value === "learning"
  ) {
    return value;
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as ItemUsePayload | null;

    if (!payload || typeof payload.itemId !== "string" || payload.itemId.trim().length === 0) {
      return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
    }

    const dimensionKey = normalizeDimensionKey(payload.target?.dimensionKey);
    const result = await useInventoryItem({
      userId,
      itemId: payload.itemId,
      target: dimensionKey ? { dimensionKey } : undefined,
    });
    const snapshot = await buildGamificationStateForUser(userId);

    if (!snapshot) {
      return NextResponse.json({ error: "snapshot-build-failed" }, { status: 500 });
    }

    return NextResponse.json({
      snapshot,
      itemUse: result.itemUse,
    });
  } catch (error) {
    if (error instanceof ItemUseError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
