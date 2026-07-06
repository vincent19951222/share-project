import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createJsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

function buildSnapshot(): SupplyStationProductionSnapshot {
  return {
    currentUserId: "u1",
    currentUserRole: "MEMBER",
    teamId: "team-1",
    dayKey: "2026-05-26",
    resources: {
      coins: { label: "银子", value: 2400 },
      ticket: { label: "抽奖券", value: 12 },
      backpack: { label: "背包", value: 1, maxValue: 60 },
    },
    profile: {
      username: "li",
      avatarKey: "male1",
      totalExp: 1720,
      level: 2,
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
            id: "assignment-movement",
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
        ticketBalance: 12,
        maxFreeTicketsToday: 2,
        todayEarned: 0,
        todaySpent: 0,
        lifeTicketEarned: false,
        fitnessTicketEarned: false,
        taskCompletedCount: 0,
        lifeTicketClaimable: false,
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
      totalQuantity: 0,
      ownedItemCount: 0,
      previewItems: [],
      groups: [],
      todayEffects: [],
      emptyMessage: "暂无补给",
      capacity: { usedSlots: 0, totalSlots: 60 },
    },
    shop: { products: [] },
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
  };
}

describe("SupplyStation legacy entry", () => {
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
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders the UI Lab production scene through the stable SupplyStation export", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildSnapshot() })));
    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/gamification/supply/state",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );
    expect(container.querySelector(".supply-dashboard-scene")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-scene--embedded")).not.toBeNull();
    expect(container.querySelector(".supply-production-shell")).toBeNull();
    expect(container.querySelector(".supply-dashboard-scene")?.getAttribute("aria-label")).toBe("牛马补给站");
    expect(container.querySelector(".supply-ui-lab-topbar")).toBeNull();
    expect(container.textContent).toContain("工位重启");

    expect(container.textContent).not.toContain("玩法规则");
    expect(container.textContent).not.toContain("抽奖概率");
  });
});
