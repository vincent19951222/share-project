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
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    if (originalWebhook === undefined) {
      delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    } else {
      process.env.ENTERPRISE_WECHAT_WEBHOOK_URL = originalWebhook;
    }
    await prisma.$disconnect();
  });

  it("formats short text reminders", () => {
    expect(
      formatEnterpriseWechatText({
        title: "牛马补给站提醒",
        lines: ["阿强点名让阿明起来接杯水。"],
      }),
    ).toEqual({
      type: "text",
      content: "牛马补给站提醒\n阿强点名让阿明起来接杯水。",
    });
  });

  it("sends markdown and writes a sent log", async () => {
    process.env.ENTERPRISE_WECHAT_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key";

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ errcode: 0, errmsg: "ok" }));

    const result = await sendEnterpriseWechatMessage({
      teamId,
      purpose: "WEEKLY_REPORT",
      message: formatEnterpriseWechatMarkdown({
        title: "本周周报",
        lines: ["本周打卡 9 次。"],
      }),
      fetchImpl: fetchMock,
    });

    expect(result).toMatchObject({ ok: true, status: "SENT" });
    const log = await prisma.enterpriseWechatSendLog.findUniqueOrThrow({
      where: { id: result.logId },
    });
    expect(log.status).toBe("SENT");
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
