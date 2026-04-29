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

function buildSnapshot(
  overrides: Partial<GamificationStateSnapshot> = {},
): GamificationStateSnapshot {
  return {
    currentUserId: "u1",
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
      dailyTopUpLimit: 3,
      ticketPrice: 40,
      message: "Need 2 more tickets, can top up for 80 coins.",
      recentDraws: [],
    },
    backpack: {
      totalQuantity: 0,
      previewItems: [],
      emptyMessage: "Backpack empty",
    },
    social: {
      status: "placeholder",
      pendingSentCount: 0,
      pendingReceivedCount: 0,
      message: "Social tools open later",
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
  });
});
