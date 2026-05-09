import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TrendChart } from "@/components/report-center/TrendChart";
import type { DailyTrendPoint } from "@/components/report-center/report-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function samplePoints(): DailyTrendPoint[] {
  return [
    { day: 1, count: 2, isFullAttendance: false, isPeak: false, isLow: false },
    { day: 2, count: 4, isFullAttendance: true, isPeak: true, isLow: false },
    { day: 3, count: 1, isFullAttendance: false, isPeak: false, isLow: true },
  ];
}

describe("TrendChart", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders prototype-style chart annotations and an in-chart today marker", () => {
    act(() => {
      root.render(
        <TrendChart
          dailyPoints={samplePoints()}
          monthNumber={5}
          peakDay={{ day: 2, count: 4 }}
          lowDay={{ day: 3, count: 1 }}
        />,
      );
    });

    const annotationLayers = Array.from(container.querySelectorAll("svg .report-chart-annotation-layer"));
    const linePath = container.querySelector(".report-prototype-trend-line");
    const areaPath = container.querySelector(".report-prototype-trend-area");
    const todayMarker = container.querySelector(".report-prototype-today-marker");
    const todayLabel = container.querySelector(".report-prototype-today-label");

    expect(container.querySelector(".report-prototype-trend")).not.toBeNull();
    expect(container.querySelector(".report-prototype-trend-legend")).not.toBeNull();
    expect(container.querySelector(".report-analysis-today-strip")).toBeNull();
    expect(todayMarker).not.toBeNull();
    expect(todayLabel?.textContent).toContain("今天");
    expect(todayLabel?.textContent).toContain("5/3");
    expect(linePath?.getAttribute("stroke")).toBe("#ef4444");
    expect(linePath?.getAttribute("d")).not.toContain("C");
    expect(linePath?.getAttribute("d")).toContain("L");
    expect(areaPath?.getAttribute("fill")).toBe("url(#trend-area-fill)");
    expect(container.textContent).toContain("5/1");
    expect(container.textContent).toContain("5/2");
    expect(container.textContent).toContain("5/3");
    expect(annotationLayers).toHaveLength(2);
    expect(annotationLayers.map((layer) => layer.textContent ?? "")).toEqual(
      expect.arrayContaining(["峰值 4 人", "低谷 1 人"]),
    );
  });

  it("renders the empty branch without chart annotations or a today side panel", () => {
    act(() => {
      root.render(<TrendChart dailyPoints={[]} monthNumber={5} peakDay={null} lowDay={null} />);
    });

    expect(container.textContent).toContain("暂无趋势数据");
    expect(container.querySelector("svg .report-chart-annotation-layer")).toBeNull();
    expect(container.querySelector(".report-analysis-today-strip")).toBeNull();
    expect(container.querySelector(".report-prototype-today-marker")).toBeNull();
  });
});
