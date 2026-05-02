import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GamificationConfigObservatory } from "@/components/admin/GamificationConfigObservatory";
import type { GamificationConfigObservatorySnapshot } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildSnapshot(
  overrides: Partial<GamificationConfigObservatorySnapshot> = {},
): GamificationConfigObservatorySnapshot {
  return {
    generatedAt: "2026-05-02T04:00:00.000Z",
    validation: {
      ok: true,
      summary: "当前游戏化配置校验通过。",
      checks: [
        {
          key: "active_reward_total_weight",
          label: "Active 奖池总权重",
          status: "pass",
          detail: "当前 100，期望 100。",
        },
      ],
    },
    dimensionPools: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "动一动",
        enabledCardCount: 5,
        disabledCardCount: 0,
        totalEnabledWeight: 5,
        scenes: [{ key: "general", label: "general", count: 4 }],
        efforts: [{ key: "light", label: "light", count: 5 }],
        topTags: [{ key: "stand", label: "stand", count: 1 }],
        sampleCards: [
          {
            id: "movement_001",
            title: "工位重启",
            description: "离开椅子站起来 2 分钟。",
            weight: 1,
            effort: "light",
            scene: "general",
            tags: ["stand"],
            enabled: true,
          },
        ],
      },
    ],
    rewardPool: {
      activeTotalWeight: 100,
      expectedActiveTotalWeight: 100,
      directCoinExpectedValue: 8.75,
      tierWeights: [{ tier: "coin", weight: 45, expectedWeight: 45, status: "pass" }],
      activeRewards: [
        {
          id: "coins_005",
          tier: "coin",
          kind: "coins",
          rarity: "common",
          name: "摸鱼津贴",
          description: "获得 5 银子。",
          weight: 15,
          probability: 0.15,
          probabilityLabel: "15%",
          effectSummary: "获得 5 银子",
          enabled: true,
        },
      ],
      disabledRewards: [
        {
          id: "reward_today_title",
          tier: "cosmetic",
          kind: "title",
          rarity: "common",
          name: "今日称号",
          description: "获得一个当天展示称号。",
          weight: 6,
          probability: 0,
          probabilityLabel: "0%",
          effectSummary: "获得称号 legal_slacker",
          enabled: false,
        },
      ],
    },
    itemCatalog: {
      availabilityCounts: {
        active_reward_pool: 1,
        eligible_but_not_in_pool: 1,
        unsupported_effect: 1,
        disabled_item: 0,
      },
      categories: [
        {
          category: "task",
          enabledCount: 1,
          disabledCount: 0,
          items: [
            {
              id: "task_reroll_coupon",
              category: "task",
              name: "任务换班券",
              description: "把当天一个四维任务换成同维度另一张卡。",
              useTiming: "instant",
              effectSummary: "同维度重抽一个四维任务",
              stackable: true,
              limitSummary: "每人每天 1",
              requiresAdminConfirmation: false,
              enabled: true,
              rewardPoolAvailability: "active_reward_pool",
              rewardPoolAvailabilityLabel: "已进入奖池",
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

describe("GamificationConfigObservatory", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it("renders validation, dimensions, rewards, and items", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await act(async () => {
      root.render(<GamificationConfigObservatory initialSnapshot={buildSnapshot()} />);
    });

    expect(container.textContent).toContain("配置总览");
    expect(container.textContent).toContain("当前游戏化配置校验通过。");
    expect(container.textContent).toContain("四维任务卡池");
    expect(container.textContent).toContain("把电充绿");
    expect(container.textContent).toContain("工位重启");
    expect(container.textContent).toContain("抽奖奖池");
    expect(container.textContent).toContain("摸鱼津贴");
    expect(container.textContent).toContain("今日称号");
    expect(container.textContent).toContain("道具配置");
    expect(container.textContent).toContain("任务换班券");
  });

  it("refreshes the snapshot from the admin API", async () => {
    const nextSnapshot = buildSnapshot({
      validation: {
        ok: false,
        summary: "当前游戏化配置存在风险，请先处理失败项。",
        checks: [
          {
            key: "active_reward_total_weight",
            label: "Active 奖池总权重",
            status: "fail",
            detail: "当前 90，期望 100。",
          },
        ],
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ snapshot: nextSnapshot })),
    );

    await act(async () => {
      root.render(<GamificationConfigObservatory initialSnapshot={buildSnapshot()} />);
    });

    const refreshButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("刷新配置"),
    );
    expect(refreshButton).toBeDefined();

    await act(async () => {
      refreshButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/admin/gamification/config-observatory",
      expect.objectContaining({
        cache: "no-store",
        credentials: "same-origin",
      }),
    );
    expect(container.textContent).toContain("当前游戏化配置存在风险，请先处理失败项。");
    expect(container.textContent).toContain("当前 90，期望 100。");
  });
});
