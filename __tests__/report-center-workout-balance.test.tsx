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

  it("renders a row per item with label and count", () => {
    const items: TeamWorkoutBalanceItem[] = [
      { code: "chest", label: "胸", count: 5 },
      { code: "back", label: "背", count: 1 },
      { code: "legs", label: "腿", count: 3 },
    ];

    act(() => {
      root.render(<WorkoutBalancePanel items={items} />);
    });

    expect(container.textContent).toContain("胸");
    expect(container.textContent).toContain("5");
    expect(container.textContent).toContain("背");
    expect(container.textContent).toContain("1");
    expect(container.textContent).toContain("腿");
    expect(container.textContent).toContain("3");
  });

  it("marks the weakest item with a label", () => {
    const items: TeamWorkoutBalanceItem[] = [
      { code: "chest", label: "胸", count: 5 },
      { code: "back", label: "背", count: 1 },
      { code: "legs", label: "腿", count: 3 },
    ];

    act(() => {
      root.render(<WorkoutBalancePanel items={items} />);
    });

    expect(container.textContent).toContain("最薄弱");
  });

  it("does not mark weakest when all counts are equal", () => {
    const items: TeamWorkoutBalanceItem[] = [
      { code: "chest", label: "胸", count: 3 },
      { code: "back", label: "背", count: 3 },
    ];

    act(() => {
      root.render(<WorkoutBalancePanel items={items} />);
    });

    expect(container.textContent).not.toContain("最薄弱");
  });
});
