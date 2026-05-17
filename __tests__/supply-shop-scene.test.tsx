import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyShopScene } from "@/components/gamification/ui-lab/supply-shop/SupplyShopScene";
import { supplyShopMock } from "@/components/gamification/ui-lab/supply-shop/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("SupplyShopScene", () => {
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

  it("renders semantic shop panels with visible product controls", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    expect(container.querySelector(".supply-shop-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar a[aria-current='page']")?.textContent).toContain("补给商店");
    expect(container.querySelector("a.supply-ui-lab-topbar-tab--shop")?.getAttribute("href")).toBe(
      "/ui-lab/supply-dashboard/shop",
    );
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("68/120");
    expect(container.querySelector("a.supply-shop-back-link")?.getAttribute("href")).toBe("/ui-lab/supply-dashboard");
    expect(container.querySelector(".supply-shop-sidebar")).not.toBeNull();
    expect(container.querySelector(".supply-shop-catalog")).not.toBeNull();
    expect(container.querySelector(".supply-shop-detail")).not.toBeNull();
    expect(container.querySelector(".supply-shop-panel-image")).toBeNull();
    expect(container.querySelectorAll(".supply-shop-category-list button")).toHaveLength(6);
    expect(container.querySelector(".supply-shop-category-list button[aria-current='page']")?.textContent).toContain("今日推荐");
    expect(container.querySelector(".supply-ui-lab-filterbar [role='tab'][aria-selected='true']")?.textContent).toBe("全部");
    expect((container.querySelector("select[aria-label='商品排序']") as HTMLSelectElement | null)?.value).toBe(
      "默认排序",
    );
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card']")).toHaveLength(11);
    expect(container.querySelector("[data-testid='supply-shop-product-card'][aria-selected='true']")?.textContent).toContain(
      "任务重置券",
    );
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card'] img").length).toBeGreaterThan(0);
    expect(container.textContent).toContain("任务重置券");
    expect(container.textContent).toContain("银子 150");
    expect(container.textContent).toContain("持有 0");
    expect(container.textContent).toContain("可在任务进行中使用");
    expect(container.textContent).toContain("今日已达限购");
    const redeemButton = container.querySelector(".supply-shop-redeem-button") as HTMLButtonElement | null;
    expect(redeemButton?.disabled).toBe(supplyShopMock.selectedProductDetail.redeemDisabled);
    expect(redeemButton?.textContent).toBe(supplyShopMock.selectedProductDetail.redeemDisabledReason);
    expect(container.textContent).toContain("“真实福利”类商品需管理员确认后发放");
  });

  it("does not render cropped shop panel assets", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources.join("\n")).not.toMatch(/\/assets\/home-scenes\/supply\/shop\/.*-panel\.png/);
  });
});
