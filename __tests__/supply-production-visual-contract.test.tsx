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
    ticket: { label: "抽奖券", value: 5 },
    backpack: { label: "背包", value: 17, maxValue: 60 },
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

  it("renders the approved UI Lab dashboard scene in production", async () => {
    await act(async () => {
      root.render(<SupplyStationShell />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector(".supply-dashboard-scene")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-background")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-stage")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-production-shell")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-production-nav")).toBeNull();
    expect(container.textContent).toContain("银子");
    expect(container.textContent).toContain("845");
    expect(container.textContent).toContain("50/1000");
    expect(container.textContent).not.toContain("生产模式");
    expect(container.textContent).not.toContain("操作会写入真实补给站数据");
  });

  it("keeps top navigation inside production supply station instead of linking to UI Lab routes", async () => {
    await act(async () => {
      root.render(<SupplyStationShell onBackToPunch={vi.fn()} />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    const shopTab = container.querySelector<HTMLButtonElement>(".supply-ui-lab-topbar-tab--shop");

    expect(shopTab?.tagName).toBe("BUTTON");
    expect(shopTab?.getAttribute("href")).toBeNull();
    expect(container.querySelector(".supply-ui-lab-return-action")?.textContent).toContain("回到打卡");

    await act(async () => {
      shopTab?.click();
    });

    expect(container.querySelector(".supply-shop-scene")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-return-action")?.textContent).toContain("回到打卡");
    expect(container.querySelector(".supply-ui-lab-tabs a[href^='/ui-lab/supply-dashboard']")).toBeNull();
  });
});
