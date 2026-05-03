import { NextRequest, NextResponse } from "next/server";
import { parseCookieValue } from "@/lib/auth";
import {
  cancelRealWorldRedemption,
  RedemptionServiceError,
} from "@/lib/gamification/redemptions";
import { prisma } from "@/lib/prisma";

type AdminRedemptionPayload = {
  redemptionId?: unknown;
  note?: unknown;
};

async function getAdminUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, teamId: true, role: true },
  });
}

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

    const payload = (await request.json().catch(() => null)) as AdminRedemptionPayload | null;

    if (
      !payload ||
      typeof payload.redemptionId !== "string" ||
      payload.redemptionId.trim().length === 0
    ) {
      return NextResponse.json({ error: "invalid-payload" }, { status: 400 });
    }

    const admin = await getAdminUser(userId);

    if (!admin) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }

    if (admin.role !== "ADMIN") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const redemption = await cancelRealWorldRedemption({
      adminUserId: admin.id,
      teamId: admin.teamId,
      redemptionId: payload.redemptionId.trim(),
      note: payload.note,
    });

    return NextResponse.json({
      redemption,
      inventory: {
        itemId: redemption.itemId,
        quantity: await getInventoryQuantity(redemption.userId, redemption.itemId),
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
