import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeamDashboardSnapshot } from "@/lib/types";

vi.mock("@/lib/api", () => ({
  fetchTeamDashboardState: vi.fn(),
}));
vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: {
      activeSeason: {
        id: "s1",
        monthKey: "2026-06",
        goalName: "六月冲刺",
        targetSlots: 10,
        filledSlots: 4,
        contributions: [],
      },
    },
  }),
}));

import { fetchTeamDashboardState } from "@/lib/api";
import { ReportCenter } from "@/components/report-center/ReportCenter";

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot: TeamDashboardSnapshot = {
  period: { type: "month", startKey: "2026-06-01", endKey: "2026-06-15" },
  metrics: { completionRate: 0.5, totalPunches: 30, fullAttendanceDays: 4 },
  punchTrend: [{ dayKey: "2026-06-10", count: 2, isFullAttendance: true }],
  workoutBalance: [{ code: "chest", label: "胸", count: 1 }],
  drinkBreakdown: [{ type: "water", label: "水", count: 1, color: "#4fb8d6" }],
  drinkTrend: [{ dayKey: "2026-06-10", count: 1 }],
};

describe("ReportCenter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchTeamDashboardState).mockResolvedValue(snapshot);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders all panels after loading snapshot", async () => {
    await act(async () => {
      root.render(<ReportCenter />);
      // 刷新 fetchTeamDashboardState().then().finally() 微任务链，
      // 使 setSnapshot / setLoading 在 act 边界内完成
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("战报中心");
    expect(container.textContent).toContain("50%"); // MetricSummary 完成率
    expect(container.textContent).toContain("六月冲刺"); // SeasonSprintPanel
    expect(container.textContent).toContain("每日打卡趋势"); // PunchTrendChart
    expect(container.textContent).toContain("团队训练部位均衡"); // WorkoutBalancePanel
    expect(container.textContent).toContain("水铺饮品构成"); // DrinkCompositionPanel
  });

  it("refetches when retry button is clicked after error", async () => {
    // 第一次 reject 触发 error 态，第二次 resolve 恢复成功态
    vi.mocked(fetchTeamDashboardState)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(snapshot);

    await act(async () => {
      root.render(<ReportCenter />);
      // 刷新 fetch().catch().finally() 微任务链，使 setError / setLoading 完成
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).toContain("战报加载失败");
    expect(container.textContent).toContain("重试");

    await act(async () => {
      // PeriodSwitcher 也有按钮，用 quest-btn class 精确定位重试按钮
      const retryButton = container.querySelector<HTMLButtonElement>("button.quest-btn");
      expect(retryButton).not.toBeNull();
      retryButton!.click();
      // 点击重试 → setRetryNonce → effect 重跑 → fetch().then().finally()
      // 需要更多微任务刷新以覆盖 state 更新 → effect 调度 → promise 链
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.textContent).not.toContain("战报加载失败");
    expect(container.textContent).toContain("每日打卡趋势"); // 成功态面板标题
  });
});
