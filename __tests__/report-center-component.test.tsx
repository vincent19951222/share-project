import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialState: BoardState = {
  members: [
    { id: "u1", name: "li", avatarKey: "male1", assetBalance: 120, seasonIncome: 30, slotContribution: 2 },
    { id: "u2", name: "luo", avatarKey: "male2", assetBalance: 80, seasonIncome: 20, slotContribution: 1 },
  ],
  gridData: [
    [true, true, false],
    [true, false, true],
  ],
  teamVaultTotal: 1450,
  currentUser: {
    assetBalance: 120,
    currentStreak: 6,
    nextReward: 20,
    seasonIncome: 30,
    isAdmin: false,
  },
  activeSeason: {
    id: "season-1",
    monthKey: "2026-04",
    goalName: "减脂挑战",
    targetSlots: 5,
    filledSlots: 3,
    contributions: [
      { userId: "u1", name: "li", avatarKey: "male1", colorIndex: 0, slotContribution: 2, seasonIncome: 30 },
      { userId: "u2", name: "luo", avatarKey: "male2", colorIndex: 1, slotContribution: 1, seasonIncome: 20 },
    ],
  },
  today: 3,
  totalDays: 3,
  logs: [],
  activeTab: "dash",
  currentUserId: "u1",
};

describe("ReportCenter", () => {
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
  });

  it("renders the lightweight dashboard from board state", () => {
    act(() => {
      root.render(
        <BoardProvider initialState={initialState}>
          <ReportCenter />
        </BoardProvider>,
      );
    });

    expect(container.textContent).toContain("DASHBOARD");
    expect(container.textContent).toContain("本月打卡 4 次，全勤 1 天，团队节奏还有上升空间。");
    expect(container.textContent).toContain("团队完成率");
    expect(container.textContent).toContain("总打卡次数");
    expect(container.textContent).toContain("牛马金库");
    expect(container.textContent).toContain("减脂挑战 · 3/5");
    expect(container.textContent).toContain("ACTIVITY TREND / 活跃趋势");
    expect(container.textContent).toContain("气氛组播报");
    expect(container.textContent).not.toContain("OCTOBER REPORT");
    expect(container.textContent).not.toContain("+12,450");
    expect(container.textContent).not.toContain("Bob");
    expect(container.textContent).not.toContain("10.01");
    expect(container.querySelector("svg[aria-label='团队每日打卡人数趋势']")).not.toBeNull();
  });
});
