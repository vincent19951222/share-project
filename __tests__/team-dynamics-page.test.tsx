import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TeamDynamicsPage } from "@/components/team-dynamics/TeamDynamicsPage";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

function createErrorResponse(message: string) {
  return {
    ok: false,
    json: async () => ({ error: message }),
  } as Response;
}

function createWeeklyReportPayload() {
  return {
    version: 1,
    weekStartDayKey: "2026-04-21",
    weekEndDayKey: "2026-04-25",
    generatedAt: "2026-04-25T08:00:00.000Z",
    generatedByUserId: "admin-1",
    summary: "本周打卡 18 次，全勤 2 天，赛季进度 12/50。",
    metrics: {
      totalPunches: 18,
      fullAttendanceDays: 2,
      peakDay: { dayKey: "2026-04-23", value: 5 },
      lowDay: { dayKey: "2026-04-24", value: 2 },
      seasonProgress: { filledSlots: 12, targetSlots: 50, status: "ACTIVE" },
    },
    highlights: {
      topMembers: [{ userId: "u1", label: "本周高光", value: "li · 5 次有效打卡" }],
      coffee: { userId: "u2", label: "续命担当", value: "luo · 4 杯咖啡" },
    },
    sections: [],
  };
}

describe("TeamDynamicsPage", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          createJsonResponse({
            unreadCount: 1,
            nextCursor: null,
            items: [
              {
                id: "dyn-1",
                type: "WEEKLY_REPORT_CREATED",
                title: "本周战报已经生成",
                summary: "本周打卡 18 次，全勤 2 天",
                occurredAt: "2026-04-25T08:00:00.000Z",
                payload: createWeeklyReportPayload(),
                isRead: false,
                importance: "normal",
              },
            ],
          }),
        )
        .mockResolvedValueOnce(createJsonResponse({ ok: true }))
        .mockResolvedValueOnce(
          createJsonResponse({
            unreadCount: 0,
            nextCursor: null,
            items: [],
          }),
        ),
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders timeline items, supports mark-all, and shows the empty unread state", async () => {
    await act(async () => {
      root.render(
        <TeamDynamicsPage
          initialItems={[
            {
              id: "dyn-1",
              type: "WEEKLY_REPORT_CREATED",
              title: "本周战报已经生成",
              summary: "本周打卡 18 次，全勤 2 天",
              occurredAt: "2026-04-25T08:00:00.000Z",
              payload: createWeeklyReportPayload(),
              isRead: false,
              importance: "normal",
            },
          ]}
          initialUnreadCount={1}
        />,
      );
    });

    expect(container.textContent).toContain("本周战报已经生成");
    expect(container.textContent).toContain("周报");
    expect(container.textContent).toContain("04.21 - 04.25");
    expect(container.textContent).toContain("18 次打卡");
    expect(container.textContent).toContain("2 天全勤");
    expect(container.textContent).toContain("12/50");

    const unreadButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("只看未读"),
    );
    expect(unreadButton).toBeDefined();

    await act(async () => {
      unreadButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const markAllButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("全部标为已读"),
    );
    expect(markAllButton).toBeDefined();

    await act(async () => {
      markAllButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("未读动态已经清空");
  });

  it("shows a visible error and keeps the current filter when reload fails", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValueOnce(createErrorResponse("Reload failed"));

    await act(async () => {
      root.render(
        <TeamDynamicsPage
          initialItems={[]}
          initialUnreadCount={0}
        />,
      );
    });

    const unreadButton = container.querySelectorAll("button")[1];
    const labelBeforeFailure = unreadButton.textContent;

    await act(async () => {
      unreadButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Reload failed");
    expect(unreadButton.textContent).toBe(labelBeforeFailure);
  });

  it("shows a visible error when mark-all fails", async () => {
    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValueOnce(createErrorResponse("Mark all failed"));

    await act(async () => {
      root.render(
        <TeamDynamicsPage
          initialItems={[]}
          initialUnreadCount={1}
        />,
      );
    });

    const markAllButton = container.querySelectorAll("button")[0];

    await act(async () => {
      markAllButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Mark all failed");
  });
});
