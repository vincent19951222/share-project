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

  it("shows a hover tooltip with date and count, and an x-axis with key ticks", () => {
    const points: TeamPunchTrendPoint[] = [
      { dayKey: "2026-06-10", count: 2, isFullAttendance: true },
      { dayKey: "2026-06-11", count: 1, isFullAttendance: false },
    ];

    act(() => {
      root.render(<PunchTrendChart points={points} />);
    });

    // 初始无 tooltip
    expect(container.querySelector(".report-bar-tooltip")).toBeNull();

    // hover 第一根柱 → 浮出含日期+人数的 tooltip
    const host = container.querySelector(".report-bar-tooltip-host") as HTMLElement;
    expect(host).not.toBeNull();
    // React 合成 onMouseEnter 由 mouseover 冒泡触发
    act(() => {
      host.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });
    const tooltip = container.querySelector(".report-bar-tooltip");
    expect(tooltip).not.toBeNull();
    expect(tooltip!.textContent).toContain("6月10日");
    expect(tooltip!.textContent).toContain("2 人");
    expect(tooltip!.textContent).toContain("全勤");

    // x 轴标签存在（≤5 根柱时全部标注）
    expect(container.textContent).toContain("6/10");
    expect(container.textContent).toContain("6/11");
  });
});
