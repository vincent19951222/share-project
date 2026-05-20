import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyDrawPoolScene } from "@/components/gamification/ui-lab/supply-draw-pool/SupplyDrawPoolScene";
import { supplyDrawPoolAssetPaths, supplyDrawPoolMock } from "@/components/gamification/ui-lab/supply-draw-pool/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SupplyDrawPoolScene", () => {
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

  it("renders draw-pool surfaces as semantic UI instead of panel crops", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    expect(container.querySelector(".supply-draw-pool-scene")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-topbar-image")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-wallet-image")).toBeNull();
    expect(container.querySelector("a.supply-draw-pool-topbar-close-hotspot")).toBeNull();
    expect(container.querySelector("a.supply-draw-pool-close[aria-label='返回大厅']")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-left-rail")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-machine")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-right-rail")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-recent")).not.toBeNull();
    expect(container.querySelector("a.supply-draw-pool-close")?.getAttribute("href")).toBe("/ui-lab/supply-dashboard");
    expect(container.querySelector("a.supply-draw-pool-back")?.getAttribute("href")).toBe("/ui-lab/supply-dashboard");
    expect(container.textContent).toContain("当前拥有");
    expect(container.textContent).toContain("抽奖券");
    expect(container.textContent).toContain("18 张");
    expect(container.textContent).toContain("今日获取上限：18/30 张");
    expect(container.querySelector("button[aria-label='获取更多抽奖券']")).not.toBeNull();
    expect(container.querySelector("button[aria-label='前往任务']")).not.toBeNull();
    expect(container.querySelector("img[alt='补给抽卡机']")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-machine-image")).not.toBeNull();
    expect(container.querySelector("button[aria-label*='单抽']")).not.toBeNull();
    expect(container.querySelector("button[aria-label*='十连']")).not.toBeNull();
    expect(container.textContent).toContain("保底进度");
    expect(container.textContent).toContain("48/70");
    expect(container.textContent).toContain("最近掉落");
    expect(container.textContent).toContain("疾风跑鞋");
  });

  it("uses reusable reward icons and draw-pool-specific media", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources).toEqual(
      expect.arrayContaining([
        supplyDrawPoolAssetPaths.drawPool.machine,
        supplyDrawPoolAssetPaths.drawPool.capsuleBed,
        supplyDrawPoolAssetPaths.drawPool.guideMascot,
        supplyDrawPoolAssetPaths.cowLogo,
        supplyDrawPoolAssetPaths.drawPool.wristband,
        supplyDrawPoolAssetPaths.drawPool.runningShoe,
      ]),
    );
  });

  it("renders side modules with visible controls and text", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    expect(container.querySelector(".supply-draw-pool-guide-hotspot")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-rules-hotspot")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-recent-hotspot")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-rates .supply-ui-lab-panel-title")?.textContent).toContain(
      "奖池预览",
    );
    expect(container.querySelector(".supply-draw-pool-probability")?.textContent).toContain("概率公示");
    expect(container.querySelector(".supply-draw-pool-rules a[aria-label='查看规则']")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-recent a[aria-label='全部记录']")).not.toBeNull();
    expect(container.textContent).toContain("完成任务拿抽奖券，抽道具、效果和补给券！");
    expect(container.textContent).toContain("消耗抽奖券进行抽取");
  });
});
