import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyDashboardPanel } from "@/components/gamification/production/SupplyDashboardPanel";
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
  dashboard: {
    todayEffects: [],
    dailyQuests: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "动一动",
        description: "movement",
        assignment: {
          id: "a1",
          taskCardId: "movement_001",
          title: "工位重启",
          description: "站起来活动 3 分钟",
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
  supplyAiImage: {
    wallet: { coins: 0, generationCostPerImage: 60, themeDrawCost: 200 },
    themes: { unlocked: [], locked: [], allUnlocked: false },
    recentTasks: [],
    recentArtworks: [],
  },
  legacyArchive: { ticketBalance: 0, inventoryQuantity: 0, redemptionCount: 0, latestTaskRecordCount: 0 },
} satisfies SupplyStationProductionSnapshot;

describe("SupplyDashboardPanel", () => {
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

  it("renders production resources, profile exp, and empty today effects", async () => {
    await act(async () => {
      root.render(
        <SupplyDashboardPanel
          activeAction={null}
          onClaimTicket={vi.fn()}
          onCompleteTask={vi.fn()}
          onNavigate={vi.fn()}
          onRerollTask={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("银子");
    expect(container.textContent).toContain("2,450");
    expect(container.textContent).not.toContain("抽奖券");
    expect(container.textContent).not.toContain("背包");
    expect(container.textContent).toContain("Lv.3");
    expect(container.textContent).toContain("720/1000");
    expect(container.textContent).toContain("距离升级还差 280 EXP");
    expect(container.textContent).toContain("今天还没有生效中的补给效果");
  });

  it("renders quest actions with dimension keys", async () => {
    const onCompleteTask = vi.fn();
    const onRerollTask = vi.fn();
    const onClaimTicket = vi.fn();

    await act(async () => {
      root.render(
        <SupplyDashboardPanel
          activeAction={null}
          onClaimTicket={onClaimTicket}
          onCompleteTask={onCompleteTask}
          onNavigate={vi.fn()}
          onRerollTask={onRerollTask}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.textContent).toContain("工位重启");
    expect(container.textContent).toContain("站起来活动 3 分钟");

    container
      .querySelector<HTMLButtonElement>("[data-action='complete-task']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    container
      .querySelector<HTMLButtonElement>("[data-action='reroll-task']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    container
      .querySelector<HTMLButtonElement>("[data-action='claim-ticket']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onCompleteTask).toHaveBeenCalledWith("movement");
    expect(onRerollTask).toHaveBeenCalledWith("movement");
    expect(onClaimTicket).toHaveBeenCalledTimes(1);
  });
});
