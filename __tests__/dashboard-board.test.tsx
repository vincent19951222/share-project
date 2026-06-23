import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardBoard } from "@/components/dashboard/DashboardBoard";
import type { DashboardSnapshot } from "@/lib/types";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function createJsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

function createMockSnapshot(period: "month" | "year"): DashboardSnapshot {
  return {
    currentUserId: "user-1",
    year: 2026,
    month: 6,
    currentMonthKey: "2026-06",
    period,
    workoutSummary: { days: 12, totalMinutes: 450 },
    drinkSummary: {
      cups: 55,
      byType: { water: 32, milkTea: 4, americano: 12, latte: 6, other: 1 },
    },
    workoutBalance: [
      { code: "chest", label: "胸", category: "strength", count: 4 },
      { code: "back", label: "背", category: "strength", count: 3 },
      { code: "shoulder", label: "肩", category: "strength", count: 2 },
      { code: "arms", label: "手臂", category: "strength", count: 3 },
      { code: "legs", label: "臀腿", category: "strength", count: 2 },
      { code: "abs", label: "腹", category: "strength", count: 4 },
      { code: "treadmill", label: "跑步机", category: "cardio", count: 3 },
      { code: "elliptical", label: "椭圆机", category: "cardio", count: 1 },
      { code: "walk", label: "散步", category: "cardio", count: 2 },
      { code: "swim", label: "游泳", category: "cardio", count: 2 },
      { code: "dance", label: "跳舞", category: "cardio", count: 1 },
    ],
    drinkBreakdown: [
      { type: "water", label: "水", count: 32, color: "#4fb8d6", softColor: "#e8f8fc", textColor: "#0087a6" },
      { type: "milkTea", label: "奶茶", count: 4, color: "#ef7f8f", softColor: "#fff1ee", textColor: "#e96f83" },
      { type: "americano", label: "美式", count: 12, color: "#7a5438", softColor: "#fff3df", textColor: "#76411f" },
      { type: "latte", label: "拿铁", count: 6, color: "#ef9d36", softColor: "#fff4dd", textColor: "#e4841b" },
      { type: "other", label: "其他", count: 1, color: "#8f948e", softColor: "#f4f3ed", textColor: "#555555" },
    ],
    heatmap: [],
    monthCalendar: {
      monthKey: "2026-06",
      currentMonthKey: "2026-06",
      todayDay: 19,
      totalDays: 30,
      workoutDays: 12,
      drinkCupTotal: 55,
      coffeeCupTotal: 55,
      days: [],
    },
  };
}

describe("DashboardBoard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-06-15T03:00:00Z"));
    container = document.createElement("div");
    document.body.appendChild(container);
    global.fetch = vi.fn().mockResolvedValue(
      createJsonResponse({ snapshot: createMockSnapshot("month") }),
    );
  });

  afterEach(() => {
    root?.unmount();
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders dashboard title and period navigator", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<DashboardBoard />);
    });

    expect(container.textContent).toContain("牛马日历");
    expect(container.textContent).toContain("2026年6月");
    expect(container.textContent).toContain("按月");
    expect(container.textContent).toContain("按年");
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/dashboard/state?period=month&monthKey=2026-06",
      expect.any(Object),
    );
  });

  it("displays workout and drink summary cards", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<DashboardBoard />);
    });

    expect(container.textContent).toContain("12");
    expect(container.textContent).toContain("55");
  });

  it("switches period and refetches", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<DashboardBoard />);
    });

    global.fetch = vi.fn().mockResolvedValue(
      createJsonResponse({ snapshot: createMockSnapshot("year") }),
    );

    const yearButton = container.querySelector<HTMLButtonElement>("button[data-granularity='year']");

    await act(async () => {
      yearButton?.click();
    });

    expect(global.fetch).toHaveBeenLastCalledWith(
      "/api/dashboard/state?period=year&year=2026",
      expect.any(Object),
    );
  });
});
