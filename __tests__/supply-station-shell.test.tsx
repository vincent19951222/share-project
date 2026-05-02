import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GamificationStateSnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

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

function buildAssignment(
  dimensionKey: "movement" | "hydration" | "social" | "learning",
  index: number,
  overrides: Partial<NonNullable<GamificationStateSnapshot["dimensions"][number]["assignment"]>> = {},
) {
  return {
    id: `assignment-${dimensionKey}`,
    taskCardId: `${dimensionKey}_${String(index).padStart(3, "0")}`,
    title: `${dimensionKey} task`,
    description: `${dimensionKey} description`,
    status: "pending" as const,
    completedAt: null,
    completionText: null,
    rerollCount: 0,
    rerollLimit: 1 as const,
    canComplete: true,
    canReroll: true,
    ...overrides,
  };
}

const smallBoostBackpackItem: GamificationStateSnapshot["backpack"]["previewItems"][number] = {
  itemId: "small_boost_coupon",
  category: "boost",
  categoryLabel: "Boost",
  name: "Small Boost Coupon",
  description: "Boost today's personal fitness income.",
  quantity: 1,
  reservedQuantity: 0,
  availableQuantity: 1,
  useEnabled: true,
  useDisabledReason: null,
  useTiming: "today",
  useTimingLabel: "Today",
  effectSummary: "Personal fitness income 1.5x today.",
  usageLimitSummary: "Once per user per day.",
  stackable: false,
  requiresAdminConfirmation: false,
  enabled: true,
  knownDefinition: true,
};

const luckinBackpackItem: GamificationStateSnapshot["backpack"]["previewItems"][number] = {
  itemId: "luckin_coffee_coupon",
  category: "real_world",
  categoryLabel: "Real World",
  name: "Luckin Coffee Coupon",
  description: "Redeem one coffee with an admin.",
  quantity: 2,
  reservedQuantity: 0,
  availableQuantity: 2,
  useEnabled: false,
  useDisabledReason: "这个道具的使用入口还没开放",
  useTiming: "manual_redemption",
  useTimingLabel: "Manual redemption",
  effectSummary: "Ask an admin to redeem an offline benefit.",
  usageLimitSummary: "Can be held in stacks; requires admin confirmation.",
  stackable: true,
  requiresAdminConfirmation: true,
  enabled: true,
  knownDefinition: true,
};

const taskRerollBackpackItem: GamificationStateSnapshot["backpack"]["previewItems"][number] = {
  itemId: "task_reroll_coupon",
  category: "task",
  categoryLabel: "Task",
  name: "Task Reroll Coupon",
  description: "Reroll one task.",
  quantity: 1,
  reservedQuantity: 0,
  availableQuantity: 1,
  useEnabled: true,
  useDisabledReason: null,
  useTiming: "instant",
  useTimingLabel: "Instant",
  effectSummary: "Reroll a task.",
  usageLimitSummary: "Once per day.",
  stackable: true,
  requiresAdminConfirmation: false,
  enabled: true,
  knownDefinition: true,
};

