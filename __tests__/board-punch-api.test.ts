import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/board/punch/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { PUNCH_REWARD_COINS, getCurrentBoardDay } from "@/lib/board-state";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/board/punch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${userId}` } : {}),
    },
    body: JSON.stringify({}),
  });
}

describe("POST /api/board/punch", () => {
  let userId: string;
  let today: number;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    today = getCurrentBoardDay(new Date());
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function resetTodayPunch() {
    await prisma.punchRecord.deleteMany({
      where: {
        userId,
        dayIndex: today,
      },
    });
  }

  it("returns 401 when unauthenticated", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("creates today's punch, increments coins once, and returns the latest snapshot", async () => {
    await resetTodayPunch();

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request(userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const currentUserRowIndex = body.snapshot.members.findIndex(
      (member: { id: string }) => member.id === body.snapshot.currentUserId,
    );

    const record = await prisma.punchRecord.findUnique({
      where: { userId_dayIndex: { userId, dayIndex: today } },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(record?.punched).toBe(true);
    expect(after.coins).toBe(before.coins + PUNCH_REWARD_COINS);
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(currentUserRowIndex).toBeGreaterThanOrEqual(0);
    expect(body.snapshot.gridData[currentUserRowIndex][today - 1]).toBe(true);
  });

  it("rejects a second punch on the same day without double-incrementing coins", async () => {
    await resetTodayPunch();
    await POST(request(userId));

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request(userId));
    expect(response.status).toBe(409);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.coins).toBe(before.coins);
  });

  it("allows only one successful concurrent punch and increments coins once", async () => {
    await resetTodayPunch();

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const [firstResponse, secondResponse] = await Promise.all([
      POST(request(userId)),
      POST(request(userId)),
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort((a, b) => a - b);
    const records = await prisma.punchRecord.findMany({
      where: {
        userId,
        dayIndex: today,
      },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(statuses).toEqual([200, 409]);
    expect(records).toHaveLength(1);
    expect(records[0]?.punched).toBe(true);
    expect(after.coins).toBe(before.coins + PUNCH_REWARD_COINS);
  });
});
