import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SupplyTaskRecordPanel } from "@/components/gamification/production/SupplyTaskRecordPanel";
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
  shop: { products: [] },
  taskRecord: {
    dates: [
      { key: "2026-05-26", label: "今天", dateLabel: "05/26", weekday: "周二" },
      { key: "2026-05-25", label: "昨天", dateLabel: "05/25", weekday: "周一" },
      { key: "2026-05-24", label: "2 天前", dateLabel: "05/24", weekday: "周日" },
      { key: "2026-05-23", label: "3 天前", dateLabel: "05/23", weekday: "周六" },
      { key: "2026-05-22", label: "4 天前", dateLabel: "05/22", weekday: "周五" },
      { key: "2026-05-21", label: "5 天前", dateLabel: "05/21", weekday: "周四" },
      { key: "2026-05-20", label: "6 天前", dateLabel: "05/20", weekday: "周三" },
    ],
    timeline: [
      {
        id: "task:1",
        dayKey: "2026-05-26",
        occurredAt: "2026-05-26T01:00:00.000Z",
        title: "完成任务",
        subtitle: "工位重启 · movement",
        category: "task",
        statusLabel: "已完成",
      },
      {
        id: "draw:1",
        dayKey: "2026-05-26",
        occurredAt: "2026-05-26T02:00:00.000Z",
        title: "补给抽卡",
        subtitle: "单抽 · 消耗 1 张券 · 1 个奖励",
        category: "draw",
        statusLabel: "已归档",
      },
      {
        id: "shop:1",
        dayKey: "2026-05-25",
        occurredAt: "2026-05-25T02:00:00.000Z",
        title: "购买补给",
        subtitle: "任务换班券 x1 · 150 银子",
        category: "shop",
        statusLabel: "SETTLED",
      },
    ],
  },
  social: {
    status: "active",
    pendingSentCount: 0,
    pendingReceivedCount: 1,
    teamWidePendingCount: 1,
    sent: [],
    received: [
      {
        id: "invite-direct",
        senderUserId: "u2",
        senderUsername: "luo",
        recipientUserId: "u1",
        recipientUsername: "li",
        invitationType: "coffee_walk",
        status: "PENDING",
        dayKey: "2026-05-26",
        message: "去走两步？",
        responseCount: 0,
        wechatWebhookSentAt: null,
        respondedAt: null,
        expiredAt: null,
        createdAt: "2026-05-26T03:00:00.000Z",
      },
    ],
    teamWide: [
      {
        id: "invite-team",
        senderUserId: "u3",
        senderUsername: "liu",
        recipientUserId: null,
        recipientUsername: null,
        invitationType: "stretch",
        status: "PENDING",
        dayKey: "2026-05-26",
        message: "全队拉伸 2 分钟",
        responseCount: 0,
        wechatWebhookSentAt: null,
        respondedAt: null,
        expiredAt: null,
        createdAt: "2026-05-26T03:10:00.000Z",
      },
    ],
    recentResponses: [],
    availableRecipients: [],
    message: "ready",
  },
  redemptions: {
    mine: [
      {
        id: "redemption-1",
        userId: "u1",
        username: "li",
        itemId: "luckin_coffee_coupon",
        itemName: "瑞幸咖啡券",
        redemptionType: "luckin_coffee",
        status: "REQUESTED",
        statusLabel: "待管理员确认",
        statusTone: "warning",
        requestedAt: "2026-05-26T04:00:00.000Z",
        confirmedAt: null,
        cancelledAt: null,
        confirmedByUsername: null,
        cancelledByUsername: null,
        note: null,
      },
    ],
    adminQueue: [],
  },
  supplyAiImage: {
    wallet: { coins: 2450, generationCostPerImage: 10, themeDrawCost: 200 },
    themes: { unlocked: [], locked: [], allUnlocked: false },
    recentTasks: [],
    recentArtworks: [],
  },
  legacyArchive: { ticketBalance: 18, inventoryQuantity: 2, redemptionCount: 1, latestTaskRecordCount: 3 },
} satisfies SupplyStationProductionSnapshot;

describe("SupplyTaskRecordPanel", () => {
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

  it("renders seven date tabs and filters timeline rows by selected date", async () => {
    await act(async () => {
      root.render(
        <SupplyTaskRecordPanel
          activeAction={null}
          onRespondSocialInvitation={vi.fn()}
          snapshot={snapshot}
        />,
      );
    });

    expect(container.querySelectorAll("[data-testid='supply-task-record-date']")).toHaveLength(7);
    expect(container.textContent).toContain("完成任务");
    expect(container.textContent).toContain("补给抽卡");
    expect(container.textContent).not.toContain("购买补给");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-testid='supply-task-record-date'][data-date-key='2026-05-25']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("购买补给");
    expect(container.textContent).not.toContain("完成任务");
  });

  it("switches modes for draws, redemptions, radar, and rules", async () => {
    const onRespondSocialInvitation = vi.fn();

    await act(async () => {
      root.render(
        <SupplyTaskRecordPanel
          activeAction={null}
          onRespondSocialInvitation={onRespondSocialInvitation}
          snapshot={snapshot}
        />,
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-mode='draws']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("抽卡记录");
    expect(container.querySelectorAll("[data-testid='supply-task-record-row']")).toHaveLength(1);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-mode='redemptions']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("瑞幸咖啡券");
    expect(container.textContent).toContain("待管理员确认");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-mode='radar']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("去走两步？");
    expect(container.textContent).toContain("全队拉伸 2 分钟");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='respond-social-invitation'][data-invitation-id='invite-direct']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onRespondSocialInvitation).toHaveBeenCalledWith("invite-direct");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-mode='rules']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("最近 7 天记录来自真实业务流水");
    expect(container.textContent).not.toContain("team-goal");
  });
});
