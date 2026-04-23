import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardProvider, useBoard } from "@/lib/store";
import type { BoardSnapshot, BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const initialState: BoardState = {
  members: [
    {
      id: "user-1",
      name: "Li",
      avatarKey: "male1",
      assetBalance: 0,
      seasonIncome: 0,
      slotContribution: 0,
    },
  ],
  gridData: [[false, null]],
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
  logs: [
    {
      id: "seed-log",
      text: "保留这条本地日志",
      type: "system",
      timestamp: new Date("2026-04-22T00:00:00+08:00"),
    },
  ],
  activeTab: "dash",
  currentUserId: "user-1",
};

function Probe() {
  const { state } = useBoard();
  return <div data-testid="state">{JSON.stringify(state)}</div>;
}

function createSnapshot(overrides: Partial<BoardSnapshot> = {}): BoardSnapshot {
  return {
    members: [
      {
        id: "user-1",
        name: "Li",
        avatarKey: "male1",
        assetBalance: 0,
        seasonIncome: 0,
        slotContribution: 0,
      },
    ],
    gridData: [[false, null]],
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
    currentUserId: "user-1",
    ...overrides,
  };
}

function BeginPunchSync({
  active,
  punchEpoch,
}: {
  active: boolean;
  punchEpoch: number;
}) {
  const { dispatch } = useBoard();

  useEffect(() => {
    if (!active) return;
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });
  }, [active, dispatch, punchEpoch]);

  return null;
}

function ApplyPunchSnapshot({
  active,
  snapshot,
  punchEpoch,
}: {
  active: boolean;
  snapshot: BoardSnapshot;
  punchEpoch: number;
}) {
  const { dispatch } = useBoard();

  useEffect(() => {
    if (!active) return;
    dispatch({ type: "SYNC_REMOTE_STATE", snapshot, source: "punch", punchEpoch });
  }, [active, dispatch, punchEpoch, snapshot]);

  return null;
}

function ApplyManualSnapshot({
  active,
  snapshot,
}: {
  active: boolean;
  snapshot: BoardSnapshot;
}) {
  const { dispatch } = useBoard();

  useEffect(() => {
    if (!active) return;
    dispatch({ type: "APPLY_REMOTE_SNAPSHOT", snapshot });
  }, [active, dispatch, snapshot]);

  return null;
}

describe("BoardProvider sync", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          snapshot: {
            members: [
              {
                id: "user-1",
                name: "Li",
                avatarKey: "male1",
                assetBalance: 15,
                seasonIncome: 0,
                slotContribution: 0,
              },
            ],
            gridData: [[true, null]],
            teamVaultTotal: 15,
            currentUser: {
              assetBalance: 15,
              currentStreak: 0,
              nextReward: 10,
              seasonIncome: 0,
              isAdmin: false,
            },
            activeSeason: null,
            today: 1,
            totalDays: 2,
            currentUserId: "user-1",
            logs: [
              {
                id: "server-log",
                text: "不该覆盖客户端日志",
                type: "alert",
                timestamp: new Date("2026-04-23T00:00:00+08:00"),
              },
            ],
            activeTab: "punch",
          },
        }),
      }),
    );
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("polls every five seconds and keeps client-only state while replacing the snapshot", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <Probe />
        </BoardProvider>,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith("/api/board/state", { cache: "no-store" });

    const state = JSON.parse(container.querySelector("[data-testid='state']")!.textContent ?? "{}");
    expect(state.gridData[0][0]).toBe(true);
    expect(state.teamVaultTotal).toBe(15);
    expect(state.activeTab).toBe("dash");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].text).toBe("保留这条本地日志");
  });

  it("ignores a stale poll that started while a punch sync was still in flight", async () => {
    const staleResponse = {
      ok: true,
      json: async () => ({
        snapshot: {
          members: [
            {
              id: "user-1",
              name: "Li",
              avatarKey: "male1",
              assetBalance: 5,
              seasonIncome: 0,
              slotContribution: 0,
            },
          ],
          gridData: [[false, null]],
          teamVaultTotal: 5,
          currentUser: {
            assetBalance: 5,
            currentStreak: 0,
            nextReward: 10,
            seasonIncome: 0,
            isAdmin: false,
          },
          activeSeason: null,
          today: 1,
          totalDays: 2,
          currentUserId: "user-1",
        },
      }),
    };

    let resolveFetch: ((value: typeof staleResponse) => void) | undefined;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <BeginPunchSync active punchEpoch={1} />
          <ApplyPunchSnapshot
            active={false}
            punchEpoch={1}
            snapshot={createSnapshot({
              gridData: [[true, null]],
              teamVaultTotal: 15,
              currentUser: {
                assetBalance: 15,
                currentStreak: 0,
                nextReward: 10,
                seasonIncome: 0,
                isAdmin: false,
              },
            })}
          />
          <Probe />
        </BoardProvider>,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(5000);
      await Promise.resolve();
    });

    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <BeginPunchSync active punchEpoch={1} />
          <ApplyPunchSnapshot
            active
            punchEpoch={1}
            snapshot={createSnapshot({
              gridData: [[true, null]],
              teamVaultTotal: 15,
              currentUser: {
                assetBalance: 15,
                currentStreak: 0,
                nextReward: 10,
                seasonIncome: 0,
                isAdmin: false,
              },
            })}
          />
          <Probe />
        </BoardProvider>,
      );
    });

    await act(async () => {
      resolveFetch?.(staleResponse);
      await Promise.resolve();
    });

    const state = JSON.parse(
      container.querySelector("[data-testid='state']")!.textContent ?? "{}",
    );
    expect(state.gridData[0][0]).toBe(true);
    expect(state.teamVaultTotal).toBe(15);
  });

  it("ignores an older punch snapshot while a newer punch sync is pending", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <BeginPunchSync active punchEpoch={2} />
          <ApplyPunchSnapshot
            active
            punchEpoch={1}
            snapshot={createSnapshot({
              gridData: [[true, null]],
              teamVaultTotal: 15,
              currentUser: {
                assetBalance: 15,
                currentStreak: 1,
                nextReward: 20,
                seasonIncome: 0,
                isAdmin: false,
              },
            })}
          />
          <Probe />
        </BoardProvider>,
      );
    });

    const state = JSON.parse(
      container.querySelector("[data-testid='state']")!.textContent ?? "{}",
    );
    expect(state.gridData[0][0]).toBe(false);
    expect(state.teamVaultTotal).toBe(0);
    expect(state.pendingPunchEpoch).toBe(2);
  });

  it("applies a manual snapshot immediately while preserving client-only UI state", async () => {
    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <ApplyManualSnapshot
            active
            snapshot={createSnapshot({
              members: [
                {
                  id: "user-1",
                  name: "Li",
                  avatarKey: "female3",
                  assetBalance: 25,
                  seasonIncome: 0,
                  slotContribution: 0,
                },
              ],
              teamVaultTotal: 25,
              currentUser: {
                assetBalance: 25,
                currentStreak: 2,
                nextReward: 30,
                seasonIncome: 0,
                isAdmin: false,
              },
            })}
          />
          <Probe />
        </BoardProvider>,
      );
    });

    const state = JSON.parse(
      container.querySelector("[data-testid='state']")!.textContent ?? "{}",
    );
    expect(state.members[0].avatarKey).toBe("female3");
    expect(state.currentUser.assetBalance).toBe(25);
    expect(state.activeTab).toBe("dash");
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0].text).toBe("保留这条本地日志");
  });
});