function buildSocialFixture(): GamificationStateSnapshot["social"] {
  return {
    status: "active",
    pendingSentCount: 1,
    pendingReceivedCount: 1,
    teamWidePendingCount: 1,
    sent: [
      {
        id: "social-sent-1",
        senderUserId: "u1",
        senderUsername: "li",
        recipientUserId: "u2",
        recipientUsername: "luo",
        invitationType: "DRINK_WATER",
        status: "PENDING",
        dayKey: "2026-04-29",
        message: "drink invite message",
        responseCount: 0,
        wechatWebhookSentAt: null,
        respondedAt: null,
        expiredAt: null,
        createdAt: "2026-04-29T01:00:00.000Z",
      },
    ],
    received: [
      {
        id: "social-received-1",
        senderUserId: "u2",
        senderUsername: "luo",
        recipientUserId: "u1",
        recipientUsername: "li",
        invitationType: "WALK_AROUND",
        status: "PENDING",
        dayKey: "2026-04-29",
        message: "walk invite message",
        responseCount: 0,
        wechatWebhookSentAt: null,
        respondedAt: null,
        expiredAt: null,
        createdAt: "2026-04-29T01:10:00.000Z",
      },
    ],
    teamWide: [
      {
        id: "social-team-1",
        senderUserId: "u3",
        senderUsername: "liu",
        recipientUserId: null,
        recipientUsername: null,
        invitationType: "TEAM_STANDUP",
        status: "PENDING",
        dayKey: "2026-04-29",
        message: "standup invite message",
        responseCount: 2,
        wechatWebhookSentAt: null,
        respondedAt: null,
        expiredAt: null,
        createdAt: "2026-04-29T01:20:00.000Z",
      },
    ],
    recentResponses: [
      {
        id: "response-1",
        invitationId: "social-team-1",
        invitationType: "TEAM_STANDUP",
        responderUserId: "u2",
        responderUsername: "luo",
        responseText: "已起立",
        createdAt: "2026-04-29T01:25:00.000Z",
      },
    ],
    availableRecipients: [
      { userId: "u2", username: "luo", avatarKey: "male2" },
      { userId: "u3", username: "liu", avatarKey: "female1" },
    ],
    message: "Social tools are active.",
  };
}

function buildBackpackFixture(): GamificationStateSnapshot["backpack"] {
  return {
    status: "active",
    totalQuantity: 4,
    ownedItemCount: 3,
    previewItems: [smallBoostBackpackItem, luckinBackpackItem, taskRerollBackpackItem],
    groups: [
      {
        category: "boost",
        label: "Boost",
        totalQuantity: 1,
        items: [smallBoostBackpackItem],
      },
      {
        category: "real_world",
        label: "Real World",
        totalQuantity: 2,
        items: [luckinBackpackItem],
      },
      {
        category: "task",
        label: "Task",
        totalQuantity: 1,
        items: [taskRerollBackpackItem],
      },
    ],
    todayEffects: [
      {
        id: "use_1",
        itemId: "small_boost_coupon",
        name: "Small Boost Coupon",
        status: "PENDING",
        statusLabel: "Pending today",
        effectSummary: "Personal fitness income 1.5x today.",
        createdAt: "2026-04-26T01:00:00.000Z",
        settledAt: null,
      },
    ],
    emptyMessage: "Holding 2 item types.",
  };
}

const requestedRedemption: GamificationStateSnapshot["redemptions"]["mine"][number] = {
  id: "redemption-1",
  userId: "u1",
  username: "luo",
  itemId: "luckin_coffee_coupon",
  itemName: "Luckin Coffee Coupon",
  redemptionType: "luckin_coffee",
  status: "REQUESTED",
  statusLabel: "待管理员确认",
  statusTone: "warning",
  requestedAt: "2026-04-26T01:00:00.000Z",
  confirmedAt: null,
  cancelledAt: null,
  confirmedByUsername: null,
  cancelledByUsername: null,
  note: null,
};

