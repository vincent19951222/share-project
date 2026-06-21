import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MetricSummary } from "@/components/report-center/MetricSummary";
import type { TeamMetrics } from "@/lib/types";

describe("MetricSummary", () => {
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

  it("renders three cards with computed values", () => {
    const metrics: TeamMetrics = {
      completionRate: 0.5,
      totalPunches: 30,
      fullAttendanceDays: 4,
    };

    act(() => {
      root.render(<MetricSummary metrics={metrics} period="month" />);
    });

    expect(container.textContent).toContain("50%");
    expect(container.textContent).toContain("30");
    expect(container.textContent).toContain("4");
    expect(container.textContent).toContain("完成率");
    expect(container.textContent).toContain("总打卡");
    expect(container.textContent).toContain("全勤日");
  });
});
