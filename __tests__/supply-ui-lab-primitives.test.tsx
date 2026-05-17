import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  SupplyUiLabActionButton,
  SupplyUiLabFilterBar,
  SupplyUiLabPixelPanel,
  SupplyUiLabProgress,
  SupplyUiLabStatusBadge,
} from "@/components/gamification/ui-lab/supply-dashboard/SupplyUiLabPrimitives";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("Supply UI Lab shared primitives", () => {
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

  it("renders semantic panel, button, badge, progress, and filters", async () => {
    await act(async () => {
      root.render(
        <>
          <SupplyUiLabPixelPanel title="今日任务" tone="paper" ariaLabel="今日任务面板">
            <SupplyUiLabFilterBar
              ariaLabel="商品筛选"
              filters={[
                { id: "all", label: "全部", active: true },
                { id: "owned", label: "已拥有", active: false },
              ]}
            />
            <SupplyUiLabProgress current={35} label="完成度" max={100} />
            <SupplyUiLabStatusBadge tone="success">已完成</SupplyUiLabStatusBadge>
            <SupplyUiLabActionButton tone="primary">领取</SupplyUiLabActionButton>
            <SupplyUiLabActionButton tone="danger">放弃</SupplyUiLabActionButton>
          </SupplyUiLabPixelPanel>
          <SupplyUiLabProgress current={120} label="溢出进度" max={100} />
          <SupplyUiLabProgress current={-5} label="负数进度" max={-10} />
        </>,
      );
    });

    expect(container.querySelector(".supply-ui-lab-panel")).not.toBeNull();
    expect(container.querySelector("[role='tablist']")?.getAttribute("aria-label")).toBe("商品筛选");
    const progressBars = Array.from(container.querySelectorAll("[role='progressbar']"));

    expect(progressBars[0]?.getAttribute("aria-valuenow")).toBe("35");
    expect(progressBars[1]?.getAttribute("aria-valuenow")).toBe("100");
    expect(progressBars[1]?.getAttribute("aria-valuemax")).toBe("100");
    expect(progressBars[2]?.getAttribute("aria-valuenow")).toBe("0");
    expect(progressBars[2]?.getAttribute("aria-valuemax")).toBe("0");
    expect(container.querySelector("button")?.textContent).toContain("全部");
    expect(container.querySelector(".supply-ui-lab-action--danger")?.textContent).toBe("放弃");
    expect(container.textContent).toContain("领取");
  });
});
