import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PunchTrendChart } from "@/components/report-center/PunchTrendChart";
import type { TeamPunchTrendPoint } from "@/lib/types";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("PunchTrendChart", () => {
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

  it("renders empty state when no points", () => {
    act(() => {
      root.render(<PunchTrendChart points={[]} />);
    });

    expect(container.textContent).toContain("暂无打卡数据");
  });

  it("renders a bar per point and highlights peak", () => {
    const points: TeamPunchTrendPoint[] = [
      { dayKey: "2026-06-10", count: 2, isFullAttendance: true },
      { dayKey: "2026-06-11", count: 1, isFullAttendance: false },
    ];

    act(() => {
      root.render(<PunchTrendChart points={points} />);
    });

    const bars = container.querySelectorAll("rect[data-bar]");
    expect(bars.length).toBe(2);
    expect(container.textContent).toContain("峰值 2人");
  });

  it("uses green fill for full-attendance bars", () => {
    const points: TeamPunchTrendPoint[] = [
      { dayKey: "2026-06-10", count: 2, isFullAttendance: true },
      { dayKey: "2026-06-11", count: 1, isFullAttendance: false },
    ];

    act(() => {
      root.render(<PunchTrendChart points={points} />);
    });

    const bars = container.querySelectorAll("rect[data-bar]");
    expect(bars[0].getAttribute("fill")).toBe("#16a34a");
    expect(bars[1].getAttribute("fill")).toBe("#fde047");
  });
});
