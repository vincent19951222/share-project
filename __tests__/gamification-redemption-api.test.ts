import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as cancelPOST } from "@/app/api/admin/gamification/redemptions/cancel/route";
import { POST as confirmPOST } from "@/app/api/admin/gamification/redemptions/confirm/route";
import { POST as requestPOST } from "@/app/api/gamification/redemptions/request/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(url: string, userId: string | undefined, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userId ? { cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("gamification real-world redemption API", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();

    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    teamId = member.teamId;

    await prisma.realWorldRedemption.deleteMany({ where: { teamId } });
    await prisma.inventoryItem.deleteMany({ where: { teamId } });
  });

  it("requires authentication to request a redemption", async () => {
    const response = await requestPOST(
      request("http://localhost/api/gamification/redemptions/request", undefined, {
        itemId: "luckin_coffee_coupon",
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects invalid request payloads", async () => {
    const response = await requestPOST(
      request("http://localhost/api/gamification/redemptions/request", memberId, {
        itemId: "",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("requests a redemption and returns updated inventory quantity", async () => {
    await prisma.inventoryItem.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", quantity: 1 },
    });

    const response = await requestPOST(
      request("http://localhost/api/gamification/redemptions/request", memberId, {
        itemId: "luckin_coffee_coupon",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.redemption).toMatchObject({
      userId: memberId,
      itemId: "luckin_coffee_coupon",
      status: "REQUESTED",
    });
    expect(body.inventory).toEqual({
      itemId: "luckin_coffee_coupon",
      quantity: 0,
    });
  });

  it("requires admin role to confirm a redemption", async () => {
    const redemption = await prisma.realWorldRedemption.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", status: "REQUESTED" },
    });

    const response = await confirmPOST(
      request("http://localhost/api/admin/gamification/redemptions/confirm", memberId, {
        redemptionId: redemption.id,
      }),
    );

    expect(response.status).toBe(403);
  });

  it("prevents admins from confirming another team's redemption", async () => {
    const otherTeam = await prisma.team.create({ data: { name: "Other", code: "OTHER-GM10" } });
    const otherUser = await prisma.user.create({
      data: {
        username: "other-member",
        password: "x",
        avatarKey: "male1",
        teamId: otherTeam.id,
      },
    });
    const redemption = await prisma.realWorldRedemption.create({
      data: {
        userId: otherUser.id,
        teamId: otherTeam.id,
        itemId: "luckin_coffee_coupon",
        status: "REQUESTED",
      },
    });

    const response = await confirmPOST(
      request("http://localhost/api/admin/gamification/redemptions/confirm", adminId, {
        redemptionId: redemption.id,
      }),
    );
    const unchanged = await prisma.realWorldRedemption.findUniqueOrThrow({
      where: { id: redemption.id },
    });

    expect(response.status).toBe(404);
    expect(unchanged.status).toBe("REQUESTED");
  });

  it("confirms a requested redemption", async () => {
    const redemption = await prisma.realWorldRedemption.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", status: "REQUESTED" },
    });

    const response = await confirmPOST(
      request("http://localhost/api/admin/gamification/redemptions/confirm", adminId, {
        redemptionId: redemption.id,
        note: "done",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.redemption).toMatchObject({
      id: redemption.id,
      status: "CONFIRMED",
      confirmedByUsername: "li",
      note: "done",
    });
  });

  it("cancels a requested redemption and refunds inventory once", async () => {
    const redemption = await prisma.realWorldRedemption.create({
      data: { userId: memberId, teamId, itemId: "luckin_coffee_coupon", status: "REQUESTED" },
    });

    const response = await cancelPOST(
      request("http://localhost/api/admin/gamification/redemptions/cancel", adminId, {
        redemptionId: redemption.id,
      }),
    );
    const body = await response.json();
    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });

    expect(response.status).toBe(200);
    expect(body.redemption).toMatchObject({
      id: redemption.id,
      status: "CANCELLED",
      cancelledByUsername: "li",
    });
    expect(body.inventory).toEqual({
      itemId: "luckin_coffee_coupon",
      quantity: 1,
    });
    expect(inventory.quantity).toBe(1);

    const secondResponse = await cancelPOST(
      request("http://localhost/api/admin/gamification/redemptions/cancel", adminId, {
        redemptionId: redemption.id,
      }),
    );
    const unchanged = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId: memberId, itemId: "luckin_coffee_coupon" } },
    });

    expect(secondResponse.status).toBe(409);
    expect(unchanged.quantity).toBe(1);
  });
});
