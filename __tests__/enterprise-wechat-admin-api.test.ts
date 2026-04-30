import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/integrations/enterprise-wechat/test/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";

const originalWebhook = process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;

function request(userId: string | null, body?: unknown) {
  const headers: Record<string, string> = {};

  if (userId) {
    headers.Cookie = `userId=${createCookieValue(userId)}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  return new NextRequest("http://localhost/api/admin/integrations/enterprise-wechat/test", {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("enterprise wechat admin test api", () => {
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
    await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
    delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (originalWebhook === undefined) {
      delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    } else {
      process.env.ENTERPRISE_WECHAT_WEBHOOK_URL = originalWebhook;
    }
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    await prisma.$disconnect();
  });

  it("returns 401 when unauthenticated", async () => {
    const result = await POST(request(null, { message: "test" }));

    expect(result.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const result = await POST(request(memberId, { message: "test" }));

    expect(result.status).toBe(403);
  });

  it("returns 400 for malformed json", async () => {
    const result = await POST(
      new NextRequest("http://localhost/api/admin/integrations/enterprise-wechat/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `userId=${createCookieValue(adminId)}`,
        },
        body: "{bad-json",
      }),
    );

    expect(result.status).toBe(400);
  });

  it("returns 400 for empty messages", async () => {
    const result = await POST(request(adminId, { message: "   " }));

    expect(result.status).toBe(400);
  });

  it("returns skipped result when webhook is missing", async () => {
    const result = await POST(request(adminId, { message: "config check" }));

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.result).toMatchObject({
      ok: false,
      status: "SKIPPED",
      reason: "MISSING_WEBHOOK_CONFIG",
    });
  });

  it("sends a configured test message as admin", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ errcode: 0, errmsg: "ok" })));

    const result = await POST(request(adminId, { message: "webhook test" }));

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.result).toMatchObject({
      ok: true,
      status: "SENT",
    });
    expect(JSON.stringify(body)).not.toContain("secret-key");

    const log = await prisma.enterpriseWechatSendLog.findUniqueOrThrow({
      where: { id: body.result.logId },
    });
    expect(log).toMatchObject({
      teamId,
      purpose: "MANUAL_TEST",
      targetType: "AdminUser",
      targetId: adminId,
      status: "SENT",
    });
  });
});