function buildSnapshot(
  overrides: Partial<GamificationStateSnapshot> = {},
): GamificationStateSnapshot {
  return {
    currentUserId: "u1",
    currentUserRole: "MEMBER",
    teamId: "team-1",
    dayKey: "2026-04-29",
    ticketBalance: 8,
    dimensions: [
      {
        key: "movement",
        title: "Movement",
        subtitle: "Move a little",
        description: "Movement dimension",
        assignment: buildAssignment("movement", 1),
      },
      {
        key: "hydration",
        title: "Hydration",
        subtitle: "Drink water",
        description: "Hydration dimension",
        assignment: buildAssignment("hydration", 1),
      },
      {
        key: "social",
        title: "Social",
        subtitle: "Talk briefly",
        description: "Social dimension",
        assignment: buildAssignment("social", 1),
      },
      {
        key: "learning",
        title: "Learning",
        subtitle: "Read something",
        description: "Learning dimension",
        assignment: buildAssignment("learning", 1),
      },
    ],
    ticketSummary: {
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
      tenDrawTopUpRequired: 2,
      tenDrawTopUpCoinCost: 80,
      dailyTopUpPurchased: 0,
      dailyTopUpLimit: 10,
      ticketPrice: 40,
      message: "Need 2 more tickets, can top up for 80 coins.",
      recentDraws: [],
    },
    backpack: {
      status: "active",
      totalQuantity: 0,
      ownedItemCount: 0,
      previewItems: [],
      groups: [],
      todayEffects: [],
      emptyMessage: "Backpack empty",
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
      message: "Social tools open later",
    },
    redemptions: {
      mine: [],
      adminQueue: [],
    },
    ...overrides,
  };
}

function buildSnapshotWithCompletedMovement(): GamificationStateSnapshot {
  const snapshot = buildSnapshot({
    ticketSummary: {
      ...buildSnapshot().ticketSummary,
      taskCompletedCount: 1,
    },
  });
  const movement = snapshot.dimensions.find((dimension) => dimension.key === "movement");

  if (movement?.assignment) {
    movement.assignment.status = "completed";
    movement.assignment.completedAt = "2026-04-29T01:00:00.000Z";
    movement.assignment.completionText = "Done";
    movement.assignment.canComplete = false;
    movement.assignment.canReroll = false;
  }

  return snapshot;
}

function buildSnapshotWithRerolledHydration(): GamificationStateSnapshot {
  const snapshot = {
    ...buildSnapshotWithCompletedMovement(),
    ticketSummary: {
      ...buildSnapshotWithCompletedMovement().ticketSummary,
      taskCompletedCount: 4,
      lifeTicketClaimable: true,
    },
  };
  const hydration = snapshot.dimensions.find((dimension) => dimension.key === "hydration");

  if (hydration) {
    hydration.assignment = buildAssignment("hydration", 2, {
      title: "hydration rerolled task",
      description: "rerolled description",
      rerollCount: 1,
      canReroll: false,
    });
  }

  return snapshot;
}

function buildSnapshotWithClaimableTicket(): GamificationStateSnapshot {
  const snapshot = buildSnapshot({
    ticketSummary: {
      ...buildSnapshot().ticketSummary,
      taskCompletedCount: 4,
      lifeTicketClaimable: true,
    },
  });

  for (const dimension of snapshot.dimensions) {
    if (dimension.assignment) {
      dimension.assignment.status = "completed";
      dimension.assignment.completedAt = "2026-04-29T01:00:00.000Z";
      dimension.assignment.completionText = "Done";
      dimension.assignment.canComplete = false;
      dimension.assignment.canReroll = false;
    }
  }

  return snapshot;
}

function buildSnapshotWithClaimedTicket(): GamificationStateSnapshot {
  const base = buildSnapshotWithClaimableTicket();

  return {
    ...base,
    ticketBalance: 9,
    ticketSummary: {
      ...base.ticketSummary,
      todayEarned: 1,
      lifeTicketEarned: true,
      lifeTicketClaimable: false,
    },
  };
}

