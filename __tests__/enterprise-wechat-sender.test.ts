import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import {
  formatEnterpriseWechatMarkdown,
  formatEnterpriseWechatText,
  recordEnterpriseWechatPushEvent,
  sendEnterpriseWechatMessage,
} from "@/lib/integrations/enterprise-wechat";

const originalWebhook = process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("enterprise wechat sender", () => {
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const team = await prisma.team.findUniqueOrThrow({ where: { code: "ROOM-88" } });
    teamId = team.id;
    await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
    await prisma.enterpriseWechatPushEvent.deleteMany({ where: { teamId } });
    delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    delete process.env.WEWORK_WEBHOOK_URL;
    delete process.env.WEWORK_WEEKLY_REPORT_WEBHOOK_URL;
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

  it("formats text reminders with title brackets and removes empty lines", () => {
    expect(
      formatEnterpriseWechatText({
        title: "Niuma supply station",
        lines: ["drink water", " ", "stand up"],
        footer: "from test",
      }),
    ).toEqual({
      type: "text",
      content: "【Niuma supply station】\ndrink water\nstand up\nfrom test",
    });
  });

  it("formats markdown with quote, list lines, footer, and truncation", () => {
    const message = formatEnterpriseWechatMarkdown({
      title: "Niuma reminder",
      quote: "luo started a walk invitation",
      lines: ["stand up", "- keep existing bullet", "> keep existing quote"],
      footer: "stay alive",
    });

    expect(message.type).toBe("markdown");
    expect(message.content).toContain("**Niuma reminder**");
    expect(message.content).toContain("> luo started a walk invitation");
    expect(message.content).toContain("- stand up");
    expect(message.content).toContain("- keep existing bullet");
    expect(message.content).toContain("> keep existing quote");
    expect(message.content).toContain("stay alive");

    const longMessage = formatEnterpriseWechatMarkdown({
      title: "Long",
      lines: ["x".repeat(5000)],
    });

    expect(longMessage.content.length).toBeLessThanOrEqual(3800);
    expect(longMessage.content.endsWith("...")).toBe(true);
  });

  it("skips sending when webhook config is missing and writes a log", async () => {
    const fetchMock = vi.fn();

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "MANUAL_TEST",
      message: { type: "text", content: "hello" },
      fetchImpl: fetchMock,
    });

    const log = await prisma.enterpriseWechatSendLog.findUniqueOrThrow({
      where: { id: result.logId },
    });

    expect(result).toMatchObject({
      ok: false,
      status: "SKIPPED",
      reason: "MISSING_WEBHOOK_CONFIG",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toMatchObject({
      teamId,
      purpose: "MANUAL_TEST",
      messageType: "text",
      status: "SKIPPED",
      failureReason: "MISSING_WEBHOOK_CONFIG",
    });
  });

  it("sends markdown and writes a sent log without storing the webhook key", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ errcode: 0, errmsg: "ok" }));

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "WEEKLY_REPORT",
      message: formatEnterpriseWechatMarkdown({
        title: "Weekly report",
        lines: ["9 punches this week"],
      }),
      fetchImpl: fetchMock,
    });

    expect(result).toMatchObject({ ok: true, status: "SENT" });
    const log = await prisma.enterpriseWechatSendLog.findUniqueOrThrow({
      where: { id: result.logId },
    });
    expect(log.status).toBe("SENT");
    expect(JSON.stringify(log)).not.toContain("test-key");
  });

  it("fails when enterprise wechat does not return errcode zero", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ errmsg: "missing errcode" }));

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "MANUAL_TEST",
      message: { type: "text", content: "hello" },
      fetchImpl: fetchMock,
    });

    expect(result).toMatchObject({
      ok: false,
      status: "FAILED",
      reason: "WECHAT_ERROR",
      httpStatus: 200,
      wechatErrmsg: "missing errcode",
    });
  });

  it("sanitizes webhook secrets from network error logs", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-key";
    const fetchMock = vi
      .fn()
      .mockRejectedValue(
        new Error(
          "connect https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=secret-key failed",
        ),
      );

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "MANUAL_TEST",
      message: { type: "text", content: "hello" },
      fetchImpl: fetchMock,
    });

    const log = await prisma.enterpriseWechatSendLog.findUniqueOrThrow({
      where: { id: result.logId },
    });

    expect(result).toMatchObject({
      ok: false,
      status: "FAILED",
      reason: "NETWORK_ERROR",
    });
    expect(JSON.stringify(log)).not.toContain("secret-key");
    expect(log.errorMessage).toContain("[redacted-webhook]");
  });

  it("creates one push-event record and skips duplicates", async () => {
    const first = await recordEnterpriseWechatPushEvent({
      teamId,
      purpose: "TEAM_MILESTONE",
      eventKey: `${teamId}:li:STREAK:7`,
      targetType: "StreakMilestone",
      targetId: "li:7",
    });
    const second = await recordEnterpriseWechatPushEvent({
      teamId,
      purpose: "TEAM_MILESTONE",
      eventKey: `${teamId}:li:STREAK:7`,
      targetType: "StreakMilestone",
      targetId: "li:7",
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
  });
});
