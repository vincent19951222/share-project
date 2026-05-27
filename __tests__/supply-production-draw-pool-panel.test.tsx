import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyDrawPoolPanel } from "@/components/gamification/production/SupplyDrawPoolPanel";
import type {
  GamificationLotteryDrawSnapshot,
  SupplyStationProductionSnapshot,
} from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot = {
  currentUserId: "u1",
  currentUserRole: "MEMBER",
  teamId: "t1",
  dayKey: "2026-05-26",
  resources: {
    coins: { label: "银子", value: 2450 },
    ticket: { label: "抽奖券", value: 8 },
    backpack: { label: "背包", value: 2, maxValue: 60 },
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
      todayEarned: 1,
      todaySpent: 0,
      lifeTicketEarned: false,
      fitnessTicketEarned: true,
      taskCompletedCount: 2,
      lifeTicketClaimable: false,
      ticketBalance: 8,
    },
    lottery: {
      status: "active",
      singleDrawEnabled: true,
      tenDrawEnabled: true,
      tenDrawTopUpRequired: 2,
      tenDrawTopUpCoinCost: 80,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "抽奖机已就绪",
      recentDraws: [],
    },
  },
  backpack: {
    status: "active",
    totalQuantity: 2,
    ownedItemCount: 1,
    previewItems: [],
    groups: [],
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
} satisfies SupplyStationProductionSnapshot;

const latestDraw = {
  id: "draw-1",
  drawType: "TEN",
  ticketSpent: 10,
  coinSpent: 80,
  guaranteeApplied: true,
  createdAt: "2026-05-26T06:00:00.000Z",
  rewards: [
    {
      rewardId: "luckin_coffee_coupon",
      rewardTier: "rare",
      rewardKind: "ITEM",
      name: "瑞幸咖啡券",
      description: "咖啡补给",
      effectSummary: "管理员确认后兑换",
    },
  ],
} satisfies GamificationLotteryDrawSnapshot;

describe("SupplyDrawPoolPanel", () => {
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

  it("renders production wallet, draw actions, top-up, and guarantee copy", async () => {
    await act(async () => {
      root.render(
        <SupplyDrawPoolPanel
          activeAction={null}
          latestDraw={null}
          onDraw={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("抽奖券");
    expect(container.textContent).toContain("8 张");
    expect(container.textContent).toContain("单抽");
    expect(container.textContent).toContain("补券十连");
    expect(container.textContent).toContain("十连保底");
    expect(container.textContent).toContain("十连还差 2 张券");
    expect(container.textContent).toContain("需要 80 银子补齐");
  });

  it("fires draw callbacks with the expected top-up flag", async () => {
    const onDraw = vi.fn();

    await act(async () => {
      root.render(
        <SupplyDrawPoolPanel
          activeAction={null}
          latestDraw={null}
          onDraw={onDraw}
          snapshot={snapshot}
        />,
      );
    });

    container
      .querySelector<HTMLButtonElement>("[data-action='draw-single']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    container
      .querySelector<HTMLButtonElement>("[data-action='draw-ten']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onDraw).toHaveBeenCalledWith("SINGLE", false);
    expect(onDraw).toHaveBeenCalledWith("TEN", true);
  });

  it("renders the latest draw result", async () => {
    await act(async () => {
      root.render(
        <SupplyDrawPoolPanel
          activeAction={null}
          latestDraw={latestDraw}
          onDraw={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("十连结果");
    expect(container.textContent).toContain("触发十连保底");
    expect(container.textContent).toContain("瑞幸咖啡券");
    expect(container.textContent).toContain("管理员确认后兑换");
  });
});
