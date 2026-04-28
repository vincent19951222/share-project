import { describe, expect, it, vi } from "vitest";
import { pushWeeklyReportDynamicToWeWork } from "@/lib/wework-webhook";

function createDynamic(payload: Record<string, unknown> = {}) {
  return {
    title: "本周战报已经生成",
    summary: "本周打卡 6 次，全勤 0 天，赛季进度 12/50。",
    payloadJson: JSON.stringify({
      weekStartDayKey: "2026-04-27",
      weekEndDayKey: "2026-04-30",
      metrics: {
        totalPunches: 6,
        fullAttendanceDays: 0,
        seasonProgress: {
          filledSlots: 12,
          targetSlots: 50,
        },
      },
      highlights: {
        topMembers: [{ value: "li · 3 次有效打卡" }],
        coffee: { value: "luo · 3 杯咖啡" },
      },
      ...payload,
    }),
  };
}

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("wework webhook", () => {
  it("skips weekly report pushes when no webhook url is configured", async () => {
    const fetchMock = vi.fn();

    const result = await pushWeeklyReportDynamicToWeWork({
      dynamic: createDynamic(),
      webhookUrl: "",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({ status: "skipped", reason: "missing-webhook" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends weekly reports as enterprise wechat markdown messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ errcode: 0, errmsg: "ok" }));

    const result = await pushWeeklyReportDynamicToWeWork({
      dynamic: createDynamic(),
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
      markdown: { content: string };
    };

    expect(body.msgtype).toBe("markdown");
    expect(body.markdown.content).toContain("本周战报已经生成");
    expect(body.markdown.content).toContain("统计区间：2026-04-27 至 2026-04-30");
    expect(body.markdown.content).toContain("打卡：6 次");
    expect(body.markdown.content).toContain("高光：li · 3 次有效打卡");
    expect(body.markdown.content).toContain("咖啡：luo · 3 杯咖啡");
  });

  it("returns a failed result when enterprise wechat rejects the payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ errcode: 40001, errmsg: "bad key" }));

    const result = await pushWeeklyReportDynamicToWeWork({
      dynamic: createDynamic(),
      webhookUrl: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual({
      status: "failed",
      reason: "企业微信 webhook 返回错误：40001 bad key",
    });
  });
});
