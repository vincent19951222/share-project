import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HeatmapGrid } from "@/components/punch-board/HeatmapGrid";
import { BoardProvider, useBoard } from "@/lib/store";
import type { BoardSnapshot, BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialState: BoardState = {
  members: [
    { id: "user-1", name: "Li", avatarKey: "male1", assetBalance: 0, seasonIncome: 0, slotContribution: 0 },
    { id: "user-2", name: "Luo", avatarKey: "male2", assetBalance: 0, seasonIncome: 0, slotContribution: 0 },
  ],
  gridData: [[false, null], [false, null]],
  teamVaultTotal: 0,
  currentUser: {
    assetBalance: 0,
    currentStreak: 0,
    nextReward: 10,
    seasonIncome: 0,
    isAdmin: false,
  },
  activeSeason: null,
  today: 1,
  totalDays: 2,
  logs: [],
  activeTab: "punch",
  currentUserId: "user-1",
};

function Probe() {
  const { state } = useBoard();
  return <div data-testid="state">{JSON.stringify(state)}</div>;
}

function readState(container: HTMLDivElement) {
  return JSON.parse(container.querySelector("[data-testid='state']")!.textContent ?? "{}");
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

function createSnapshot(overrides: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return {
    members: initialState.members,
    gridData: [[false, null], [false, null]],
    teamVaultTotal: 0,
    currentUser: initialState.currentUser,
    activeSeason: null,
    today: 1,
    totalDays: 2,
    currentUserId: "user-1",
    ...overrides,
  };
}

function createMembersState(memberCount: number): BoardState {
  const members = Array.from({ length: memberCount }, (_, index) => ({
    id: `user-${index + 1}`,
    name: `Member ${index + 1}`,
    avatarKey: index % 2 === 0 ? "male1" : "female1",
    assetBalance: 0,
    seasonIncome: 0,
    slotContribution: 0,
  }));

  return {
    ...initialState,
    members,
    gridData: members.map(() => Array.from({ length: initialState.totalDays }, () => false)),
    currentUserId: members[0]?.id ?? initialState.currentUserId,
  };
}

describe("HeatmapGrid punch flow", () => {
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

  it("renders a compact member rail structure that can hold all mobile avatars", async () => {
    const denseState = createMembersState(5);

    await act(async () => {
      root.render(
        <BoardProvider initialState={denseState}>
          <HeatmapGrid />
        </BoardProvider>,
      );
    });

    expect(container.querySelector(".heatmap-shell")).not.toBeNull();
    expect(container.querySelector(".heatmap-members-column")).not.toBeNull();
    expect(container.querySelectorAll(".heatmap-member-item")).toHaveLength(5);
    expect(container.querySelectorAll(".heatmap-member-avatar")).toHaveLength(5);
    expect(container.querySelectorAll(".heatmap-grid-row")).toHaveLength(5);
    expect(container.querySelector(".heatmap-mobile-scroll")).not.toBeNull();
    expect(container.querySelectorAll(".heatmap-mobile-row")).toHaveLength(5);
    expect(container.querySelectorAll(".heatmap-mobile-member")).toHaveLength(5);
  });

  it("centers today's mobile column using the rendered date column", async () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        if (this.classList.contains("heatmap-mobile-scroll")) return 399;
        return 0;
      },
    });
    const monthState: BoardState = {
      ...initialState,
      today: 25,
      totalDays: 30,
      gridData: initialState.members.map(() => Array.from({ length: 30 }, () => false)),
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={monthState}>
          <HeatmapGrid />
        </BoardProvider>,
      );
    });

    expect(container.querySelector('.heatmap-mobile-day[data-day="25"]')).not.toBeNull();
    expect(container.querySelector<HTMLDivElement>(".heatmap-mobile-scroll")?.scrollLeft).toBeCloseTo(
      838.9,
    );
  });

  it("waits for the server snapshot before marking the punch and adds a success log", async () => {
    const request = deferred<{
      ok: boolean;
      json: () => Promise<{
        snapshot: BoardSnapshot;
      }>;
    }>();

    vi.stubGlobal("fetch", vi.fn().mockReturnValue(request.promise));

    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <HeatmapGrid />
          <Probe />
        </BoardProvider>,
      );
    });

    const plusButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "+");
    expect(plusButton).toBeDefined();

    await act(async () => {
      plusButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirmButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认打卡"),
    );
    expect(confirmButton).toBeDefined();
    expect(container.textContent).toContain("获得 1 张健身券");

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const stateBeforeResponse = readState(container);

    expect(fetch).toHaveBeenCalledWith("/api/board/punch", expect.objectContaining({ method: "POST" }));
    expect(stateBeforeResponse.gridData[0][0]).toBe(false);
    expect(stateBeforeResponse.logs).toHaveLength(0);

    await act(async () => {
      request.resolve({
        ok: true,
        json: async () => ({
          snapshot: createSnapshot({
            gridData: [[true, null], [false, null]],
            teamVaultTotal: 15,
            currentUser: {
              assetBalance: 15,
              currentStreak: 0,
              nextReward: 10,
              seasonIncome: 0,
              isAdmin: false,
            },
          }),
        }),
      });
      await request.promise;
      await Promise.resolve();
    });

    const stateAfterResponse = readState(container);

    expect(stateAfterResponse.gridData[0][0]).toBe(true);
    expect(stateAfterResponse.logs).toHaveLength(1);
    expect(stateAfterResponse.logs[0].type).toBe("success");
    expect(stateAfterResponse.logs[0].text).toContain("健身券 +1");
    expect(stateAfterResponse.logs[0].text).toContain("服务器状态已同步");
    expect(container.textContent).toContain("✓");
  });

  it("keeps the cell unpunched and adds an alert log when submission fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("今天已经打过卡了")),
    );

    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <HeatmapGrid />
          <Probe />
        </BoardProvider>,
      );
    });

    const plusButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "+",
    );

    await act(async () => {
      plusButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const confirmButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认打卡"),
    );

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const stateAfterFailure = readState(container);

    expect(stateAfterFailure.gridData[0][0]).toBe(false);
    expect(stateAfterFailure.logs).toHaveLength(1);
    expect(stateAfterFailure.logs[0].type).toBe("alert");
    expect(stateAfterFailure.logs[0].text).toContain("今天已经打过卡了");
    expect(container.textContent).toContain("今天已经打过卡了");
    expect(container.textContent).toContain("确认打卡今天吗？");
  });

  it("waits for the server snapshot before undoing today's punch and adds a rollback log", async () => {
    const request = deferred<{
      ok: boolean;
      json: () => Promise<{
        snapshot: BoardSnapshot;
      }>;
    }>();

    vi.stubGlobal("fetch", vi.fn().mockReturnValue(request.promise));

    const punchedState: BoardState = {
      ...initialState,
      gridData: [[true, null], [false, null]],
      teamVaultTotal: 20,
      currentUser: {
        assetBalance: 20,
        currentStreak: 1,
        nextReward: 20,
        seasonIncome: 10,
        isAdmin: false,
      },
      activeSeason: {
        id: "season-1",
        monthKey: "2026-04",
        goalName: "五月掉脂挑战",
        targetSlots: 80,
        filledSlots: 1,
        contributions: [
          {
            userId: "user-1",
            name: "Li",
            avatarKey: "male1",
            colorIndex: 0,
            slotContribution: 1,
            seasonIncome: 10,
          },
        ],
      },
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={punchedState}>
          <HeatmapGrid />
          <Probe />
        </BoardProvider>,
      );
    });

    const punchedCellButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "✓",
    );
    expect(punchedCellButton).toBeDefined();

    await act(async () => {
      punchedCellButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("撤销今天打卡");
    expect(container.textContent).toContain("未使用的健身券");

    const undoButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认撤销"),
    );
    expect(undoButton).toBeDefined();

    await act(async () => {
      undoButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const stateBeforeResponse = readState(container);

    expect(fetch).toHaveBeenCalledWith("/api/board/punch", expect.objectContaining({ method: "DELETE" }));
    expect(stateBeforeResponse.gridData[0][0]).toBe(true);
    expect(stateBeforeResponse.logs).toHaveLength(0);

    await act(async () => {
      request.resolve({
        ok: true,
        json: async () => ({
          snapshot: createSnapshot({
            gridData: [[false, null], [false, null]],
            teamVaultTotal: 10,
            currentUser: {
              assetBalance: 10,
              currentStreak: 0,
              nextReward: 10,
              seasonIncome: 0,
              isAdmin: false,
            },
            activeSeason: {
              id: "season-1",
              monthKey: "2026-04",
              goalName: "五月掉脂挑战",
              targetSlots: 80,
              filledSlots: 0,
              contributions: [
                {
                  userId: "user-1",
                  name: "Li",
                  avatarKey: "male1",
                  colorIndex: 0,
                  slotContribution: 0,
                  seasonIncome: 0,
                },
              ],
            },
          }),
        }),
      });
      await request.promise;
      await Promise.resolve();
    });

    const stateAfterResponse = readState(container);

    expect(stateAfterResponse.gridData[0][0]).toBe(false);
    expect(stateAfterResponse.logs).toHaveLength(1);
    expect(stateAfterResponse.logs[0].type).toBe("highlight");
    expect(stateAfterResponse.logs[0].text).toContain("已撤销今日健身打卡");
    expect(container.textContent).toContain("+");
  });

  it("shows the spent fitness ticket error when punch undo is blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          error: "今天打卡送出的健身券已经花掉了，不能撤销打卡。",
        }),
      }),
    );

    const punchedState: BoardState = {
      ...initialState,
      gridData: [[true, null], [false, null]],
      currentUser: {
        assetBalance: 20,
        currentStreak: 1,
        nextReward: 20,
        seasonIncome: 0,
        isAdmin: false,
      },
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={punchedState}>
          <HeatmapGrid />
          <Probe />
        </BoardProvider>,
      );
    });

    const punchedCellButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "✓",
    );
    expect(punchedCellButton).toBeDefined();

    await act(async () => {
      punchedCellButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const undoButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("确认撤销"),
    );
    expect(undoButton).toBeDefined();

    await act(async () => {
      undoButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const stateAfterFailure = readState(container);

    expect(stateAfterFailure.gridData[0][0]).toBe(true);
    expect(stateAfterFailure.logs[0].type).toBe("alert");
    expect(stateAfterFailure.logs[0].text).toContain("健身券已经花掉了");
    expect(container.textContent).toContain("今天打卡送出的健身券已经花掉了，不能撤销打卡。");
  });
});
