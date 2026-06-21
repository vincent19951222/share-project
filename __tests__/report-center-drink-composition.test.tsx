import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DrinkCompositionPanel } from "@/components/report-center/DrinkCompositionPanel";
import type {
  TeamDrinkBreakdownItem,
  TeamDrinkTrendPoint,
} from "@/lib/types";

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("DrinkCompositionPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    root.unmount();
    container.remove();
  });

  it("renders empty state when all counts are zero", () => {
    const breakdown: TeamDrinkBreakdownItem[] = [
      { type: "water", label: "水", count: 0, color: "#4fb8d6" },
    ];
    const trend: TeamDrinkTrendPoint[] = [];

    act(() => {
      root.render(
        <DrinkCompositionPanel breakdown={breakdown} trend={trend} />,
      );
    });

    expect(container.textContent).toContain("暂无饮水数据");
  });

  it("renders a breakdown row per type (including zero-count) and a trend bar per point", () => {
    const breakdown: TeamDrinkBreakdownItem[] = [
      { type: "water", label: "水", count: 4, color: "#4fb8d6" },
      { type: "milkTea", label: "奶茶", count: 2, color: "#ef7f8f" },
      { type: "americano", label: "美式", count: 0, color: "#7a5438" },
    ];
    const trend: TeamDrinkTrendPoint[] = [
      { dayKey: "2026-06-10", count: 3 },
      { dayKey: "2026-06-11", count: 1 },
    ];

    act(() => {
      root.render(
        <DrinkCompositionPanel breakdown={breakdown} trend={trend} />,
      );
    });

    // 水平柱：每个类型一行（含 0 杯的美式，保持扇区/行稳定）
    expect(container.querySelectorAll(".dashboard-drink-breakdown-item").length).toBe(3);
    expect(container.textContent).toContain("水");
    expect(container.textContent).toContain("奶茶");
    // 占比百分比
    expect(container.textContent).toContain("67%"); // 4 / 6
    expect(container.textContent).toContain("33%"); // 2 / 6
    // 趋势柱 = trend 长度 = 2
    expect(container.querySelectorAll("[data-drink-trend-bar]").length).toBe(2);
  });
});
