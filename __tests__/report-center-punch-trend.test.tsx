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

  it("renders a bar per point and marks full-attendance distinctly", () => {
    const points: TeamPunchTrendPoint[] = [
      { dayKey: "2026-06-10", count: 2, isFullAttendance: true },
      { dayKey: "2026-06-11", count: 1, isFullAttendance: false },
    ];

    act(() => {
      root.render(<PunchTrendChart points={points} />);
    });

    const bars = container.querySelectorAll("[data-punch-bar]");
    expect(bars.length).toBe(2);
    expect(container.textContent).toContain("峰值 2人");
    expect(container.textContent).toContain("全勤 1");
  });

  it("distinguishes full-attendance bars from partial ones via data-full", () => {
    const points: TeamPunchTrendPoint[] = [
      { dayKey: "2026-06-10", count: 2, isFullAttendance: true },
      { dayKey: "2026-06-11", count: 1, isFullAttendance: false },
    ];

    act(() => {
      root.render(<PunchTrendChart points={points} />);
    });

    const bars = container.querySelectorAll("[data-punch-bar]");
    expect(bars[0].getAttribute("data-full")).toBe("true");
    expect(bars[1].getAttribute("data-full")).toBe("false");
    // 全勤柱为实心黄，部分柱为半透明黄（均不引入绿色）
    expect((bars[0] as HTMLElement).className).toContain("bg-[#fde047]");
    expect((bars[0] as HTMLElement).className).not.toContain("/45");
    expect((bars[1] as HTMLElement).className).toContain("bg-[#fde047]/45");
  });
});
