import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import {
  RedemptionServiceError,
  requestRealWorldRedemption,
} from "@/lib/gamification/redemptions";
import { prisma } from "@/lib/prisma";

type RedemptionRequestPayload = {
  itemId?: unknown;
};

async function getInventoryQuantity(userId: string, itemId: string) {
  const inventory = await prisma.inventoryItem.findUnique({
    where: {
      userId_itemId: {
        userId,
        itemId,
      },
    },
    select: { quantity: true },
  });

  return inventory?.quantity ?? 0;
}

export async function POST(request: NextRequest) {
  try {
    const userId = parseCookieValue(request.cookies.get("userId")?.value);

    if (!userId) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const payload = (await request.json().catch(() => null)) as RedemptionRequestPayload | null;

    if (!payload || typeof payload.itemId !== "string" || payload.itemId.trim().length === 0) {
      return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, teamId: true },
    });

    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    const itemId = payload.itemId.trim();
    const redemption = await requestRealWorldRedemption({
      userId: user.id,
      teamId: user.teamId,
      itemId,
    });

    return NextResponse.json({
      redemption,
      inventory: {
        itemId,
        quantity: await getInventoryQuantity(user.id, itemId),
      },
    });
  } catch (error) {
    if (error instanceof RedemptionServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json({ error: "server-error" }, { status: 500 });
  }
}
