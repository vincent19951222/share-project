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
                payload: { headline: "本周打卡 18 次" },
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
              payload: { headline: "本周打卡 18 次" },
              isRead: false,
              importance: "normal",
            },
          ]}
          initialUnreadCount={1}
          initialNextCursor={null}
        />,
      );
    });

    expect(container.textContent).toContain("本周战报已经生成");
    expect(container.textContent).toContain("周报");

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
});
