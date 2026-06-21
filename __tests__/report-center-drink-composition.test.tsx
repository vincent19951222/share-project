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

  it("renders pie slices for non-zero types and trend bars", () => {
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

    // 饼图扇区 = 非零类型数 = 2
    const slices = container.querySelectorAll("path[data-slice]");
    expect(slices.length).toBe(2);
    // 趋势柱 = trend 长度 = 2
    const bars = container.querySelectorAll("rect[data-drink-bar]");
    expect(bars.length).toBe(2);
  });
});
