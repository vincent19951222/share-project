import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyBackpackPanel } from "@/components/gamification/production/SupplyBackpackPanel";
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
    groups: [
      {
        category: "boost",
        label: "增益",
        totalQuantity: 1,
        items: [
          {
            itemId: "small_boost_coupon",
            category: "boost",
            categoryLabel: "增益",
            name: "小额增益券",
            description: "今日健身收益提高 50%。",
            quantity: 1,
            reservedQuantity: 0,
            availableQuantity: 1,
            useEnabled: true,
            useDisabledReason: null,
            useTiming: "today",
            useTimingLabel: "今日内生效",
            effectSummary: "健身银子 x1.5",
            usageLimitSummary: "每天最多使用 1 张",
            stackable: false,
            requiresAdminConfirmation: false,
            enabled: true,
            knownDefinition: true,
          },
        ],
      },
      {
        category: "real_world",
        label: "真实福利",
        totalQuantity: 1,
        items: [
          {
            itemId: "luckin_coffee_coupon",
            category: "real_world",
            categoryLabel: "真实福利",
            name: "瑞幸咖啡券",
            description: "向管理员申请线下咖啡补给。",
            quantity: 1,
            reservedQuantity: 0,
            availableQuantity: 1,
            useEnabled: true,
            useDisabledReason: null,
            useTiming: "manual_redemption",
            useTimingLabel: "管理员确认后兑换",
            effectSummary: "兑换 1 杯咖啡",
            usageLimitSummary: "库存足够时可申请",
            stackable: true,
            requiresAdminConfirmation: true,
            enabled: true,
            knownDefinition: true,
          },
        ],
      },
    ],
    todayEffects: [],
    emptyMessage: "暂无补给",
    capacity: { usedSlots: 2, totalSlots: 60 },
  },
  shop: { products: [] },
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

describe("SupplyBackpackPanel", () => {
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

  it("renders fixed capacity, grouped inventory, and empty today effects", async () => {
    await act(async () => {
      root.render(
        <SupplyBackpackPanel
          activeAction={null}
          selectedItemId={null}
          onRequestRedemption={vi.fn()}
          onSelectItem={vi.fn()}
          onUseItem={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("2/60");
    expect(container.textContent).toContain("增益");
    expect(container.textContent).toContain("真实福利");
    expect(container.textContent).toContain("小额增益券");
    expect(container.textContent).toContain("瑞幸咖啡券");
    expect(container.textContent).toContain("今天还没有生效中的补给效果");
    expect(container.querySelectorAll("[data-testid='supply-backpack-item']")).toHaveLength(2);
  });

  it("selects inventory items and renders selected item details", async () => {
    const onSelectItem = vi.fn();

    await act(async () => {
      root.render(
        <SupplyBackpackPanel
          activeAction={null}
          selectedItemId="small_boost_coupon"
          onRequestRedemption={vi.fn()}
          onSelectItem={onSelectItem}
          onUseItem={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("今日健身收益提高 50%。");
    expect(container.textContent).toContain("今日内生效");
    expect(container.textContent).toContain("健身银子 x1.5");
    expect(container.textContent).toContain("每天最多使用 1 张");

    container
      .querySelector<HTMLButtonElement>("[data-testid='supply-backpack-item'][data-item-id='luckin_coffee_coupon']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSelectItem).toHaveBeenCalledWith("luckin_coffee_coupon");
  });

  it("fires item use and real-world redemption callbacks", async () => {
    const onUseItem = vi.fn();
    const onRequestRedemption = vi.fn();

    await act(async () => {
      root.render(
        <SupplyBackpackPanel
          activeAction={null}
          selectedItemId="small_boost_coupon"
          onRequestRedemption={onRequestRedemption}
          onSelectItem={vi.fn()}
          onUseItem={onUseItem}
          snapshot={snapshot}
        />,
      );
    });

    container
      .querySelector<HTMLButtonElement>("[data-action='use-item']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onUseItem).toHaveBeenCalledWith("small_boost_coupon", undefined);

    await act(async () => {
      root.render(
        <SupplyBackpackPanel
          activeAction={null}
          selectedItemId="luckin_coffee_coupon"
          onRequestRedemption={onRequestRedemption}
          onSelectItem={vi.fn()}
          onUseItem={onUseItem}
          snapshot={snapshot}
        />,
      );
    });

    container
      .querySelector<HTMLButtonElement>("[data-action='request-redemption']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onRequestRedemption).toHaveBeenCalledWith("luckin_coffee_coupon");
  });
});
