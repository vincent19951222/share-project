import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { supplyUiLabResourceIconPaths } from "@/components/gamification/ui-lab/supply-data/resources";
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

  it("renders draw-pool surfaces with Phase 2 vocabulary and no long-term pity", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    expect(container.querySelector(".supply-draw-pool-scene")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-topbar-image")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-wallet-image")).toBeNull();
    expect(container.querySelector("a.supply-draw-pool-close")?.getAttribute("href")).toBe(
      "/dashboard/status",
    );
    expect(container.querySelector("a.supply-draw-pool-back")?.getAttribute("href")).toBe(
      "/dashboard/status",
    );
    expect(container.querySelector(".supply-draw-pool-resource-pill b")).toBeNull();
    expect(container.textContent).toContain("当前拥有");
    expect(container.textContent).toContain("抽奖券");
    expect(container.textContent).toContain("18 张");
    expect(container.textContent).toContain("今日获取上限：18/30 张抽奖券");
    expect(container.querySelector(".supply-draw-pool-wallet-actions")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-guide button")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-skip-toggle")).toBeNull();
    expect(container.textContent).not.toContain("获取更多抽奖券");
    expect(container.textContent).not.toContain("前往任务");
    expect(container.textContent).not.toContain("去完成");
    expect(container.textContent).not.toContain("跳过抽奖动画");
    expect(container.textContent).toContain("十连保底说明");
    expect(container.textContent).toContain("单抽没有保底");
    expect(container.textContent).toContain("十连批次如果自然结果没有实用、社交或稀有奖励");
    expect(container.textContent).toContain("最近掉落");
    expect(container.textContent).toContain("牛马暴富");
    expect(container.querySelector(".supply-draw-pool-machine-controls")?.getAttribute("data-control-style")).toBe(
      "arcade",
    );
    expect(container.querySelector(".supply-draw-pool-action--ten")?.getAttribute("data-priority")).toBe("primary");
    expect(container.querySelector(".supply-draw-pool-action--single")?.getAttribute("data-priority")).toBe(
      "secondary",
    );
    expect(container.querySelectorAll(".supply-draw-pool-action em img")).toHaveLength(2);
    expect(container.querySelector(".supply-draw-pool-action em img")?.getAttribute("src")).toBe(
      supplyUiLabResourceIconPaths.ticket,
    );
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("保底进度");
    expect(container.textContent).not.toContain("48/70");
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
        "/gamification/rewards/icons/coins_120.png",
        "/gamification/rewards/icons/task_reroll_coupon.png",
      ]),
    );
  });

  it("shows local single draw result and decrements ticket balance", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    const singleDrawButton = container.querySelector<HTMLButtonElement>("button[aria-label*='单抽']");

    expect(singleDrawButton).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-result-modal")).toBeNull();
    expect(container.querySelector(".supply-draw-pool-center > .supply-draw-pool-result")).toBeNull();

    await act(async () => {
      singleDrawButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const resultDialog = container.querySelector<HTMLElement>(".supply-draw-pool-result-modal");

    expect(resultDialog?.getAttribute("role")).toBe("dialog");
    expect(resultDialog?.getAttribute("aria-modal")).toBe("true");
    expect(container.querySelector(".supply-draw-pool-result-backdrop")).not.toBeNull();
    expect(container.querySelector(".supply-draw-pool-center > .supply-draw-pool-result")).toBeNull();
    expect(resultDialog?.textContent).toContain("本次结果");
    expect(resultDialog?.textContent).toContain("今日没白来");
    expect(resultDialog?.textContent).toContain("银子 x20");
    expect(container.querySelector(".supply-draw-pool-result-reveal")?.getAttribute("data-result-reveal")).toBe(
      "rarity",
    );
    expect(resultDialog?.querySelectorAll(".supply-draw-pool-drop[data-rarity]")).not.toHaveLength(0);
    expect(container.textContent).toContain("剩余 17 张抽奖券");
    expect(container.querySelector(".supply-draw-pool-ticket-count")?.textContent).toContain("17 张");
    expect(container.querySelector<HTMLButtonElement>(".supply-draw-pool-result-action--continue")?.disabled).toBe(
      false,
    );

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".supply-draw-pool-result-action--accept")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector(".supply-draw-pool-result-modal")).toBeNull();
  });

  it("shows local ten draw result in a modal and then disables ten draw when balance is too low", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    const tenDrawButton = () => container.querySelector<HTMLButtonElement>("button[aria-label*='十连']");

    await act(async () => {
      tenDrawButton()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const resultDialog = container.querySelector<HTMLElement>(".supply-draw-pool-result-modal");

    expect(resultDialog?.textContent).toContain("本次十连结果");
    expect(resultDialog?.textContent).toContain("剩余 8 张抽奖券");
    expect(resultDialog?.querySelectorAll(".supply-draw-pool-drop")).toHaveLength(10);
    expect(container.querySelector(".supply-draw-pool-center > .supply-draw-pool-result")).toBeNull();
    expect(container.querySelector<HTMLButtonElement>(".supply-draw-pool-result-action--continue")?.disabled).toBe(
      true,
    );
    expect(tenDrawButton()?.disabled).toBe(true);
    expect(tenDrawButton()?.getAttribute("aria-label")).toContain("抽奖券不足");
    expect(container.textContent).toContain("十连还差 2 张抽奖券");
  });

  it("can continue ten draw from the result modal when enough tickets remain", async () => {
    await act(async () => {
      root.render(<SupplyDrawPoolScene data={supplyDrawPoolMock} />);
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("button[aria-label*='单抽']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".supply-draw-pool-result-action--continue")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const resultDialog = container.querySelector<HTMLElement>(".supply-draw-pool-result-modal");

    expect(resultDialog?.textContent).toContain("本次十连结果");
    expect(resultDialog?.textContent).toContain("剩余 7 张抽奖券");
    expect(resultDialog?.querySelectorAll(".supply-draw-pool-drop")).toHaveLength(10);
    expect(container.querySelector(".supply-draw-pool-ticket-count")?.textContent).toContain("7 张");
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
    expect(container.textContent).toContain("完成任务拿抽奖券，抽银子、道具和福利奖励！");
    expect(container.textContent).toContain("消耗抽奖券进行抽取");
  });
});
