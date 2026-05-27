import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { supplyUiLabResourceIconPaths } from "@/components/gamification/ui-lab/supply-data/resources";
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

  it("renders a catalog-backed shop with Phase 2 resources and no dead rules anchor", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    expect(container.querySelector(".supply-shop-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-resource--coins")?.textContent).toContain("银子");
    expect(container.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(container.querySelector(".supply-shop-resource-card")).toBeNull();
    expect(container.querySelector("a.supply-shop-back-link")?.getAttribute("href")).toBe(
      "/dashboard/status",
    );
    expect(container.querySelectorAll(".supply-shop-category-list button")).toHaveLength(6);
    expect(container.querySelector(".supply-shop-category-list button[aria-current='page']")?.textContent).toContain(
      "全部商品",
    );
    expect(container.querySelectorAll(".supply-shop-category-icon img")).toHaveLength(6);
    expect(container.querySelector(".supply-shop-category-icon")?.textContent).toBe("");
    expect(container.querySelector(".supply-ui-lab-filterbar [role='tab'][aria-selected='true']")?.textContent).toBe(
      "全部",
    );
    expect(container.querySelector("select[aria-label='商品排序']")).toBeNull();
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card']")).toHaveLength(12);
    expect(container.querySelector(".supply-shop-product-price img")?.getAttribute("src")).toBe(
      supplyUiLabResourceIconPaths.coins,
    );
    expect(container.querySelector(".supply-shop-product-price")?.getAttribute("aria-label")).toMatch(/^银子 \d+$/);
    expect(container.querySelector("[data-testid='supply-shop-product-card'][aria-selected='true']")?.textContent).toContain(
      "任务换班券",
    );
    expect(
      container.querySelector("[data-testid='supply-shop-product-card'][aria-selected='true']")?.getAttribute(
        "data-selected-visual",
      ),
    ).toBe("focus");
    expect(container.querySelector(".supply-shop-detail-attributes")).not.toBeNull();
    expect(container.querySelector(".supply-shop-detail-attribute[data-attribute='effect']")?.textContent).toContain(
      "效果",
    );
    expect(container.querySelector(".supply-shop-detail-attribute[data-attribute='timing']")?.textContent).toContain(
      "使用时机",
    );
    expect(container.querySelector(".supply-shop-redeem-button")?.getAttribute("data-action-state")).toBe("available");
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card'] img").length).toBeGreaterThan(0);
    expect(container.querySelector('a[href="#rules"]')).toBeNull();
    expect(container.textContent).toContain("本页规则");
    expect(container.textContent).toContain("来源：抽奖池 / 商店");
    expect(container.textContent).toContain("持有 2");
    expect(container.textContent).toContain("银子 150");
    expect(container.textContent).toContain("本地预览：兑换不会写入后端");
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("体力");
    expect(container.textContent).not.toContain("生命票");
  });

  it("switches selected product details locally", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const coffeeCard = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-testid='supply-shop-product-card']"),
    ).find((card) => card.textContent?.includes("瑞幸咖啡券"));

    expect(coffeeCard).toBeDefined();

    await act(async () => {
      coffeeCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(coffeeCard?.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelector(".supply-shop-detail")?.getAttribute("aria-label")).toContain("瑞幸咖啡券");
    expect(container.textContent).toContain("管理员确认后兑换 1 杯瑞幸咖啡");
    expect(container.textContent).toContain("真实福利：兑换后进入管理员确认流程");
    expect(container.querySelector(".supply-shop-redeem-button")?.textContent).toBe("申请兑换");
    expect(container.querySelector(".supply-shop-redeem-button")?.getAttribute("data-action-state")).toBe(
      "adminConfirmation",
    );
  });

  it("shows a clear limit-reached redemption state", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const rareCard = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-testid='supply-shop-product-card']"),
    ).find((card) => card.textContent?.includes("双倍牛马券"));

    expect(rareCard).toBeDefined();

    await act(async () => {
      rareCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector(".supply-shop-redeem-button")?.getAttribute("data-action-state")).toBe(
      "limitReached",
    );
    expect(container.querySelector<HTMLButtonElement>(".supply-shop-redeem-button")?.disabled).toBe(true);
    expect(container.querySelector(".supply-shop-detail-cost")?.textContent).toContain("银子");
  });

  it("switches category and filter buttons through local state", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const realWorldCategory = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".supply-shop-category-list button"),
    ).find((button) => button.textContent?.includes("真实福利"));

    expect(realWorldCategory).toBeDefined();

    await act(async () => {
      realWorldCategory?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(realWorldCategory?.getAttribute("aria-current")).toBe("page");
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card']")).toHaveLength(1);
    expect(container.querySelector("[data-testid='supply-shop-product-card']")?.textContent).toContain("瑞幸咖啡券");

    const adminFilter = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".supply-ui-lab-filterbar [role='tab']"),
    ).find((button) => button.textContent === "需确认");

    expect(adminFilter).toBeDefined();

    await act(async () => {
      adminFilter?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(adminFilter?.getAttribute("aria-selected")).toBe("true");
    expect(container.querySelectorAll("[data-testid='supply-shop-product-card']")).toHaveLength(1);
    expect(container.querySelector("[data-testid='supply-shop-product-card']")?.textContent).toContain("瑞幸咖啡券");
  });

  it("shows local redemption feedback for virtual items and real-world rewards", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const redeemButton = container.querySelector<HTMLButtonElement>(".supply-shop-redeem-button");

    await act(async () => {
      redeemButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-shop-feedback]")?.textContent).toContain("已加入背包：任务换班券");

    const coffeeCard = Array.from(
      container.querySelectorAll<HTMLButtonElement>("[data-testid='supply-shop-product-card']"),
    ).find((card) => card.textContent?.includes("瑞幸咖啡券"));

    await act(async () => {
      coffeeCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const coffeeRedeemButton = container.querySelector<HTMLButtonElement>(".supply-shop-redeem-button");

    await act(async () => {
      coffeeRedeemButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-shop-feedback]")?.textContent).toContain("兑换中：已提交管理员确认");
  });

  it("expands rules on the page without navigating to a hash target", async () => {
    await act(async () => {
      root.render(<SupplyShopScene data={supplyShopMock} />);
    });

    const rulesButton = container.querySelector<HTMLButtonElement>(".supply-shop-rules-toggle");

    expect(rulesButton?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".supply-shop-rules-panel")).toBeNull();

    await act(async () => {
      rulesButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(rulesButton?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".supply-shop-rules-panel")?.textContent).toContain("真实福利类商品会进入管理员确认");
    expect(container.querySelector('a[href="#rules"]')).toBeNull();
  });
});
