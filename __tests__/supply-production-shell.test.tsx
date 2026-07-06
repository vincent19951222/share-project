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

function buildSnapshot(
  overrides: Partial<SupplyStationProductionSnapshot> = {},
): SupplyStationProductionSnapshot {
  const baseSnapshot: SupplyStationProductionSnapshot = {
    currentUserId: "u1",
    currentUserRole: "MEMBER",
    teamId: "team-1",
    dayKey: "2026-05-26",
    resources: {
      coins: { label: "银子", value: 2400 },
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
      totalQuantity: 1,
      ownedItemCount: 1,
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
              name: "小加成券",
              description: "今日收益小加成",
              quantity: 1,
              reservedQuantity: 0,
              availableQuantity: 1,
              useEnabled: true,
              useDisabledReason: null,
              useTiming: "today",
              useTimingLabel: "今日",
              effectSummary: "今日收益 1.5x",
              usageLimitSummary: "每日一次",
              stackable: false,
              requiresAdminConfirmation: false,
              enabled: true,
              knownDefinition: true,
            },
          ],
        },
      ],
      todayEffects: [],
      emptyMessage: "暂无补给",
      capacity: { usedSlots: 1, totalSlots: 60 },
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
      dates: [
        {
          key: "2026-05-26",
          label: "今天",
          dateLabel: "05/26",
          weekday: "周二",
        },
      ],
      timeline: [],
    },
    social: {
      status: "active",
      pendingSentCount: 0,
      pendingReceivedCount: 1,
      teamWidePendingCount: 0,
      sent: [],
      received: [
        {
          id: "social-received-1",
          senderUserId: "u2",
          senderUsername: "luo",
          recipientUserId: "u1",
          recipientUsername: "li",
          invitationType: "WALK_AROUND",
          status: "PENDING",
          dayKey: "2026-05-26",
          message: "走两步",
          responseCount: 0,
          wechatWebhookSentAt: null,
          respondedAt: null,
          expiredAt: null,
          createdAt: "2026-05-26T02:00:00.000Z",
        },
      ],
      teamWide: [],
      recentResponses: [],
      availableRecipients: [],
      message: "ready",
    },
    redemptions: { mine: [], adminQueue: [] },
    supplyAiImage: {
      wallet: { coins: 2400, generationCostPerImage: 60, themeDrawCost: 200 },
      themes: {
        unlocked: [
          {
            id: "theme-01",
            name: "牛马像素馆",
            description: "像素风训练海报",
            previewImageUrl: "https://example.com/theme-1.png",
            defaultUnlocked: true,
            unlocked: true,
            enabled: true,
            sortOrder: 1,
            tag: "像素",
            palette: ["#fde047"],
          },
        ],
        locked: [
          {
            id: "theme-02",
            name: "深夜健身房",
            description: "霓虹训练棚",
            previewImageUrl: "https://example.com/theme-2.png",
            defaultUnlocked: false,
            unlocked: false,
            enabled: true,
            sortOrder: 2,
            tag: "霓虹",
            palette: ["#1d4ed8"],
          },
        ],
        allUnlocked: false,
      },
      recentTasks: [
        {
          id: "task-1",
          themeId: "theme-01",
          userPrompt: "训练后的像素海报",
          requestedCount: 2,
          status: "failed",
          coinCost: 120,
          refundedCoinAmount: 0,
          errorMessage: "有一张失败",
          retryAvailable: true,
          createdAt: "2026-07-06T08:00:00.000Z",
          updatedAt: "2026-07-06T08:10:00.000Z",
          items: [
            {
              id: "item-1",
              index: 0,
              status: "completed",
              imageUrl: "https://example.com/art-1.png",
              errorMessage: null,
            },
            {
              id: "item-2",
              index: 1,
              status: "failed",
              imageUrl: null,
              errorMessage: "provider timeout",
            },
          ],
        },
      ],
      recentArtworks: [
        {
          id: "art-1",
          taskId: "task-1",
          itemId: "item-1",
          themeId: "theme-01",
          imageUrl: "https://example.com/art-1.png",
          createdAt: "2026-07-06T08:05:00.000Z",
        },
      ],
    },
    legacyArchive: { ticketBalance: 0, inventoryQuantity: 0, redemptionCount: 0, latestTaskRecordCount: 0 },
  };

  return {
    ...baseSnapshot,
    ...overrides,
    resources: { ...baseSnapshot.resources, ...overrides.resources },
    profile: { ...baseSnapshot.profile, ...overrides.profile },
    dashboard: { ...baseSnapshot.dashboard, ...overrides.dashboard },
    drawPool: {
      ...baseSnapshot.drawPool,
      ...overrides.drawPool,
      wallet: { ...baseSnapshot.drawPool.wallet, ...overrides.drawPool?.wallet },
      lottery: { ...baseSnapshot.drawPool.lottery, ...overrides.drawPool?.lottery },
    },
    backpack: {
      ...baseSnapshot.backpack,
      ...overrides.backpack,
      capacity: { ...baseSnapshot.backpack.capacity, ...overrides.backpack?.capacity },
    },
    shop: { ...baseSnapshot.shop, ...overrides.shop },
    taskRecord: { ...baseSnapshot.taskRecord, ...overrides.taskRecord },
    social: { ...baseSnapshot.social, ...overrides.social },
    redemptions: { ...baseSnapshot.redemptions, ...overrides.redemptions },
    supplyAiImage: {
      ...baseSnapshot.supplyAiImage,
      ...overrides.supplyAiImage,
      wallet: { ...baseSnapshot.supplyAiImage.wallet, ...overrides.supplyAiImage?.wallet },
      themes: { ...baseSnapshot.supplyAiImage.themes, ...overrides.supplyAiImage?.themes },
    },
    legacyArchive: { ...baseSnapshot.legacyArchive, ...overrides.legacyArchive },
  };
}