describe("SupplyStation", () => {
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
  });

  it("loads today's tasks and runs complete, reroll, and claim actions", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshotWithCompletedMovement() }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshotWithRerolledHydration() }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshotWithClaimedTicket() })),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/gamification/tasks/ensure-today",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      }),
    );
    expect(container.textContent).toContain("Movement");
    expect(container.textContent).toContain("Need 2 more tickets");

    const firstDimensionButtons = container
      .querySelector(".supply-dimension-card")
      ?.querySelectorAll("button");
    expect(firstDimensionButtons?.[0]).toBeDefined();

    await act(async () => {
      firstDimensionButtons![0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/gamification/tasks/complete",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(container.textContent).toContain("Done");

    const secondDimensionButtons = container
      .querySelectorAll(".supply-dimension-card")[1]
      ?.querySelectorAll("button");
    expect(secondDimensionButtons?.[1]).toBeDefined();

    await act(async () => {
      secondDimensionButtons![1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "/api/gamification/tasks/reroll",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const claimButton = container.querySelector("aside section:first-of-type button");
    expect(claimButton).toBeDefined();

    await act(async () => {
      claimButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      4,
      "/api/gamification/tasks/claim-ticket",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("renders a login recovery state for 401 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ error: "unauthenticated" }, false, 401)),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  });

  it("links to the supply station docs rules", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildSnapshot() })));

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    const ruleLink = Array.from(container.querySelectorAll("a")).find((link) =>
      link.textContent?.includes("玩法规则"),
    );

    expect(ruleLink).toBeDefined();
    expect(ruleLink?.getAttribute("href")).toBe("/docs?tab=rules#supply-station-rules");
  });

  it("links to the lottery probability docs from the lottery area", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildSnapshot() })));

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    const probabilityLink = Array.from(container.querySelectorAll("a")).find((link) =>
      link.textContent?.includes("抽奖概率"),
    );

    expect(probabilityLink).toBeDefined();
    expect(probabilityLink?.getAttribute("href")).toBe("/docs?tab=rules#supply-station-probability");
  });

  it("runs a lottery draw and renders the result", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot() }))
        .mockResolvedValueOnce(
          createJsonResponse({
            snapshot: buildSnapshot({
              ticketBalance: 7,
            }),
            draw: {
              id: "draw-1",
              drawType: "SINGLE",
              ticketSpent: 1,
              coinSpent: 0,
              guaranteeApplied: false,
              createdAt: "2026-04-24T01:00:00.000Z",
              rewards: [
                {
                  rewardId: "coins_005",
                  rewardTier: "coin",
                  rewardKind: "coins",
                  name: "Fish Touch Subsidy",
                  description: "Gain 5 coins.",
                  effectSummary: "+5 coins",
                },
              ],
            },
          }),
        ),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    const singleDrawButton = Array.from(
      container.querySelectorAll("aside section:nth-of-type(2) button"),
    ).find((button) => button.textContent?.includes("x1"));
    expect(singleDrawButton).toBeDefined();

    await act(async () => {
      singleDrawButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flush();

    expect(fetch).toHaveBeenLastCalledWith(
      "/api/gamification/lottery/draw",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ drawType: "SINGLE", useCoinTopUp: false }),
      }),
    );
    expect(container.textContent).toContain("Fish Touch Subsidy");
    expect(container.textContent).toContain("+5 coins");
    expect(container.querySelector("[data-reward-tile='coin']")).not.toBeNull();
    expect(container.textContent).toContain("N");
  });

  it("renders grouped backpack inventory and today's effects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildSnapshot({ backpack: buildBackpackFixture() }) })),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(container.textContent).toContain("Boost");
    expect(container.textContent).toContain("Real World");
    expect(container.textContent).toContain("Small Boost Coupon");
    expect(container.textContent).toContain("Luckin Coffee Coupon");
    expect(container.querySelector("[data-reward-tile='utility']")).not.toBeNull();
    expect(container.querySelector("[data-reward-tile='rare']")).not.toBeNull();
    expect(container.querySelector("img[src='/gamification/rewards/icons/task_reroll_coupon.png']")).not.toBeNull();
    expect(container.textContent).toContain("今日效果");
    expect(container.textContent).toContain("Pending today");
    expect(container.textContent).toContain("今日使用");
  });

  it("switches backpack detail when an item is selected", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildSnapshot({ backpack: buildBackpackFixture() }) })),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(container.textContent).toContain("管理员确认：不需要");

    const luckinButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Luckin Coffee Coupon"),
    );

    expect(luckinButton).toBeDefined();

    await act(async () => {
      luckinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("管理员确认：需要");
    expect(container.textContent).toContain("Manual redemption");
  });

  it("uses an enabled backpack item and refreshes the snapshot", async () => {
    const updatedSnapshot = buildSnapshot({ backpack: buildBackpackFixture() });
    updatedSnapshot.backpack.todayEffects = [
      {
        id: "use_2",
        itemId: "small_boost_coupon",
        name: "Small Boost Coupon",
        status: "PENDING",
        statusLabel: "Pending today",
        effectSummary: "Personal fitness income 1.5x today.",
        createdAt: "2026-04-26T01:00:00.000Z",
        settledAt: null,
      },
    ];

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot({ backpack: buildBackpackFixture() }) }))
        .mockResolvedValueOnce(
          createJsonResponse({
            snapshot: updatedSnapshot,
            itemUse: {
              id: "use_2",
              itemId: "small_boost_coupon",
              status: "PENDING",
              targetType: null,
              targetId: null,
              inventoryConsumed: false,
              message: "Boost is pending for today.",
            },
          }),
        ),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    const useButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("今日使用"),
    );

    expect(useButton).toBeDefined();

    await act(async () => {
      useButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenCalledWith(
      "/api/gamification/items/use",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ itemId: "small_boost_coupon" }),
      }),
    );
    expect(container.textContent).toContain("Boost is pending for today.");
  });

  it("renders redemption status and admin queue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          snapshot: buildSnapshot({
            currentUserRole: "ADMIN",
            redemptions: {
              mine: [requestedRedemption],
              adminQueue: [
                {
                  ...requestedRedemption,
                  id: "redemption-2",
                  userId: "u2",
                  username: "liu",
                  requestedAt: "2026-04-26T01:30:00.000Z",
                },
              ],
            },
          }),
        }),
      ),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(container.textContent).toContain("我的兑换");
    expect(container.textContent).toContain("Luckin Coffee Coupon");
    expect(container.textContent).toContain("待管理员确认");
    expect(container.textContent).toContain("待处理兑换");
    expect(container.textContent).toContain("liu");
  });

  it("requests redemption from a real-world backpack item", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          createJsonResponse({ snapshot: buildSnapshot({ backpack: buildBackpackFixture() }) }),
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            redemption: {
              ...requestedRedemption,
              id: "redemption-new",
              requestedAt: "2026-04-26T02:00:00.000Z",
            },
            inventory: { itemId: "luckin_coffee_coupon", quantity: 1 },
          }),
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            snapshot: buildSnapshot({
              backpack: buildBackpackFixture(),
              redemptions: { mine: [requestedRedemption], adminQueue: [] },
            }),
          }),
        ),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    const luckinButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Luckin Coffee Coupon"),
    );

    await act(async () => {
      luckinButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const requestButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("申请兑换"),
    );
    expect(requestButton).toBeDefined();

    await act(async () => {
      requestButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenCalledWith(
      "/api/gamification/redemptions/request",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ itemId: "luckin_coffee_coupon" }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/gamification/state",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
    expect(container.textContent).toContain("我的兑换");
  });

  it("renders active social invitations and responds to one", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          createJsonResponse({ snapshot: buildSnapshot({ social: buildSocialFixture() }) }),
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            response: {
              id: "response-new",
              invitationId: "social-received-1",
              responderUserId: "u1",
            },
            snapshot: buildSnapshot({ social: buildSocialFixture() }),
          }),
        ),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(container.textContent).toContain("walk invite message");
    expect(container.textContent).toContain("standup invite message");
    expect(container.textContent).toContain("drink invite message");
    expect(container.textContent).toContain("已起立");

    const respondButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("响应"),
    );
    expect(respondButton).toBeDefined();

    await act(async () => {
      respondButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenCalledWith(
      "/api/gamification/social/respond",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ invitationId: "social-received-1" }),
      }),
    );
  });
});
