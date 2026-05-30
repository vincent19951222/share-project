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

    expect(container.querySelector(".coffee-report-panel")).not.toBeNull();
    expect(container.querySelector(".coffee-report-inset-shell")).not.toBeNull();
    expect(container.querySelector(".coffee-report-appendix-head")).not.toBeNull();
    expect(container.querySelector(".coffee-report-visual-center")).not.toBeNull();
    expect(container.querySelector(".coffee-report-cup-artboard")).not.toBeNull();
    expect(container.querySelector(".coffee-report-cup-label-copy")).not.toBeNull();
    expect(container.querySelector(".coffee-report-receipt-artboard")).not.toBeNull();
    expect(container.querySelector(".coffee-report-receipt-footer")).not.toBeNull();
    expect(container.querySelector(".coffee-report-bars")).not.toBeNull();
    expect(container.querySelector("img[src='https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_report_center_coffee_cup_label.png']")).not.toBeNull();
    expect(container.querySelector("img[src='https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_report_center_coffee_receipt.png']")).not.toBeNull();

    const zeroCupBar = container.querySelector('[title="18 日 0 杯"]');

    expect(zeroCupBar).not.toBeNull();
    expect((zeroCupBar as HTMLDivElement).style.height).toBe("0%");
  });
});
