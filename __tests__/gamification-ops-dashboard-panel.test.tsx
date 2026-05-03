import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GamificationOpsDashboard } from "@/components/admin/GamificationOpsDashboard";
import type { GamificationOpsDashboardSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildSnapshot(
  overrides: Partial<GamificationOpsDashboardSnapshot> = {},
): GamificationOpsDashboardSnapshot {
  return {
    teamId: "team-1",
    window: {
      startDayKey: "2026-04-26",
      endDayKey: "2026-05-02",
      days: 7,
      generatedAt: "2026-05-02T04:00:00.000Z",
    },
    metrics: {
      teamMemberCount: 5,
      windowDays: 7,
      totalTicketBalance: 42,
      totalCoinBalance: 1200,
      ticketsEarned: 12,
      ticketsSpent: 20,
      netTicketChange: -8,
      lotteryDrawCount: 3,
      lotteryCoinSpent: 240,
      lotteryCoinRewarded: 65,
      realWorldRewardCount: 1,
      pendingRedemptionCount: 1,
      overdueRedemptionCount: 1,
      socialInvitationCount: 4,
      socialResponseCount: 2,
      socialResponseRate: 50,
      repeatedDirectInvitationPairCount: 1,
      wechatFailureCount: 1,
      ticketBalanceMismatchCount: 0,
      coinBalanceMismatchCount: 0,
    },
    metricCards: [
      {
        key: "net_tickets",
        label: "抽奖券净变化",
        value: "-8",
        helper: "近窗口发券减去抽奖消耗",
        tone: "default",
      },
      {
        key: "pending_redemptions",
        label: "待处理兑换",
        value: "1",
        helper: "需要管理员线下处理",
        tone: "warning",
      },
    ],
    risks: [
      {
        key: "asset_integrity",
        title: "资产一致性",
        summary: "用户资产和可重算流水一致。",
        severity: "ok",
        detailItems: ["抽奖券异常用户：0", "银子异常用户：0"],
      },
      {
        key: "redemption_queue",
        title: "兑换处理",
        summary: "1 单待处理，其中 1 单超过 2 天。",
        severity: "risk",
        detailItems: ["待处理：1", "超时：1"],
      },
    ],
    pendingRedemptions: [
      {
        id: "redemption-1",
        userId: "u1",
        username: "luo",
        itemId: "luckin_coffee_coupon",
        itemName: "瑞幸咖啡券",
        requestedAt: "2026-04-28T02:00:00.000Z",
        ageDays: 4,
      },
    ],
    topTicketBalances: [
      { userId: "u2", username: "li", value: 26, helper: "890 银子" },
      { userId: "u1", username: "luo", value: 16, helper: "530 银子" },
    ],
    topCoinBalances: [
      { userId: "u2", username: "li", value: 890, helper: "26 张券" },
      { userId: "u1", username: "luo", value: 530, helper: "16 张券" },
    ],
    repeatedDirectInvitations: [
      {
        senderUserId: "u2",
        senderUsername: "li",
        recipientUserId: "u1",
        recipientUsername: "luo",
        count: 3,
      },
    ],
    ...overrides,
  };
}

describe("GamificationOpsDashboard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders metrics, risk cards, pending redemptions, and social frequency", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await act(async () => {
      root.render(<GamificationOpsDashboard initialSnapshot={buildSnapshot()} />);
    });

    expect(container.textContent).toContain("运营观察");
    expect(container.textContent).toContain("2026-04-26 - 2026-05-02");
    expect(container.textContent).toContain("抽奖券净变化");
    expect(container.textContent).toContain("-8");
    expect(container.textContent).toContain("兑换处理");
    expect(container.textContent).toContain("1 单待处理，其中 1 单超过 2 天。");
    expect(container.textContent).toContain("luo 申请 瑞幸咖啡券");
    expect(container.textContent).toContain("li -> luo");
  });

  it("refreshes the snapshot from the admin API", async () => {
    const nextSnapshot = buildSnapshot({
      metricCards: [
        {
          key: "pending_redemptions",
          label: "待处理兑换",
          value: "0",
          helper: "需要管理员线下处理",
          tone: "success",
        },
      ],
      pendingRedemptions: [],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ snapshot: nextSnapshot })),
    );

    await act(async () => {
      root.render(<GamificationOpsDashboard initialSnapshot={buildSnapshot()} />);
    });

    const refreshButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("刷新观察"),
    );
    expect(refreshButton).toBeDefined();

    await act(async () => {
      refreshButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/gamification/ops-dashboard",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
    expect(container.textContent).toContain("待处理兑换");
    expect(container.textContent).toContain("0");
    expect(container.textContent).toContain("暂无待处理兑换。");
  });
});