describe("SupplyStationShell", () => {
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
    vi.useRealTimers();
  });

  it("loads the production supply state on mount", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildSnapshot() })));
    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/gamification/supply/state",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );
    expect(container.querySelector(".supply-ai-image-shell")).not.toBeNull();
    expect(container.querySelector(".supply-ai-image-studio-panel")).not.toBeNull();
    expect(container.querySelector("[data-panel='studio'][data-state='active']")).not.toBeNull();
    expect(container.textContent).toContain("牛马像素馆");
    expect(container.textContent).toContain("生成");
  });

  it("creates an AI image task and refreshes the production snapshot", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ taskId: "task-2" }))
        .mockResolvedValueOnce(
          createJsonResponse({
            snapshot: buildSnapshot({
              supplyAiImage: {
                ...buildSnapshot().supplyAiImage,
                recentTasks: [
                  {
                    id: "task-2",
                    themeId: "theme-01",
                    userPrompt: "",
                    requestedCount: 1,
                    status: "queued",
                    coinCost: 60,
                    refundedCoinAmount: 0,
                    errorMessage: null,
                    retryAvailable: false,
                    createdAt: "2026-07-06T08:00:00.000Z",
                    updatedAt: "2026-07-06T08:00:00.000Z",
                    items: [],
                  },
                ],
              },
            }),
          }),
        ),
    );
    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/gamification/ai-image/tasks",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "/api/gamification/supply/state",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );
    expect(container.textContent).toContain("生图任务已创建");
  });

  it("retries a failed AI image task and refreshes the production snapshot", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ taskId: "task-1" }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot() })),
    );
    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='retry-ai-image-task']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/gamification/ai-image/tasks/task-1/retry",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(container.textContent).toContain("已重新提交失败图片");
  });

  it("draws an AI image theme and refreshes the production snapshot", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot() }))
        .mockResolvedValueOnce(
          createJsonResponse({
            theme: {
              id: "theme-02",
              name: "深夜健身房",
            },
          }),
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            snapshot: buildSnapshot({
              supplyAiImage: {
                ...buildSnapshot().supplyAiImage,
                themes: {
                  unlocked: [
                    ...buildSnapshot().supplyAiImage.themes.unlocked,
                    {
                      id: "theme-02",
                      name: "深夜健身房",
                      description: "霓虹训练棚",
                      previewImageUrl: "https://example.com/theme-2.png",
                      defaultUnlocked: false,
                      unlocked: true,
                      enabled: true,
                      sortOrder: 2,
                      tag: "霓虹",
                      palette: ["#1d4ed8"],
                    },
                  ],
                  locked: [],
                  allUnlocked: false,
                },
              },
            }),
          }),
        ),
    );
    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell initialPanel="themeGacha" />);
    });
    await flush();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='draw-ai-image-theme']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/gamification/ai-image/themes/draw",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "/api/gamification/supply/state",
      expect.objectContaining({ cache: "no-store", credentials: "same-origin" }),
    );
    expect(container.textContent).toContain("新主题已解锁");
  });

  it("updates the shared nav asset cache after a supply mutation refreshes state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ taskId: "task-2" }))
        .mockResolvedValueOnce(
          createJsonResponse({
            snapshot: buildSnapshot({
              resources: {
                coins: { label: "银子", value: 2250 },
              },
            }),
          }),
        ),
    );
    const { getCachedSupplyNavContext } = await import("@/lib/supply-nav-cache");
    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(getCachedSupplyNavContext()?.resources).toEqual(
      [expect.objectContaining({ id: "coins", value: 2250 })],
    );
  });

  it("refreshes visible supply state in the background for received social invitations", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    const emptySocial = {
      status: "active" as const,
      pendingSentCount: 0,
      pendingReceivedCount: 0,
      teamWidePendingCount: 0,
      sent: [],
      received: [],
      teamWide: [],
      recentResponses: [],
      availableRecipients: [],
      message: "ready",
    };
    const nextSocial = buildSnapshot().social;

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot({ social: emptySocial }) }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshot({ social: nextSocial }) })),
    );
    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(container.textContent).not.toContain("队友邀请待响应");

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    await flush();

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("牛马像素馆");
  });

  it("keeps the legacy SupplyStation export on the production shell", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildSnapshot() })));
    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(container.querySelector(".supply-ai-image-shell")).not.toBeNull();
    expect(container.querySelector(".supply-ai-image-studio-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-scene")).toBeNull();
    expect(container.textContent).not.toContain("Playground");
    expect(container.textContent).not.toContain("promptTemplate");
  });

  it("renders a login recovery state for 401 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ error: "unauthenticated" }, false, 401)),
    );
    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    expect(container.textContent).toContain("登录状态已过期");
    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  });
});
