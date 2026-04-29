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
    title: `${dimensionKey} 任务`,
    description: `${dimensionKey} 今日补给`,
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

function buildSnapshotWithTasks(
  overrides: Partial<GamificationStateSnapshot["ticketSummary"]> = {},
): GamificationStateSnapshot {
  return {
    currentUserId: "u1",
    teamId: "team-1",
    dayKey: "2026-04-29",
    ticketBalance: 0,
    dimensions: [
      {
        key: "movement",
        title: "把电充绿",
        subtitle: "站一站，不然屁股长根",
        description: "起身、走动、拉伸、短暂恢复。",
        assignment: buildAssignment("movement", 1, {
          title: "工位重启",
          description: "离开椅子站起来 2 分钟，让身体退出省电模式。",
        }),
      },
      {
        key: "hydration",
        title: "把尿喝白",
        subtitle: "喝白白，别把自己腌入味",
        description: "补水、接水、无糖饮品。",
        assignment: buildAssignment("hydration", 1, {
          title: "首杯投币",
          description: "喝一杯水，给今天的身体系统投个启动币。",
        }),
      },
      {
        key: "social",
        title: "把事办黄",
        subtitle: "聊两句，让班味散一散",
        description: "闲聊、吐槽、夸夸、情绪释放。",
        assignment: buildAssignment("social", 1, {
          title: "废话 KPI",
          description: "和同事聊两句无关工作的废话，完成今日人类连接。",
        }),
      },
      {
        key: "learning",
        title: "把股看红",
        subtitle: "看一点，给脑子补仓",
        description: "信息输入、学习、看新闻、文章或工具。",
        assignment: buildAssignment("learning", 1, {
          title: "三分钟扫盘",
          description: "看一篇短文章、帖子或资讯，三分钟也算学习。",
        }),
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
      ...overrides,
    },
    lottery: {
      status: "placeholder",
      singleDrawEnabled: false,
      tenDrawEnabled: false,
      message: "抽奖机正在搬进办公室，GM-06 开放。",
      recentDraws: [],
    },
    backpack: {
      totalQuantity: 0,
      previewItems: [],
      emptyMessage: "背包空空，等抽奖机上线后再来进货。",
    },
    social: {
      status: "placeholder",
      pendingSentCount: 0,
      pendingReceivedCount: 0,
      message: "点名喝水、出门溜达等弱社交道具将在 GM-12 开放。",
    },
  };
}

function buildSnapshotWithCompletedMovement(): GamificationStateSnapshot {
  const snapshot = buildSnapshotWithTasks({ taskCompletedCount: 1 });
  const movement = snapshot.dimensions.find((dimension) => dimension.key === "movement");

  if (movement?.assignment) {
    movement.assignment.status = "completed";
    movement.assignment.completedAt = "2026-04-29T01:00:00.000Z";
    movement.assignment.completionText = "已复活";
    movement.assignment.canComplete = false;
    movement.assignment.canReroll = false;
  }

  return snapshot;
}

function buildSnapshotWithRerolledHydration(): GamificationStateSnapshot {
  const snapshot = buildSnapshotWithCompletedMovement();
  const hydration = snapshot.dimensions.find((dimension) => dimension.key === "hydration");

  if (hydration) {
    hydration.assignment = buildAssignment("hydration", 2, {
      title: "茶水间续命",
      description: "去接一杯水，顺便完成一次合法离岗。",
      rerollCount: 1,
      canReroll: false,
    });
  }

  return snapshot;
}

function buildSnapshotWithClaimableTicket(): GamificationStateSnapshot {
  const snapshot = buildSnapshotWithTasks({
    taskCompletedCount: 4,
    lifeTicketClaimable: true,
  });

  for (const dimension of snapshot.dimensions) {
    if (dimension.assignment) {
      dimension.assignment.status = "completed";
      dimension.assignment.completedAt = "2026-04-29T01:00:00.000Z";
      dimension.assignment.completionText = "已复活";
      dimension.assignment.canComplete = false;
      dimension.assignment.canReroll = false;
    }
  }

  return snapshot;
}

function buildSnapshotWithClaimedTicket(): GamificationStateSnapshot {
  return {
    ...buildSnapshotWithClaimableTicket(),
    ticketBalance: 1,
    ticketSummary: {
      ...buildSnapshotWithClaimableTicket().ticketSummary,
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
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshotWithTasks() }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshotWithCompletedMovement() }))
        .mockResolvedValueOnce(createJsonResponse({ snapshot: buildSnapshotWithClaimableTicket() }))
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
    expect(container.textContent).toContain("牛马补给站");
    expect(container.textContent).toContain("把电充绿");
    expect(container.textContent).toContain("把尿喝白");
    expect(container.textContent).toContain("把事办黄");
    expect(container.textContent).toContain("把股看红");
    expect(container.textContent).toContain("工位重启");
    expect(container.textContent).toContain("抽奖机正在搬进办公室");
    expect(container.textContent).toContain("背包空空");

    const completeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("我完成了"),
    );
    expect(completeButton).toBeDefined();

    await act(async () => {
      completeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/gamification/tasks/complete",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(container.textContent).toContain("已复活");

    const rerollButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("换一个") && !button.disabled,
    );
    expect(rerollButton).toBeDefined();

    await act(async () => {
      rerollButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "/api/gamification/tasks/reroll",
      expect.objectContaining({
        method: "POST",
      }),
    );

    const claimButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("领取生活券"),
    );
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
    expect(container.textContent).toContain("今日生活券已到账");
  });

  it("renders a login recovery state for 401 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createJsonResponse({ error: "未登录" }, false, 401)),
    );

    const { SupplyStation } = await import("@/components/gamification/SupplyStation");

    await act(async () => {
      root.render(<SupplyStation />);
    });
    await flush();

    expect(container.textContent).toContain("登录状态过期，请重新登录");
    expect(container.querySelector('a[href="/login"]')).not.toBeNull();
  });
});
