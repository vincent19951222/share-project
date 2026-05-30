import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { supplyUiLabResourceIconPaths } from "@/components/gamification/ui-lab/supply-data/resources";
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

  it("renders the shared compact topbar and Phase 2 backpack surfaces", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    expect(container.querySelector(".supply-backpack-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar--breadcrumb")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-tabs")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-brand")?.textContent).toContain("牛马补给站");
    expect(container.querySelector(".supply-ui-lab-breadcrumb-current")?.textContent).toBe("背包");
    expect(container.querySelector(".supply-ui-lab-resource--coins")?.textContent).toContain("银子");
    expect(container.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(container.querySelector(".supply-ui-lab-close")?.getAttribute("href")).toBe(
      "/dashboard/status",
    );
    expect(container.querySelector(".supply-backpack-sidebar-title-icon")?.getAttribute("src")).toBe(
      supplyUiLabResourceIconPaths.backpack,
    );
    expect(container.querySelector("nav[aria-label='背包分类']")).not.toBeNull();
    expect(container.querySelector("button[aria-label='今日效果说明']")).toBeNull();
    expect(container.querySelector("select[aria-label='库存排序']")).toBeNull();
    expect(container.querySelectorAll(".supply-backpack-category-icon img")).toHaveLength(
      supplyBackpackMock.sidebar.categories.length,
    );
    expect(container.querySelector("[role='grid'][aria-label='背包库存']")).not.toBeNull();
    expect(container.querySelector(".supply-backpack-detail[aria-label='道具详情']")).not.toBeNull();
    expect(container.querySelector(".supply-backpack-detail-card[data-inspection='item-card']")).not.toBeNull();
    expect(container.querySelector(".supply-backpack-detail-result-preview")?.textContent).toContain("使用后");
    expect(container.querySelector(".supply-backpack-use-button")?.getAttribute("data-action-state")).toMatch(
      /usable|active|admin|unavailable/,
    );
    expect(container.textContent).toContain("小提示：");
    expect(container.textContent).not.toContain("扩容");
    expect(container.textContent).not.toContain("帮助中心");
    expect(container.textContent).not.toContain("体力");
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("生命票");
  });

  it("renders 20 visible slots per page with empty cells instead of locked cells", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const grid = container.querySelector("[role='grid'][aria-label='背包库存']");

    expect(grid?.querySelectorAll("[role='gridcell']")).toHaveLength(20);
    expect(grid?.querySelectorAll("[role='gridcell'][aria-label*='持有']")).toHaveLength(12);
    expect(grid?.querySelectorAll(".supply-backpack-slot.is-empty")).toHaveLength(8);
    expect(grid?.querySelectorAll(".supply-backpack-slot.is-locked")).toHaveLength(0);
    expect(
      grid?.querySelector("[role='gridcell'][aria-label*='任务换班券']")?.getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      grid?.querySelector("[role='gridcell'][aria-label*='任务换班券']")?.getAttribute("data-selected-visual"),
    ).toBe("focus");
    expect(container.querySelector(".supply-backpack-pagination")?.textContent).toContain("1 / 3");
  });

  it("switches pages locally without changing the fixed 20-cell grid", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const nextPage = container.querySelector<HTMLButtonElement>("button[aria-label='下一页']");
    const previousPage = container.querySelector<HTMLButtonElement>("button[aria-label='上一页']");

    expect(previousPage?.disabled).toBe(true);
    expect(nextPage?.disabled).toBe(false);

    await act(async () => {
      nextPage?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const grid = container.querySelector("[role='grid'][aria-label='背包库存']");
    expect(container.querySelector(".supply-backpack-pagination")?.textContent).toContain("2 / 3");
    expect(grid?.querySelectorAll("[role='gridcell']")).toHaveLength(20);
    expect(grid?.querySelectorAll(".supply-backpack-slot.is-empty")).toHaveLength(20);
    expect(grid?.querySelectorAll(".supply-backpack-slot.is-locked")).toHaveLength(0);
  });

  it("filters inventory locally when a sidebar category is clicked", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const categoryButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("nav[aria-label='背包分类'] button"),
    );
    const socialCategory = categoryButtons.find((button) => button.textContent?.includes("社交"));
    const allCategory = categoryButtons.find((button) => button.textContent?.includes("全部"));
    const socialItemCount = supplyBackpackMock.inventory.slots.filter(
      (slot) => slot.type === "item" && slot.item.categoryId === "social",
    ).length;

    await act(async () => {
      socialCategory?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const grid = container.querySelector("[role='grid'][aria-label='背包库存']");
    const itemCells = Array.from(grid?.querySelectorAll("[role='gridcell'][aria-label*='持有']") ?? []);

    expect(socialCategory?.getAttribute("aria-current")).toBe("page");
    expect(allCategory?.getAttribute("aria-current")).toBeNull();
    expect(grid?.querySelectorAll("[role='gridcell']")).toHaveLength(20);
    expect(itemCells).toHaveLength(socialItemCount);
    expect(grid?.textContent).toContain("点名喝水令");
    expect(grid?.textContent).not.toContain("任务换班券");
    expect(container.querySelector(".supply-backpack-detail h2")?.textContent).toBe("点名喝水令");
    expect(container.querySelector(".supply-backpack-pagination")?.textContent).toContain("1 / 1");
  });

  it("switches selected item detail locally when an inventory item is clicked", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const coffeeSlot = container.querySelector<HTMLButtonElement>(
      "[role='gridcell'][aria-label*='瑞幸咖啡券']",
    );

    await act(async () => {
      coffeeSlot?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const detail = container.querySelector(".supply-backpack-detail");

    expect(coffeeSlot?.getAttribute("aria-selected")).toBe("true");
    expect(detail?.querySelector("h2")?.textContent).toBe("瑞幸咖啡券");
    expect(detail?.querySelector("img")?.getAttribute("src")).toBe(
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_luckin_coffee_coupon.png",
    );
    expect(detail?.textContent).toContain("持有 1");
    expect(detail?.textContent).toContain("真实福利");
    expect(detail?.textContent).toContain("管理员确认后兑换 1 杯瑞幸咖啡");
  });

  it("shows local feedback for use and redemption actions and keeps shop CTA on the formal store route", async () => {
    await act(async () => {
      root.render(<SupplyBackpackScene data={supplyBackpackMock} />);
    });

    const actions = Array.from(container.querySelectorAll<HTMLButtonElement>(".supply-backpack-actions button"));
    expect(actions.map((button) => button.getAttribute("type"))).toEqual(["button", "button"]);
    expect(actions.map((button) => button.textContent)).toEqual(["今日使用", "申请兑换"]);

    await act(async () => {
      actions[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[role='status']")?.textContent).toContain("今日使用已模拟");

    await act(async () => {
      actions[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[role='status']")?.textContent).toContain("申请兑换已模拟");
    expect(container.querySelector(".supply-backpack-shop-cta a")?.getAttribute("href")).toBe(
      "/dashboard/store",
    );
  });

  it("requires a teammate target before using a direct social item", async () => {
    const onUseItem = vi.fn();
    const socialData = {
      ...supplyBackpackMock,
      selectedItemDetail: {
        ...supplyBackpackMock.itemDetails.find((detail) => detail.itemId === "drink_water_ping")!,
        socialTargets: [
          { userId: "user-li", username: "李雷", avatarKey: "avatar-01" },
          { userId: "user-han", username: "韩梅梅", avatarKey: "avatar-02" },
        ],
      },
      itemDetails: supplyBackpackMock.itemDetails.map((detail) =>
        detail.itemId === "drink_water_ping"
          ? {
              ...detail,
              socialTargets: [
                { userId: "user-li", username: "李雷", avatarKey: "avatar-01" },
                { userId: "user-han", username: "韩梅梅", avatarKey: "avatar-02" },
              ],
            }
          : detail,
      ),
    };

    await act(async () => {
      root.render(
        <SupplyBackpackScene
          data={socialData}
          onUseItem={onUseItem}
          selectedItemId="drink_water_ping"
        />,
      );
    });

    const targetSelect = container.querySelector<HTMLSelectElement>(
      "select[aria-label='选择点名对象']",
    );

    expect(targetSelect).not.toBeNull();
    expect(container.querySelector(".supply-backpack-use-button")?.textContent).toBe("选择队友");

    await act(async () => {
      targetSelect!.value = "user-han";
      targetSelect!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='use-item']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onUseItem).toHaveBeenCalledWith("drink_water_ping", { recipientUserId: "user-han" });
  });
});
