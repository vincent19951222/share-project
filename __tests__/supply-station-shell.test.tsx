import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GamificationStateSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createJsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function shellSnapshot(): GamificationStateSnapshot {
  return {
    currentUserId: "u1",
    teamId: "team-1",
    dayKey: "2026-04-29",
    ticketBalance: 0,
    dimensions: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "站一站，不然屁股长根",
        description: "起身、走动、拉伸、短暂恢复。",
        assignment: null,
      },
      {
        key: "hydration",
        title: "把尿喝白",
        subtitle: "喝白白，别把自己腌入味",
        description: "补水、接水、无糖饮品。",
        assignment: null,
      },
      {
        key: "social",
        title: "把事办黄",
        subtitle: "聊两句，让班味散一散",
        description: "闲聊、吐槽、夸夸、情绪释放。",
        assignment: null,
      },
      {
        key: "learning",
        title: "把股看红",
        subtitle: "看一点，给脑子补仓",
        description: "信息输入、学习、看新闻、文章或工具。",
        assignment: null,
      },
    ],
    ticketSummary: {
      maxFreeTicketsToday: 2,
      todayEarned: 0,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: false,
    },
    lottery: {
      status: "placeholder",
      singleDrawEnabled: false,
      tenDrawEnabled: false,
      message: "抽奖机正在搬进办公室，GM-06 开放。",
      recentDraws: [],
    },
    backpack: {
      totalQuantity: 0,
      previewItems: [],
      emptyMessage: "背包空空，等抽奖机上线后再来进货。",
    },
    social: {
      status: "placeholder",
      pendingSentCount: 0,
      pendingReceivedCount: 0,
      message: "点名喝水、出门溜达等弱社交道具将在 GM-12 开放。",
    },
  };
}

describe("SupplyStation", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("loads the GM-03 shell snapshot and renders disabled future-action placeholders", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ snapshot: shellSnapshot() })),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(fetch).toHaveBeenCalledWith(
      "/api/gamification/state",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
    expect(container.textContent).toContain("牛马补给站");
    expect(container.textContent).toContain("把电充绿");
    expect(container.textContent).toContain("把尿喝白");
    expect(container.textContent).toContain("把事办黄");
    expect(container.textContent).toContain("把股看红");
    expect(container.textContent).toContain("今日任务抽取将在 GM-04 开放");
    expect(container.textContent).toContain("抽奖机正在搬进办公室");
    expect(container.textContent).toContain("背包空空");
    expect(container.querySelectorAll("button[disabled]")).toHaveLength(8);
  });

  it("renders a login recovery state for 401 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ error: "未登录" }, false, 401)),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(container.textContent).toContain("登录状态过期，请重新登录");
    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  });
});
