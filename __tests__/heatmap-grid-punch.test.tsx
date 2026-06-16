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
  monthKey: "2026-04",
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

function pageText() {
  return document.body.textContent ?? "";
}

function pageButtons() {
  return Array.from(document.body.querySelectorAll("button"));
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

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
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
  let originalClientWidthDescriptor: PropertyDescriptor | undefined;
  let clientWidthDescriptorPatched = false;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    if (clientWidthDescriptorPatched) {
      if (originalClientWidthDescriptor) {
        Object.defineProperty(HTMLElement.prototype, "clientWidth", originalClientWidthDescriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
      }
      originalClientWidthDescriptor = undefined;
      clientWidthDescriptorPatched = false;
    }
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
    expect(container.querySelector(".heatmap-training-panel")).not.toBeNull();
    expect(container.querySelector(".heatmap-members-column")).not.toBeNull();
    expect(container.querySelector(".heatmap-member-rail")).not.toBeNull();
    expect(container.querySelector(".heatmap-day-ruler")).not.toBeNull();
    expect(container.querySelector(".heatmap-grid-track")).not.toBeNull();
    expect(container.querySelectorAll(".heatmap-desktop-shell .heatmap-day-today")).toHaveLength(1);
    expect(container.querySelectorAll(".heatmap-desktop-shell .heatmap-cell-today")).toHaveLength(5);
    expect(container.querySelectorAll(".heatmap-member-item")).toHaveLength(5);
    expect(container.querySelectorAll(".heatmap-member-avatar")).toHaveLength(5);
    expect(container.querySelectorAll(".heatmap-grid-row")).toHaveLength(5);
    expect(container.querySelector(".heatmap-mobile-scroll")).not.toBeNull();
    expect(container.querySelectorAll(".heatmap-mobile-row")).toHaveLength(5);
    expect(container.querySelectorAll(".heatmap-mobile-member")).toHaveLength(5);
  });

  it("sizes the desktop heatmap from the rendered member count", async () => {
    const sevenMemberState = createMembersState(7);

    await act(async () => {
      root.render(
        <BoardProvider initialState={sevenMemberState}>
          <HeatmapGrid />
        </BoardProvider>,
      );
    });

    const desktopShell = container.querySelector<HTMLElement>(".heatmap-desktop-shell");

    expect(desktopShell?.style.getPropertyValue("--heatmap-desktop-body-height")).toBe("26.25rem");
  });

  it("centers today's mobile column using the rendered date column", async () => {
    originalClientWidthDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "clientWidth",
    );
    clientWidthDescriptorPatched = true;
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

    expect(pageText()).toContain("今日训练小票");
    expect(pageText()).toContain("今日重点部位");
    expect(pageText()).toContain("单车");
    expect(document.body.querySelectorAll("[data-strength-part-icon]")).toHaveLength(6);
    expect(document.body.querySelector('img[alt="今日训练部位肌肉图"]')).toBeNull();

    const confirmButton = pageButtons().find((button) =>
      button.textContent?.includes("确认打卡"),
    );
    expect(confirmButton).toBeDefined();
    expect(pageText()).toContain("获得 1 张健身券");

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const stateBeforeResponse = readState(container);

    expect(fetch).toHaveBeenCalledWith(
      "/api/board/punch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          trainingType: "cardio",
          cardioItem: "treadmill",
          strengthParts: [],
          durationMinutes: 60,
        }),
      }),
    );
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

    const confirmButton = pageButtons().find((button) =>
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
    expect(pageText()).toContain("今天已经打过卡了");
    expect(pageText()).toContain("今日训练小票");
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

    expect(pageText()).toContain("今日训练小票");
    expect(pageText()).toContain("保存后只更新今天的训练明细，不重复发健身券。");
    expect(pageText()).toContain("撤销打卡");

    const undoButton = pageButtons().find((button) =>
      button.textContent?.includes("撤销打卡"),
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

    const undoButton = pageButtons().find((button) =>
      button.textContent?.includes("撤销打卡"),
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
    expect(pageText()).toContain("今天打卡送出的健身券已经花掉了，不能撤销打卡。");
  });

  it("opens today's punched current-user cell as an editable workout ticket", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        snapshot: {
          ...createSnapshot({
            gridData: [[true, null], [false, null]],
            currentUserTodayWorkout: {
              trainingType: "both",
              cardioItem: "treadmill",
              strengthParts: ["chest"],
              durationMinutes: 60,
            },
          }),
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const punchedState: BoardState = {
      ...initialState,
      gridData: [[true, null], [false, null]],
      currentUserTodayWorkout: {
        trainingType: "both",
        cardioItem: "treadmill",
        strengthParts: ["chest"],
        durationMinutes: 60,
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

    const punchedButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.trim() === "✓");

    await act(async () => {
      punchedButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("今日训练小票");
    expect(document.body.textContent).toContain("保存修改");
    expect(document.body.textContent).toContain("撤销打卡");
    expect(document.body.textContent).toContain("胸部");

    const absButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.trim() === "腹部");
    const saveButton = Array.from(document.body.querySelectorAll("button")).find((button) => button.textContent?.includes("保存修改"));

    await act(async () => {
      absButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      saveButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/board/punch", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({
        trainingType: "both",
        cardioItem: "treadmill",
        strengthParts: ["chest", "abs"],
        durationMinutes: 60,
      }),
    }));
  });

  it("shows a makeup entry on the current user's missed yesterday cell", async () => {
    const makeupState: BoardState = {
      ...initialState,
      today: 2,
      totalDays: 3,
      gridData: [[false, false, null], [false, false, null]],
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={makeupState}>
          <HeatmapGrid />
        </BoardProvider>,
      );
    });

    const makeupButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "补",
    );

    expect(makeupButtons).toHaveLength(2);
  });

  it("does not show makeup entry when the current user's yesterday cell is already punched", async () => {
    const makeupState: BoardState = {
      ...initialState,
      today: 2,
      totalDays: 3,
      gridData: [[true, false, null], [false, false, null]],
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={makeupState}>
          <HeatmapGrid />
        </BoardProvider>,
      );
    });

    expect(container.textContent).not.toContain("补");
  });

  it("waits for the server snapshot before applying yesterday makeup", async () => {
    const request = deferred<{
      ok: boolean;
      json: () => Promise<{ snapshot: BoardSnapshot }>;
    }>();
    const fetchMock = vi.fn().mockReturnValue(request.promise);
    vi.stubGlobal("fetch", fetchMock);

    const makeupState: BoardState = {
      ...initialState,
      today: 2,
      totalDays: 3,
      gridData: [[false, false, null], [false, false, null]],
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={makeupState}>
          <HeatmapGrid />
          <Probe />
        </BoardProvider>,
      );
    });

    const makeupButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "补",
    );
    expect(makeupButton).toBeDefined();

    await act(async () => {
      makeupButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText()).toContain("补昨天打卡");

    const confirmButton = pageButtons().find((button) =>
      button.textContent?.includes("确认补签"),
    );
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/board/punch/makeup-yesterday",
      expect.objectContaining({ method: "POST" }),
    );
    expect(readState(container).gridData[0][0]).toBe(false);

    await act(async () => {
      request.resolve({
        ok: true,
        json: async () => ({
          snapshot: createSnapshot({
            gridData: [[true, false, null], [false, false, null]],
            today: 2,
            totalDays: 3,
            teamVaultTotal: 10,
            currentUser: {
              assetBalance: 10,
              currentStreak: 1,
              nextReward: 20,
              seasonIncome: 10,
              isAdmin: false,
            },
          }),
        }),
      });
      await request.promise;
      await flushPromises();
    });

    const stateAfterResponse = readState(container);

    expect(stateAfterResponse.gridData[0][0]).toBe(true);
    expect(stateAfterResponse.logs).toHaveLength(1);
    expect(stateAfterResponse.logs[0].type).toBe("success");
    expect(stateAfterResponse.logs[0].text).toContain("补签");
  });

  it("keeps the makeup popup open and displays the backend error when yesterday makeup is rejected", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "昨天补签窗口已关闭" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const makeupState: BoardState = {
      ...initialState,
      today: 2,
      totalDays: 3,
      gridData: [[false, false, null], [false, false, null]],
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={makeupState}>
          <HeatmapGrid />
          <Probe />
        </BoardProvider>,
      );
    });

    const makeupButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "补",
    );
    expect(makeupButton).toBeDefined();

    await act(async () => {
      makeupButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText()).toContain("补昨天打卡");

    const confirmButton = pageButtons().find((button) =>
      button.textContent?.includes("确认补签"),
    );
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushPromises();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/board/punch/makeup-yesterday",
      expect.objectContaining({ method: "POST" }),
    );
    expect(readState(container).gridData[0][0]).toBe(false);
    expect(pageText()).toContain("补昨天打卡");
    expect(pageText()).toContain("昨天补签窗口已关闭");
  });

  it("lets admins make up any member's missed past cell from the heatmap", async () => {
    const request = deferred<{
      ok: boolean;
      json: () => Promise<{ snapshot: BoardSnapshot }>;
    }>();
    const fetchMock = vi.fn().mockReturnValue(request.promise);
    vi.stubGlobal("fetch", fetchMock);

    const adminState: BoardState = {
      ...initialState,
      today: 3,
      totalDays: 4,
      monthKey: "2026-04",
      gridData: [[true, false, false, null], [false, false, false, null]],
      currentUser: {
        ...initialState.currentUser!,
        isAdmin: true,
      },
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={adminState}>
          <HeatmapGrid />
          <Probe />
        </BoardProvider>,
      );
    });

    const adminMakeupButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "补",
    );

    expect(adminMakeupButtons.length).toBeGreaterThan(1);

    await act(async () => {
      adminMakeupButtons.at(-1)!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(pageText()).toContain("管理员补卡");
    expect(pageText()).toContain("给 Luo 补 2026-04-02 的健身打卡吗？");

    const confirmButton = pageButtons().find((button) =>
      button.textContent?.includes("确认补卡"),
    );
    expect(confirmButton).toBeDefined();

    await act(async () => {
      confirmButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/board/makeup-punch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ targetUserId: "user-2", dayKey: "2026-04-02" }),
      }),
    );
    expect(readState(container).gridData[1][1]).toBe(false);

    await act(async () => {
      request.resolve({
        ok: true,
        json: async () => ({
          snapshot: createSnapshot({
            monthKey: "2026-04",
            today: 3,
            totalDays: 4,
            gridData: [[true, false, false, null], [false, true, false, null]],
            currentUser: {
              ...initialState.currentUser!,
              isAdmin: true,
            },
          }),
        }),
      });
      await request.promise;
      await flushPromises();
    });

    const stateAfterResponse = readState(container);

    expect(stateAfterResponse.gridData[1][1]).toBe(true);
    expect(stateAfterResponse.logs[0].text).toContain("已给 <b>Luo</b> 补 2026-04-02");
  });

  it("does not expose global makeup buttons to regular members", async () => {
    const memberState: BoardState = {
      ...initialState,
      today: 3,
      totalDays: 4,
      monthKey: "2026-04",
      gridData: [[true, false, false, null], [false, false, false, null]],
      currentUser: {
        ...initialState.currentUser!,
        isAdmin: false,
      },
    };

    await act(async () => {
      root.render(
        <BoardProvider initialState={memberState}>
          <HeatmapGrid />
        </BoardProvider>,
      );
    });

    const makeupButtons = Array.from(container.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "补",
    );

    expect(makeupButtons).toHaveLength(2);
    expect(container.textContent).not.toContain("管理员补卡");
  });
});
