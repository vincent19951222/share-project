import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyBackpackScene } from "@/components/gamification/ui-lab/supply-backpack/SupplyBackpackScene";
import { supplyBackpackMock } from "@/components/gamification/ui-lab/supply-backpack/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("SupplyBackpackScene", () => {
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

  it("renders the shared compact topbar and semantic backpack surfaces", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    expect(container.querySelector(".supply-backpack-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar--breadcrumb")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-tabs")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-brand")?.textContent).toContain("牛马补给站");
    expect(container.querySelector(".supply-ui-lab-breadcrumb-current")?.textContent).toBe("背包");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/40");
    expect(container.querySelector(".supply-ui-lab-close")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard",
    );
    expect(container.querySelector("nav[aria-label='背包分类']")).not.toBeNull();
    expect(container.querySelector("[role='grid'][aria-label='背包库存']")).not.toBeNull();
    expect(container.querySelector(".supply-backpack-detail[aria-label='道具详情']")).not.toBeNull();
    expect(container.querySelector(".supply-backpack-panel-image")).toBeNull();
    expect(container.textContent).toContain("小提示：");
  });

  it("renders atomic item media instead of cropped backpack panel assets", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources).toContain("/gamification/rewards/icons/luckin_coffee_coupon.png");
    expect(imageSources).toContain("/assets/home-scenes/supply/backpack/backpack-sports-drink.webp");
    expect(imageSources).not.toContain("/assets/home-scenes/supply/backpack/backpack-sidebar-panel.png");
    expect(imageSources).not.toContain("/assets/home-scenes/supply/backpack/backpack-inventory-panel.png");
    expect(imageSources).not.toContain("/assets/home-scenes/supply/backpack/backpack-detail-panel.png");
  });

  it("renders 16 item slots, 4 locked slots, and synced selected detail", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const grid = container.querySelector("[role='grid'][aria-label='背包库存']");
    expect(grid?.querySelectorAll("[role='gridcell'][aria-label*='持有']")).toHaveLength(16);
    expect(grid?.querySelectorAll(".supply-backpack-slot.is-locked")).toHaveLength(4);
    expect(
      grid?.querySelector("[role='gridcell'][aria-label*='咖啡兑换券']")?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(grid?.querySelector("[role='gridcell'][aria-label*='咖啡兑换券'] img")).not.toBeNull();
    expect(grid?.querySelector("[role='gridcell'][aria-label*='咖啡兑换券']")?.textContent).toContain("x8");

    const detail = container.querySelector(".supply-backpack-detail");
    expect(detail?.querySelector("h2")?.textContent).toBe("咖啡兑换券");
    expect(detail?.querySelector("img")?.getAttribute("src")).toBe(
      "/gamification/rewards/icons/luckin_coffee_coupon.png",
    );
    expect(detail?.textContent).toContain("持有 8");
    expect(detail?.textContent).toContain("真实福利");
    expect(detail?.textContent).toContain("兑换指定咖啡饮品");
  });

  it("keeps actions static and links shop CTA only to the ui-lab shop route", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const actions = Array.from(container.querySelectorAll(".supply-backpack-actions button"));
    expect(actions.map((button) => button.getAttribute("type"))).toEqual(["button", "button"]);
    expect(actions.map((button) => button.textContent)).toEqual(["今日使用", "申请兑换"]);
    expect(container.querySelector(".supply-backpack-shop-cta a")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard/shop",
    );
  });
});
