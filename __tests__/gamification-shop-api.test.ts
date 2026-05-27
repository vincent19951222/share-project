import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/shop/purchase/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId: string | undefined, body: unknown) {
  return new NextRequest("http://localhost/api/gamification/shop/purchase", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userId ? { cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/gamification/shop/purchase", () => {
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request(undefined, { itemId: "task_reroll_coupon" }));

    expect(response.status).toBe(401);
  });

  it("returns 400 when itemId is missing or blank", async () => {
    const missingResponse = await POST(request(userId, {}));
    const blankResponse = await POST(request(userId, { itemId: "  " }));

    expect(missingResponse.status).toBe(400);
    expect(blankResponse.status).toBe(400);
  });

  it("purchases an item and returns purchase plus refreshed snapshot", async () => {
    const response = await POST(request(userId, { itemId: "task_reroll_coupon" }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.purchase).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 1,
      unitPriceCoins: 150,
      totalPriceCoins: 150,
      status: "SETTLED",
    });
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.backpack.totalQuantity).toBe(1);
    expect(body.snapshot.backpack.groups[0].items[0]).toMatchObject({
      itemId: "task_reroll_coupon",
      quantity: 1,
    });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: userId } })).resolves.toMatchObject({
      coins: 850,
    });
  });

  it("maps purchase service errors to stable response codes", async () => {
    await prisma.user.update({ where: { id: userId }, data: { coins: 10 } });

    const response = await POST(request(userId, { itemId: "task_reroll_coupon" }));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      code: "INSUFFICIENT_COINS",
      error: "银子不足。",
    });
  });
});
