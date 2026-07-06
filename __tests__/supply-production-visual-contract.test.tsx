import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyStationShell } from "@/components/gamification/production/SupplyStationShell";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = {
  currentUserId: "u1",
  currentUserRole: "MEMBER",
  teamId: "t1",
  dayKey: "2026-05-26",
  resources: {
    coins: { label: "银子", value: 845 },
  },
  profile: {
    username: "li",
    avatarKey: "male1",
    totalExp: 50,
    level: 1,
    currentLevelExp: 50,
    nextLevelExp: 1000,
    title: "自律牛马",
  },
  dashboard: {
    todayEffects: [],
    dailyQuests: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "站一站，不然屁股长根",
        description: "起身、走动、拉伸、短暂恢复。",
        assignment: {
          id: "a1",
          taskCardId: "movement_002",
          title: "屁股离线",
          description: "找一个理由离开座位走一小圈。",
          status: "pending",
          completedAt: null,
          completionText: null,
          rerollCount: 0,
          rerollLimit: 1,
          canComplete: true,
          canReroll: true,
        },
      },
    ],
  },
  drawPool: {
    wallet: {
      maxFreeTicketsToday: 2,
      todayEarned: 0,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: false,
      taskCompletedCount: 0,
      lifeTicketClaimable: false,
      ticketBalance: 5,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: true,
      tenDrawEnabled: true,
      tenDrawTopUpRequired: 5,
      tenDrawTopUpCoinCost: 200,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "还差 5 张券，可用 200 银子补齐十连。",
      recentDraws: [],
    },
  },
  backpack: {
    status: "active",
    totalQuantity: 17,
    ownedItemCount: 1,
    previewItems: [],
    groups: [],
    todayEffects: [],
    emptyMessage: "背包为空",
    capacity: { usedSlots: 17, totalSlots: 60 },
  },
  shop: {
    products: [
      {
        itemId: "task_reroll_coupon",
        name: "任务换班券",
        description: "换掉一个今日任务",
        category: "task",
        priceCoins: 150,
        ownedQuantity: 0,
        dailyLimit: 1,
        purchaseEnabled: true,
        purchaseDisabledReason: null,
        requiresAdminConfirmation: false,
      },
    ],
  },
  taskRecord: {
    dates: [{ key: "2026-05-26", label: "今天", dateLabel: "05/26", weekday: "周二" }],
    timeline: [],
  },
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
    message: "队友雷达可用。",
  },
  redemptions: { mine: [], adminQueue: [] },
  supplyAiImage: {
    wallet: { coins: 0, generationCostPerImage: 60, themeDrawCost: 200 },
    themes: { unlocked: [], locked: [], allUnlocked: false },
    recentTasks: [],
    recentArtworks: [],
  },
  legacyArchive: { ticketBalance: 0, inventoryQuantity: 0, redemptionCount: 0, latestTaskRecordCount: 0 },
} satisfies SupplyStationProductionSnapshot;

describe("production supply UI Lab visual contract", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === "/api/gamification/supply/state") {
          return new Response(JSON.stringify({ snapshot }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: "unexpected request" }), { status: 500 });
      }),
    );

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders the approved AI image studio shell in production", async () => {
    const navContextMock = vi.fn();

    await act(async () => {
      root.render(<SupplyStationShell onNavContextChange={navContextMock} />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector(".supply-ai-image-shell")).not.toBeNull();
    expect(container.querySelector(".supply-ai-image-shell-header")).not.toBeNull();
    expect(container.querySelector(".supply-ai-image-shell-nav")).not.toBeNull();
    expect(container.querySelector(".supply-ai-image-studio-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-scene")).toBeNull();
    expect(container.textContent).toContain("845");
    expect(container.textContent).not.toContain("生产模式");
    expect(container.textContent).not.toContain("debug");
    expect(container.textContent).not.toContain("Playground");
    expect(navContextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        resources: [expect.objectContaining({ id: "coins", label: "银子", value: 845 })],
        profile: { username: "li", avatarKey: "male1" },
      }),
    );
  });

  it("switches to the requested AI image panel without legacy lab chrome", async () => {
    await act(async () => {
      root.render(<SupplyStationShell initialPanel="artworks" onBackToPunch={vi.fn()} />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector(".supply-artwork-backpack-panel")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).toBeNull();
    expect(container.querySelector(".supply-shop-scene")).toBeNull();
    expect(container.querySelector("[data-panel='artworks'][data-state='active']")).not.toBeNull();
  });
});
