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

async function flushAsyncState() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });
}

function createFile(name: string, content: string, type = "image/png") {
  return new File([content], name, { type });
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
}

function buildAiSnapshot(
  overrides: Partial<SupplyStationProductionSnapshot> = {},
): SupplyStationProductionSnapshot {
  const baseSnapshot: SupplyStationProductionSnapshot = {
    currentUserId: "u1",
    currentUserRole: "MEMBER",
    teamId: "team-1",
    dayKey: "2026-07-06",
    resources: {
      coins: { label: "银子", value: 800 },
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
    dashboard: { todayEffects: [], dailyQuests: [] },
    drawPool: {
      wallet: {
        ticketBalance: 3,
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
      dates: [{ key: "2026-07-06", label: "今天", dateLabel: "07/06", weekday: "周一" }],
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
      wallet: { coins: 800, generationCostPerImage: 60, themeDrawCost: 200 },
      themes: {
        unlocked: [
          {
            id: "theme-01",
            name: "牛马像素馆",
            description: "像素风",
            previewImageUrl: "https://example.com/theme.png",
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
            description: "霓虹",
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
          userPrompt: "训练后的海报",
          requestedCount: 2,
          status: "failed",
          coinCost: 120,
          refundedCoinAmount: 0,
          errorMessage: "有图片失败",
          retryAvailable: true,
          createdAt: "2026-07-06T08:00:00.000Z",
          updatedAt: "2026-07-06T08:10:00.000Z",
          items: [
            {
              id: "item-1",
              index: 0,
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
          taskId: "task-0",
          itemId: "item-0",
          themeId: "theme-01",
          imageUrl: "https://example.com/art-1.png",
          createdAt: "2026-07-06T07:00:00.000Z",
        },
      ],
    },
    legacyArchive: {
      ticketBalance: 5,
      inventoryQuantity: 2,
      redemptionCount: 1,
      latestTaskRecordCount: 3,
    },
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

describe("SupplyStationShell AI image flows", () => {
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

  it("loads AI image supply state and creates a generation task", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ taskId: "task-2" }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() })),
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
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("生图任务已创建");
  });

  it("keeps studio inputs after a failed create request from the real shell", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ error: "创建失败" }, false, 500)),
    );

    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea");

    expect(input).not.toBeNull();
    expect(textarea).not.toBeNull();

    await act(async () => {
      Object.defineProperty(input!, "files", {
        configurable: true,
        value: [createFile("keep.png", "keep")],
      });
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushAsyncState();

    await act(async () => {
      textarea!.value = "失败后别清空";
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/gamification/ai-image/tasks",
      expect.objectContaining({ method: "POST" }),
    );
    expect(textarea?.value).toBe("失败后别清空");
    expect(container.textContent).toContain("keep.png");
    expect(container.textContent).toContain("创建失败");
  });

  it("retries a failed task item and draws a new theme from the shell panels", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ taskId: "task-1" }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() }))
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
            snapshot: buildAiSnapshot({
              supplyAiImage: {
                ...buildAiSnapshot().supplyAiImage,
                themes: {
                  ...buildAiSnapshot().supplyAiImage.themes,
                  unlocked: [
                    ...buildAiSnapshot().supplyAiImage.themes.unlocked,
                    {
                      id: "theme-02",
                      name: "深夜健身房",
                      description: "霓虹",
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
      root.render(<SupplyStationShell />);
    });
    await flush();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='retry-ai-image-task']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-panel='themeGacha']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='draw-ai-image-theme']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/gamification/ai-image/tasks/task-1/retry",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      4,
      "/api/gamification/ai-image/themes/draw",
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.textContent).toContain("新主题已解锁");
  });

  it("disables theme draw while the request is in flight and prevents double submit", async () => {
    const drawRequest = createDeferred<Response>();

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() }))
        .mockImplementationOnce(() => drawRequest.promise)
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() })),
    );

    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell initialPanel="themeGacha" />);
    });
    await flush();

    const drawButton = container.querySelector<HTMLButtonElement>("[data-action='draw-ai-image-theme']");
    expect(drawButton).not.toBeNull();
    expect(drawButton?.disabled).toBe(false);

    await act(async () => {
      drawButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(drawButton?.disabled).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      drawButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetch).toHaveBeenCalledTimes(2);

    await act(async () => {
      drawRequest.resolve(
        createJsonResponse({
          theme: {
            id: "theme-02",
            name: "深夜健身房",
          },
        }),
      );
      await drawRequest.promise;
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/gamification/ai-image/themes/draw",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
