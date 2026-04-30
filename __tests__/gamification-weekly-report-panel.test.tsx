import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GamificationWeeklyReportPanel } from "@/components/report-center/GamificationWeeklyReportPanel";
import type { GamificationWeeklyReportSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function snapshot(): GamificationWeeklyReportSnapshot {
  return {
    teamId: "team_1",
    weekStartDayKey: "2026-04-20",
    weekEndDayKey: "2026-04-26",
    generatedAt: "2026-04-26T02:00:00.000Z",
    published: false,
    publishedDynamicId: null,
    metrics: {
      teamMemberCount: 2,
      daysInWindow: 7,
      expectedTaskCount: 56,
      completedTaskCount: 28,
      taskCompletionRate: 50,
      allFourCompletionDays: 4,
      fitnessTicketsEarned: 5,
      lifeTicketsEarned: 4,
      paidTicketsBought: 1,
      ticketsSpent: 7,
      netTicketChange: 3,
      drawCount: 3,
      singleDrawCount: 2,
      tenDrawCount: 1,
      coinSpent: 40,
      coinRewarded: 25,
      rareRewardCount: 1,
      realWorldRewardCount: 1,
      itemUseCount: 2,
      boostUseCount: 1,
      boostAssetBonusTotal: 40,
      boostSeasonBonusTotal: 40,
      leaveCouponUseCount: 1,
      pendingItemUseCount: 0,
      expiredItemUseCount: 0,
      socialInvitationCount: 2,
      directInvitationCount: 1,
      teamInvitationCount: 1,
      socialResponseCount: 2,
      socialResponseRate: 100,
      gameDynamicCount: 2,
      rarePrizeDynamicCount: 1,
      boostDynamicCount: 0,
      socialMomentDynamicCount: 1,
    },
    metricCards: [
      { key: "task-rate", label: "四维完成率", value: "50%", helper: "28/56 个任务完成", tone: "default" },
      { key: "tickets-earned", label: "本周发券", value: "10", helper: "健身 5 · 四维 4 · 补券 1", tone: "highlight" },
      { key: "draws", label: "抽奖次数", value: "3", helper: "单抽 2 · 十连 1", tone: "success" },
      { key: "social-response", label: "弱社交响应", value: "100%", helper: "2/2 个邀请有回应", tone: "success" },
    ],
    summaryCards: [
      { key: "rhythm", title: "补给站节奏", body: "本周四维任务完成率 50%。", tone: "default" },
      { key: "lottery", title: "抽奖机播报", body: "抽奖机转了 3 次。", tone: "highlight" },
      { key: "social", title: "办公室互动", body: "弱社交发起 2 次。", tone: "success" },
    ],
    highlights: [
      {
        id: "dynamic_1",
        title: "li 抽中了瑞幸咖啡券",
        summary: "补给站出大货了",
        sourceType: "team_dynamic",
        sourceId: "dynamic_1",
        occurredAt: "2026-04-23T04:00:00.000Z",
      },
    ],
  };
}

describe("GamificationWeeklyReportPanel", () => {
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
    vi.restoreAllMocks();
  });

  it("renders weekly report metrics and highlights", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: snapshot() }),
      }),
    );

    await act(async () => {
      root.render(<GamificationWeeklyReportPanel isAdmin={false} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("牛马补给周报");
    expect(container.textContent).toContain("2026-04-20 至 2026-04-26");
    expect(container.textContent).toContain("四维完成率");
    expect(container.textContent).toContain("本周发券");
    expect(container.textContent).toContain("抽奖机播报");
    expect(container.textContent).toContain("li 抽中了瑞幸咖啡券");
    expect(container.textContent).not.toContain("发布到团队动态");
  });

  it("shows publish actions for admins", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ snapshot: snapshot() }),
      }),
    );

    await act(async () => {
      root.render(<GamificationWeeklyReportPanel isAdmin />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("发布到团队动态");
    expect(container.textContent).toContain("发布并发送企业微信");
  });

  it("shows local error state when loading fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "服务器错误" }),
      }),
    );

    await act(async () => {
      root.render(<GamificationWeeklyReportPanel isAdmin={false} />);
      await Promise.resolve();
    });

    expect(container.textContent).toContain("牛马补给周报加载失败");
  });
});
