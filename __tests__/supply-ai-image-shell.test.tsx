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

async function expandComposer(container: HTMLElement) {
  await act(async () => {
    container
      .querySelector<HTMLButtonElement>("[data-testid='supply-composer-collapsed-input']")
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function createFile(name: string, content: string, type = "image/png") {
  return new File([content], name, { type });
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
      wallet: { coins: 800, generationCostPerImage: 10, themeDrawCost: 200 },
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
          {
            id: "theme-02",
            name: "深夜健身房",
            description: "霓虹",
            previewImageUrl: "https://example.com/theme-2.png",
            defaultUnlocked: true,
            unlocked: true,
            enabled: true,
            sortOrder: 2,
            tag: "霓虹",
            palette: ["#1d4ed8"],
          },
        ],
        locked: [],
        allUnlocked: true,
      },
      recentTasks: [
        {
          id: "task-1",
          themeId: "theme-01",
          userPrompt: "训练后的海报",
          requestedCount: 2,
          status: "failed",
          coinCost: 20,
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

  it("does not show old ticket, shop, task, or redemption primary actions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildAiSnapshot() })));

    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    expect(container.textContent).not.toContain("抽奖券");
    expect(container.textContent).not.toContain("领取抽奖券");
    expect(container.textContent).not.toContain("逛商店");
    expect(container.textContent).not.toContain("实体兑换");
    expect(container.textContent).not.toContain("今日主线");
    expect(container.textContent).not.toContain("任务记录");
    expect(container.querySelector("[data-action='claim-ticket']")).toBeNull();
    expect(container.querySelector("[data-action='purchase-shop-item']")).toBeNull();
    expect(container.querySelector("[data-action='complete-task']")).toBeNull();
    expect(container.querySelector("[data-action='reroll-task']")).toBeNull();
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

    await expandComposer(container);

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

    await expandComposer(container);

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

  it("clears studio inputs after create succeeds even if refresh fails, then shows a safe stale warning", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ taskId: "task-2" }))
        .mockResolvedValueOnce(
          createJsonResponse({ error: "provider timeout gpt-image-2 debug trace" }, false, 500),
        ),
    );

    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    await expandComposer(container);

    const input = container.querySelector<HTMLInputElement>("input[type='file']");
    const textarea = container.querySelector<HTMLTextAreaElement>("textarea");

    expect(input).not.toBeNull();
    expect(textarea).not.toBeNull();

    await act(async () => {
      Object.defineProperty(input!, "files", {
        configurable: true,
        value: [createFile("clear.png", "clear")],
      });
      input?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await flushAsyncState();

    await act(async () => {
      textarea!.value = "提交成功后应清空";
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
    expect(container.textContent).not.toContain("clear.png");
    expect(container.querySelector("[data-testid='supply-expanded-creation-panel']")).toBeNull();
    expect(container.querySelector("[data-testid='supply-composer-collapsed-input']")).not.toBeNull();
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.textContent).toContain("生图任务已创建");
    expect(container.textContent).toContain("补给站还没刷新出来");
    expect(container.textContent).not.toContain("provider timeout gpt-image-2 debug trace");
    expect(container.textContent).not.toContain("gpt-image-2");
  });

  it("retries a failed task item and keeps theme draw out of the phase 1 workspace", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ taskId: "task-1" }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() })),
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
      expect.objectContaining({ method: "POST" }),
    );
    expect(container.querySelector("[data-panel='themeGacha']")).toBeNull();
    expect(container.querySelector("[data-action='draw-ai-image-theme']")).toBeNull();
    expect(container.textContent).not.toContain("主题扭蛋");
  });

  it("opens the AI asset backpack from the studio and returns to creation", async () => {
    const onPanelChange = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createJsonResponse({ snapshot: buildAiSnapshot() })));

    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell onPanelChange={onPanelChange} />);
    });
    await flush();

    expect(container.querySelector(".supply-ai-image-studio-panel")).not.toBeNull();
    expect(container.querySelector(".supply-artwork-backpack-panel")).toBeNull();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='open-ai-image-assets']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(onPanelChange).toHaveBeenCalledWith("artworks");
    expect(container.querySelector(".supply-ai-image-studio-panel")).toBeNull();
    expect(container.querySelector(".supply-artwork-backpack-panel")).not.toBeNull();
    expect(container.textContent).toContain("我的资产背包");
    expect(container.textContent).toContain("牛马像素馆");

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>("[data-action='back-to-ai-image-studio']")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(onPanelChange).toHaveBeenCalledWith("studio");
    expect(container.querySelector(".supply-ai-image-studio-panel")).not.toBeNull();
    expect(container.querySelector(".supply-artwork-backpack-panel")).toBeNull();
  });

  it("disables mutation buttons while snapshot is stale after a committed mutation refresh failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() }))
        .mockResolvedValueOnce(createJsonResponse({ taskId: "task-2" }))
        .mockResolvedValueOnce(createJsonResponse({ error: "stale backend trace" }, false, 500))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildAiSnapshot() })),
    );

    const { SupplyStationShell } = await import("@/components/gamification/production/SupplyStationShell");

    await act(async () => {
      root.render(<SupplyStationShell />);
    });
    await flush();

    await expandComposer(container);

    const createButton = container.querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']");
    expect(createButton?.disabled).toBe(false);

    await act(async () => {
      createButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    await expandComposer(container);

    expect(container.querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")?.disabled).toBe(true);
    expect(container.textContent).toContain("补给站还没刷新出来");
    expect(container.textContent).not.toContain("stale backend trace");

    expect(
      container.querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")?.disabled,
    ).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>("[data-action='retry-ai-image-task']")?.disabled,
    ).toBe(true);

    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("刷新"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector<HTMLButtonElement>("[data-action='create-ai-image-task']")?.disabled).toBe(false);
  });
});
