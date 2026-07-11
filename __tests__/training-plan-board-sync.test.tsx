import { act, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BoardProvider, useBoard } from "@/lib/store";
import type { BoardSnapshot, BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const baseSnapshot: BoardSnapshot = {
  members: [{ id: "user-1", name: "Li", avatarKey: "male1" }],
  gridData: [[false]],
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
  totalDays: 1,
  currentUserId: "user-1",
};

function Probe() {
  const { state } = useBoard();
  return <pre data-testid="state">{JSON.stringify(state)}</pre>;
}

function ApplySnapshot({ snapshot }: { snapshot: BoardSnapshot }) {
  const { dispatch } = useBoard();
  useEffect(() => {
    dispatch({ type: "APPLY_REMOTE_SNAPSHOT", snapshot });
  }, [dispatch, snapshot]);
  return null;
}

describe("training plan board sync", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("applies the remote training plan and today workout together", async () => {
    const initialState: BoardState = {
      ...baseSnapshot,
      currentTrainingPlan: null,
      currentUserTodayWorkout: null,
      logs: [],
      activeTab: "punch",
    };
    const remoteSnapshot = {
      ...baseSnapshot,
      currentUserTodayWorkout: {
        trainingType: "strength" as const,
        cardioItem: null,
        cardioItems: [],
        strengthParts: ["chest" as const],
        durationMinutes: 45,
      },
      currentTrainingPlan: {
        id: "plan-1",
        templateId: "beginner-fat-loss-3d-45m",
        templateVersion: 1,
        status: "ACTIVE" as const,
        startDayKey: "2026-07-13",
        endDayKey: "2026-08-09",
        currentWeekIndex: 1,
        todayDay: null,
        nextDay: null,
        days: [],
      },
    } satisfies BoardSnapshot;

    await act(async () => {
      root.render(
        <BoardProvider initialState={initialState}>
          <ApplySnapshot snapshot={remoteSnapshot} />
          <Probe />
        </BoardProvider>,
      );
    });

    const state = JSON.parse(container.querySelector("[data-testid='state']")!.textContent ?? "{}");
    expect(state.currentTrainingPlan.id).toBe("plan-1");
    expect(state.currentUserTodayWorkout.durationMinutes).toBe(45);
  });
});
