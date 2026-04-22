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
    { id: "user-1", name: "Li", avatarKey: "male1" },
    { id: "user-2", name: "Luo", avatarKey: "male2" },
  ],
  gridData: [[false, null], [false, null]],
  teamCoins: 0,
  targetCoins: 100,
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
    teamCoins: 0,
    targetCoins: 100,
    today: 1,
    totalDays: 2,
    currentUserId: "user-1",
    ...overrides,
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

    const confirmButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("确认打卡"));
    expect(confirmButton).toBeDefined();

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
            teamCoins: 15,
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

    const confirmButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("确认打卡"),
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
});
