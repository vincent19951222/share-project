import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DAILY_WEWORK_REMINDER_CONTENT,
  pushDailyReminderToWeWork,
} from "@/lib/wework-webhook";

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("wework webhook", () => {
  afterEach(() => {
    delete process.env.ENTERPRISE_WECHAT_WEBHOOK_URL;
    delete process.env.WEWORK_WEBHOOK_URL;
  });

  it("skips daily reminders when no webhook url is configured", async () => {
    const fetchMock = vi.fn();

    const result = await pushDailyReminderToWeWork({
      webhookUrl: "",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({ status: "skipped", reason: "missing-webhook" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends daily reminders as enterprise wechat text messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ errcode: 0, errmsg: "ok" }));

    const result = await pushDailyReminderToWeWork({
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({ status: "sent" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      msgtype: string;
      text: { content: string };
    };

    expect(body).toEqual({
      msgtype: "text",
      text: { content: DAILY_WEWORK_REMINDER_CONTENT },
    });
  });

  it("keeps the legacy wework webhook env var working for daily reminders", async () => {
    process.env.WEWORK_WEBHOOK_URL =
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=legacy-daily-key";
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ errcode: 0, errmsg: "ok" }));

    const result = await pushDailyReminderToWeWork({ fetchImpl: fetchMock });

    expect(result).toEqual({ status: "sent" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=legacy-daily-key",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns a failed result when enterprise wechat rejects a daily reminder payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ errcode: 40001, errmsg: "bad key" }));

    const result = await pushDailyReminderToWeWork({
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({
      status: "failed",
      reason: "企业微信 webhook 返回错误：40001 bad key",
    });
  });
});
