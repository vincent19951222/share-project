import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/gamification/reports/weekly/route";
import { POST } from "@/app/api/gamification/reports/weekly/publish/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function weeklyRequest(userId?: string, weekStart?: string) {
  const url = new URL("http://localhost/api/gamification/reports/weekly");
  if (weekStart) {
    url.searchParams.set("weekStart", weekStart);
  }

  return new NextRequest(url, {
    method: "GET",
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

function publishRequest(
  userId: string | undefined,
  body: { weekStartDayKey?: string; sendEnterpriseWechat?: boolean },
) {
  return new NextRequest("http://localhost/api/gamification/reports/weekly/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("gamification weekly report API", () => {
  let adminId: string;
  let memberId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });

    adminId = admin.id;
    memberId = member.id;
    teamId = admin.teamId;
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    await prisma.teamDynamicReadState.deleteMany({ where: { teamDynamic: { teamId } } });
    await prisma.teamDynamic.deleteMany({ where: { teamId } });
  });

  it("returns 401 for unauthenticated reads", async () => {
    const response = await GET(weeklyRequest());

    expect(response.status).toBe(401);
  });

  it("allows signed-in members to read their team weekly report", async () => {
    const response = await GET(weeklyRequest(memberId, "2026-04-20"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot).toMatchObject({
      teamId,
      weekStartDayKey: "2026-04-20",
      weekEndDayKey: "2026-04-26",
      published: false,
    });
  });

  it("rejects non-admin publish requests", async () => {
    const response = await POST(
      publishRequest(memberId, {
        weekStartDayKey: "2026-04-20",
        sendEnterpriseWechat: false,
      }),
    );

    expect(response.status).toBe(403);
  });

  it("lets admins publish one idempotent weekly report dynamic", async () => {
    const first = await POST(
      publishRequest(adminId, {
        weekStartDayKey: "2026-04-20",
        sendEnterpriseWechat: false,
      }),
    );
    const second = await POST(
      publishRequest(adminId, {
        weekStartDayKey: "2026-04-20",
        sendEnterpriseWechat: false,
      }),
    );
    const firstBody = await first.json();
    const secondBody = await second.json();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(firstBody.result.teamDynamic.status).toBe("CREATED");
    expect(secondBody.result.teamDynamic.status).toBe("EXISTING");
    expect(firstBody.result.teamDynamic.id).toBe(secondBody.result.teamDynamic.id);
    expect(firstBody.result.snapshot.published).toBe(true);
    expect(
      await prisma.teamDynamic.count({
        where: {
          teamId,
          sourceType: "gamification_weekly_report",
          sourceId: `${teamId}:2026-04-20`,
        },
      }),
    ).toBe(1);
  });
});
