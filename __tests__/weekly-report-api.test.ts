import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { createCookieValue } from "@/lib/auth";
import { GET as getDraft, POST as postDraft } from "@/app/api/reports/weekly/draft/route";
import { POST as postPublish } from "@/app/api/reports/weekly/publish/route";

function makeRequest(method: "GET" | "POST", path: string, userId?: string) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: userId
      ? {
          Cookie: `userId=${createCookieValue(userId)}`,
        }
      : undefined,
  });
}

async function getSeedUsers() {
  const [admin, member] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { username: "li" } }),
    prisma.user.findUniqueOrThrow({ where: { username: "luo" } }),
  ]);

  return { admin, member };
}

async function cleanupWeeklyReportArtifacts() {
  await prisma.teamDynamicReadState.deleteMany();
  await prisma.teamDynamic.deleteMany();
  await prisma.weeklyReportDraft.deleteMany();
}

describe("weekly report admin api", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-30T12:00:00+08:00"));
  });

  beforeEach(async () => {
    vi.setSystemTime(new Date("2026-04-30T12:00:00+08:00"));
    await seedDatabase();
    await cleanupWeeklyReportArtifacts();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    await cleanupWeeklyReportArtifacts();
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("returns 401 for unauthenticated draft requests", async () => {
    const response = await getDraft(makeRequest("GET", "/api/reports/weekly/draft"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("allows an admin to create and read back the current-week draft", async () => {
    const { admin } = await getSeedUsers();

    const createResponse = await postDraft(makeRequest("POST", "/api/reports/weekly/draft", admin.id));
    expect(createResponse.status).toBe(200);

    const createBody = await createResponse.json();
    expect(createBody.draft).toMatchObject({
      teamId: admin.teamId,
      createdByUserId: admin.id,
      weekStartDayKey: "2026-04-27",
    });
    expect(createBody.draft.summary).toEqual(expect.any(String));
    expect(createBody.draft.snapshot.summary).toBe(createBody.draft.summary);

    const getResponse = await getDraft(makeRequest("GET", "/api/reports/weekly/draft", admin.id));
    expect(getResponse.status).toBe(200);

    const getBody = await getResponse.json();
    expect(getBody).toEqual({ draft: createBody.draft });

    const publishResponse = await postPublish(
      makeRequest("POST", "/api/reports/weekly/publish", admin.id),
    );
    expect(publishResponse.status).toBe(200);

    const publishBody = await publishResponse.json();
    expect(publishBody.dynamic).toMatchObject({
      teamId: admin.teamId,
      type: "WEEKLY_REPORT_CREATED",
      sourceType: "weekly-report",
      sourceId: `${admin.teamId}:2026-04-27`,
      summary: createBody.draft.summary,
    });
  });

  it("routes weekly report publishing through the unified enterprise wechat sender without blocking success", async () => {
    const { admin } = await getSeedUsers();
    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: false,
      status: "FAILED",
      logId: "log-1",
      reason: "HTTP_ERROR",
      httpStatus: 502,
    });

    await postDraft(makeRequest("POST", "/api/reports/weekly/draft", admin.id));
    const response = await postPublish(makeRequest("POST", "/api/reports/weekly/publish", admin.id));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.dynamic).toMatchObject({
      teamId: admin.teamId,
      type: "WEEKLY_REPORT_CREATED",
      sourceType: "weekly-report",
    });
    expect(body.weworkPush).toEqual({
      ok: false,
      status: "FAILED",
      logId: "log-1",
      reason: "HTTP_ERROR",
      httpStatus: 502,
    });
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: admin.teamId,
        purpose: "WEEKLY_REPORT",
        targetType: "TeamDynamic",
        message: expect.objectContaining({
          type: "markdown",
          content: expect.stringContaining("统计区间"),
        }),
      }),
    );

    const secondResponse = await postPublish(makeRequest("POST", "/api/reports/weekly/publish", admin.id));
    expect(secondResponse.status).toBe(200);
    await expect(secondResponse.json()).resolves.toMatchObject({
      weworkPush: { status: "SKIPPED", reason: "ALREADY_PUBLISHED" },
    });
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("still returns success if the unified sender throws unexpectedly after publish", async () => {
    const { admin } = await getSeedUsers();
    const sender = await import("@/lib/integrations/enterprise-wechat");
    vi.spyOn(sender, "sendEnterpriseWechatMessage").mockRejectedValue(new Error("sender exploded"));

    await postDraft(makeRequest("POST", "/api/reports/weekly/draft", admin.id));
    const response = await postPublish(makeRequest("POST", "/api/reports/weekly/publish", admin.id));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      dynamic: expect.objectContaining({
        teamId: admin.teamId,
        type: "WEEKLY_REPORT_CREATED",
      }),
      weworkPush: {
        ok: false,
        status: "FAILED",
        reason: "UNEXPECTED_ERROR",
        errorMessage: "sender exploded",
      },
    });
  });

  it("returns 403 for non-admin users", async () => {
    const { member } = await getSeedUsers();

    const response = await postDraft(makeRequest("POST", "/api/reports/weekly/draft", member.id));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("surfaces the publish-without-draft service error", async () => {
    const { admin } = await getSeedUsers();

    const response = await postPublish(makeRequest("POST", "/api/reports/weekly/publish", admin.id));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "当前周还没有可发布的草稿。",
      code: "DRAFT_NOT_FOUND",
    });
  });
});
