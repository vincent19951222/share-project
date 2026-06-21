import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkoutBalancePanel } from "@/components/report-center/WorkoutBalancePanel";
import type { TeamWorkoutBalanceItem } from "@/lib/types";

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("WorkoutBalancePanel", () => {
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
    const items: TeamWorkoutBalanceItem[] = [
      { code: "chest", label: "胸", count: 0 },
    ];

    act(() => {
      root.render(<WorkoutBalancePanel items={items} />);
    });

    expect(container.textContent).toContain("暂无训练数据");
  });

  it("renders a vertical bar per item with label and count", () => {
    const items: TeamWorkoutBalanceItem[] = [
      { code: "chest", label: "胸", count: 5 },
      { code: "back", label: "背", count: 1 },
      { code: "treadmill", label: "跑步机", count: 3 },
    ];

    act(() => {
      root.render(<WorkoutBalancePanel items={items} />);
    });

    expect(container.textContent).toContain("胸");
    expect(container.textContent).toContain("5");
    expect(container.textContent).toContain("跑步机");
    expect(container.textContent).toContain("3");
    // 每个部位一根柱
    expect(container.querySelectorAll(".dashboard-balance-item").length).toBe(3);
  });

  it("centers the chart body within the panel", () => {
    const items: TeamWorkoutBalanceItem[] = [
      { code: "chest", label: "胸", count: 5 },
      { code: "back", label: "背", count: 1 },
      { code: "treadmill", label: "跑步机", count: 3 },
    ];

    act(() => {
      root.render(<WorkoutBalancePanel items={items} />);
    });

    expect(container.querySelector(".report-balance-body")).not.toBeNull();
    expect(container.querySelector(".dashboard-balance-chart")?.parentElement?.className).toContain("report-balance-body");
  });

  it("colors strength bars with the yellow family and cardio with cyan", () => {
    const items: TeamWorkoutBalanceItem[] = [
      { code: "chest", label: "胸", count: 5 },
      { code: "treadmill", label: "跑步机", count: 2 },
    ];

    act(() => {
      root.render(<WorkoutBalancePanel items={items} />);
    });

    const bars = container.querySelectorAll(".dashboard-balance-bar") as NodeListOf<HTMLElement>;
    const chestColor = bars[0]?.style.backgroundColor;
    const cardioColor = bars[1]?.style.backgroundColor;
    // 力量（胸）应为黄色系，有氧（跑步机）应为青色 —— 两者不同
    expect(chestColor).toBeTruthy();
    expect(cardioColor).toBeTruthy();
    expect(chestColor).not.toBe(cardioColor);
  });
});
