import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CoffeeReportPanel } from "@/components/report-center/CoffeeReportPanel";
import type { CoffeeReportData } from "@/components/report-center/report-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createCoffeeReport(overrides: Partial<CoffeeReportData> = {}): CoffeeReportData {
  return {
    todayTotalCups: 3,
    todayDrinkers: 2,
    memberCount: 3,
    monthTotalCups: 14,
    weekKing: { name: "luo", cups: 7 },
    recentDays: [
      { day: 18, cups: 0 },
      { day: 19, cups: 2 },
      { day: 20, cups: 5 },
    ],
    roast: "轻度续命，问题不大。",
    ...overrides,
  };
}

describe("CoffeeReportPanel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders zero-cup days with an empty bar", () => {
    act(() => {
      root.render(
        <CoffeeReportPanel coffee={createCoffeeReport()} loading={false} error={null} />,
      );
    });

    const zeroCupBar = container.querySelector('[title="18 日 0 杯"]');

    expect(zeroCupBar).not.toBeNull();
    expect((zeroCupBar as HTMLDivElement).style.height).toBe("0%");
  });
});
