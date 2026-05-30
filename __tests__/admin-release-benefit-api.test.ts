import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/gamification/release-benefit/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId: string | undefined, body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/gamification/release-benefit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/gamification/release-benefit", () => {
  const fixedNow = new Date("2026-05-31T10:00:00+08:00");
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
    teamId = admin.teamId;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("grants 20 release benefit tickets to every team member and writes a team notification", async () => {
    const teamMembers = await prisma.user.findMany({ where: { teamId } });

    const response = await POST(
      request(adminId, {
        grantKey: "release-0.3.0",
        message: "0.3.0 大版本更新福利已到账",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      amount: 20,
      grantKey: "release-0.3.0",
      grantedCount: teamMembers.length,
    });

    const users = await prisma.user.findMany({
      where: { teamId },
      orderBy: { username: "asc" },
    });
    const ledgers = await prisma.lotteryTicketLedger.findMany({
      where: {
        teamId,
        reason: "MANUAL_RELEASE_BENEFIT_GRANTED",
        sourceType: "manual_release_benefit",
      },
    });
    const dynamic = await prisma.teamDynamic.findFirstOrThrow({
      where: {
        teamId,
        type: "GAME_RELEASE_BENEFIT",
        sourceType: "manual_release_benefit",
        sourceId: `${teamId}:release-0.3.0`,
      },
    });

    expect(users.every((user) => user.ticketBalance === 20)).toBe(true);
    expect(ledgers).toHaveLength(teamMembers.length);
    expect(ledgers.every((ledger) => ledger.delta === 20)).toBe(true);
    expect(dynamic.title).toContain("版本福利");
    expect(dynamic.summary).toContain("20 张抽奖券");
    expect(dynamic.actorUserId).toBe(adminId);
  });

  it("rejects a duplicate release benefit batch without granting tickets again", async () => {
    const payload = {
      grantKey: "release-0.3.0",
      message: "0.3.0 大版本更新福利已到账",
    };

    expect((await POST(request(adminId, payload))).status).toBe(200);

    const duplicateResponse = await POST(request(adminId, payload));
    const users = await prisma.user.findMany({ where: { teamId } });
    const ledgerCount = await prisma.lotteryTicketLedger.count({
      where: {
        teamId,
        reason: "MANUAL_RELEASE_BENEFIT_GRANTED",
        sourceType: "manual_release_benefit",
      },
    });

    expect(duplicateResponse.status).toBe(409);
    await expect(duplicateResponse.json()).resolves.toMatchObject({
      error: "benefit-already-granted",
    });
    expect(users.every((user) => user.ticketBalance === 20)).toBe(true);
    expect(ledgerCount).toBe(users.length);
  });

  it("rejects release benefit grants from non-admin users", async () => {
    const response = await POST(
      request(memberId, {
        grantKey: "release-0.3.0",
        message: "0.3.0 大版本更新福利已到账",
      }),
    );

    expect(response.status).toBe(403);
  });
});
