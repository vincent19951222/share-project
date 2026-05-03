import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/admin/gamification/ops-dashboard/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/admin/gamification/ops-dashboard", {
    method: "GET",
    headers: userId ? { Cookie: `userId=${createCookieValue(userId)}` } : undefined,
  });
}

describe("GET /api/admin/gamification/ops-dashboard", () => {
  let adminId: string;
  let memberId: string;

  beforeEach(async () => {
    await seedDatabase();
    const admin = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    const member = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    adminId = admin.id;
    memberId = member.id;
    await prisma.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
    await prisma.user.update({ where: { id: memberId }, data: { role: "MEMBER" } });
  });

  it("returns 401 when unauthenticated", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const response = await GET(request(memberId));

    expect(response.status).toBe(403);
  });

  it("returns the operations dashboard for admins", async () => {
    const response = await GET(request(adminId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.snapshot).toMatchObject({
      teamId: expect.any(String),
      metrics: expect.objectContaining({
        teamMemberCount: expect.any(Number),
        totalTicketBalance: expect.any(Number),
      }),
      risks: expect.any(Array),
      pendingRedemptions: expect.any(Array),
    });
  });
});
