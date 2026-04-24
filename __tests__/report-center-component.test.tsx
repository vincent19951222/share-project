import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { CoffeeProvider } from "@/lib/coffee-store";
import { BoardProvider } from "@/lib/store";
import type { BoardState, CoffeeSnapshot } from "@/lib/types";

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

function coffeeSnapshot(): CoffeeSnapshot {
  return {
    members: [
      { id: "u1", name: "li", avatarKey: "male1" },
      { id: "u2", name: "luo", avatarKey: "male2" },
    ],
    gridData: [
      Array.from({ length: 30 }, (_, index) => ({
        cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 1, 2][index] ?? 0,
      })),
      Array.from({ length: 30 }, (_, index) => ({
        cups: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 3, 1][index] ?? 0,
      })),
    ],
    today: 24,
    totalDays: 30,
    currentUserId: "u1",
    stats: {
      todayTotalCups: 3,
      todayDrinkers: 2,
      currentUserTodayCups: 2,
      coffeeKing: { userId: "u1", name: "li", cups: 2 },
    },
  };
}

function createJsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

describe("ReportCenter", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T12:00:00+08:00"));
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input) === "/api/coffee/state") {
          return Promise.resolve(createJsonResponse({ snapshot: coffeeSnapshot() }));
        }

        throw new Error(`Unexpected fetch call: ${String(input)}`);
      }),
    );
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
    vi.useRealTimers();
  });

  it("renders the lightweight dashboard with a playful coffee report", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <CoffeeProvider>
            <ReportCenter />
          </CoffeeProvider>
        </BoardProvider>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain("4月牛马战报");
    expect(container.textContent).toContain("本月打卡 4 次，全勤 1 天，团队节奏还有上升空间。");
    expect(container.textContent).toContain("团队完成率");
    expect(container.textContent).toContain("总打卡次数");
    expect(container.textContent).toContain("牛马金库");
    expect(container.textContent).toContain("减脂挑战 · 3/5");
    expect(container.textContent).toContain("活跃趋势");
    expect(container.textContent).toContain("咖啡能量站");
    expect(container.textContent).toContain("Daily Roast");
    expect(container.textContent).toContain("今日全队 3 杯");
    expect(container.textContent).toContain("续命人数");
    expect(container.textContent).toContain("2/2");
    expect(container.textContent).toContain("本月累计");
    expect(container.textContent).toContain("13 杯");
    expect(container.textContent).toContain("今日状态");
    expect(container.textContent).toContain("Relax");
    expect(container.textContent).toContain("本周咖啡王");
    expect(container.textContent).toContain("luo · 7 杯");
    expect(container.querySelector("img[src='/assets/report-center/coffee-cup-label.png']")).not.toBeNull();
    expect(container.querySelector("img[src='/assets/report-center/coffee-receipt.png']")).not.toBeNull();
    expect(container.textContent).not.toContain("气氛组播报");
    expect(container.textContent).not.toContain("OCTOBER REPORT");
    expect(container.textContent).not.toContain("+12,450");
    expect(container.textContent).not.toContain("Bob");
    expect(container.textContent).not.toContain("10.01");
    expect(container.querySelector("svg[aria-label='团队每日打卡人数趋势']")).not.toBeNull();
  });
});
