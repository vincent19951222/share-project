import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyShopPanel } from "@/components/gamification/production/SupplyShopPanel";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = {
  currentUserId: "u1",
  currentUserRole: "MEMBER",
  teamId: "t1",
  dayKey: "2026-05-26",
  resources: {
    coins: { label: "银子", value: 2450 },
  },
  profile: {
    username: "li",
    avatarKey: "male1",
    totalExp: 2720,
    level: 3,
    currentLevelExp: 720,
    nextLevelExp: 1000,
    title: "自律牛马",
  },
  dashboard: { todayEffects: [], dailyQuests: [] },
  drawPool: {
    wallet: {
      maxFreeTicketsToday: 2,
      todayEarned: 0,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: false,
      taskCompletedCount: 0,
      lifeTicketClaimable: false,
      ticketBalance: 18,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: true,
      tenDrawEnabled: true,
      tenDrawTopUpRequired: 0,
      tenDrawTopUpCoinCost: 0,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "ready",
      recentDraws: [],
    },
  },
  backpack: {
    status: "active",
    totalQuantity: 2,
    ownedItemCount: 2,
    previewItems: [],
    groups: [],
    todayEffects: [],
    emptyMessage: "暂无补给",
    capacity: { usedSlots: 2, totalSlots: 60 },
  },
  shop: {
    products: [
      {
        itemId: "small_boost_coupon",
        name: "小额增益券",
        description: "今日健身收益提高 50%。",
        category: "boost",
        priceCoins: 180,
        ownedQuantity: 1,
        dailyLimit: 2,
        weeklyLimit: 5,
        purchaseEnabled: true,
        purchaseDisabledReason: null,
        requiresAdminConfirmation: false,
      },
      {
        itemId: "disabled_reward_coupon",
        name: "下架福利券",
        description: "这个商品暂时不能购买。",
        category: "real_world",
        priceCoins: 800,
        ownedQuantity: 0,
        dailyLimit: 1,
        purchaseEnabled: false,
        purchaseDisabledReason: "商品配置不可用",
        requiresAdminConfirmation: true,
      },
    ],
  },
  taskRecord: { dates: [], timeline: [] },
  social: {
    status: "active",
    pendingSentCount: 0,
    pendingReceivedCount: 0,
    teamWidePendingCount: 0,
    sent: [],
    received: [],
    teamWide: [],
    recentResponses: [],
    availableRecipients: [],
    message: "ready",
  },
  redemptions: { mine: [], adminQueue: [] },
  supplyAiImage: {
    wallet: { coins: 0, generationCostPerImage: 10, themeDrawCost: 200 },
    themes: { unlocked: [], locked: [], allUnlocked: false },
    recentTasks: [],
    recentArtworks: [],
  },
  legacyArchive: { ticketBalance: 0, inventoryQuantity: 0, redemptionCount: 0, latestTaskRecordCount: 0 },
} satisfies SupplyStationProductionSnapshot;

describe("SupplyShopPanel", () => {
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

  it("renders products, prices, owned quantities, limits, and admin confirmation labels", async () => {
    await act(async () => {
      root.render(
        <SupplyShopPanel
          activeAction={null}
          selectedItemId={null}
          onPurchase={vi.fn()}
          onSelectItem={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("银子");
    expect(container.textContent).toContain("2,450");
    expect(container.textContent).toContain("小额增益券");
    expect(container.textContent).toContain("银子 180");
    expect(container.textContent).toContain("持有 1");
    expect(container.textContent).toContain("每日限购 2");
    expect(container.textContent).toContain("每周限购 5");
    expect(container.textContent).toContain("下架福利券");
    expect(container.textContent).toContain("管理员确认");
    expect(container.querySelectorAll("[data-testid='supply-shop-product']")).toHaveLength(2);
  });

  it("selects products and purchases enabled products", async () => {
    const onSelectItem = vi.fn();
    const onPurchase = vi.fn();

    await act(async () => {
      root.render(
        <SupplyShopPanel
          activeAction={null}
          selectedItemId="small_boost_coupon"
          onPurchase={onPurchase}
          onSelectItem={onSelectItem}
          snapshot={snapshot}
        />,
      );
    });

    container
      .querySelector<HTMLButtonElement>("[data-testid='supply-shop-product'][data-item-id='disabled_reward_coupon']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSelectItem).toHaveBeenCalledWith("disabled_reward_coupon");

    container
      .querySelector<HTMLButtonElement>("[data-action='purchase-shop-item']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onPurchase).toHaveBeenCalledWith("small_boost_coupon");
  });

  it("disables unavailable products and exposes the disabled reason", async () => {
    const onPurchase = vi.fn();

    await act(async () => {
      root.render(
        <SupplyShopPanel
          activeAction={null}
          selectedItemId="disabled_reward_coupon"
          onPurchase={onPurchase}
          onSelectItem={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    const button = container.querySelector<HTMLButtonElement>("[data-action='purchase-shop-item']");

    expect(container.textContent).toContain("商品配置不可用");
    expect(button?.disabled).toBe(true);

    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onPurchase).not.toHaveBeenCalled();
  });
});
