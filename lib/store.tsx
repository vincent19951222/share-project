"use client";

import { createContext, useContext, useEffect, useReducer, useRef, type ReactNode } from "react";
import { fetchBoardState } from "@/lib/api";
import type { BoardAction, BoardState } from "./types";

let nextPollRequestId = 0;
let nextPunchEpoch = 0;

export function reservePollRequestId() {
  nextPollRequestId += 1;
  return nextPollRequestId;
}

export function reservePunchEpoch() {
  nextPunchEpoch += 1;
  return nextPunchEpoch;
}

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "ADD_LOG":
      return { ...state, logs: [...state.logs, action.log] };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "APPLY_REMOTE_SNAPSHOT":
      return {
        ...state,
        members: action.snapshot.members,
        gridData: action.snapshot.gridData,
        teamVaultTotal: action.snapshot.teamVaultTotal,
        currentUser: action.snapshot.currentUser,
        activeSeason: action.snapshot.activeSeason,
        today: action.snapshot.today,
        totalDays: action.snapshot.totalDays,
        currentUserId: action.snapshot.currentUserId,
      };
    case "BEGIN_PUNCH_SYNC":
      if (action.punchEpoch <= (state.pendingPunchEpoch ?? 0)) {
        return state;
      }

      return {
        ...state,
        pendingPunchEpoch: action.punchEpoch,
      };
    case "END_PUNCH_SYNC":
      if (state.pendingPunchEpoch !== action.punchEpoch) {
        return state;
      }

      return {
        ...state,
        pendingPunchEpoch: undefined,
      };
    case "SYNC_REMOTE_STATE":
      if (action.source === "poll") {
        if ((state.pendingPunchEpoch ?? 0) > 0 || action.pendingPunchEpochAtStart > 0) {
          return state;
        }

        if (action.settledPunchEpochAtStart < (state.latestSettledPunchEpoch ?? 0)) {
          return state;
        }

        if (action.requestId < (state.lastAppliedPollRequestId ?? 0)) {
          return state;
        }
      } else {
        if (action.punchEpoch < (state.pendingPunchEpoch ?? 0)) {
          return state;
        }

        if (action.punchEpoch < (state.latestSettledPunchEpoch ?? 0)) {
          return state;
        }
      }

      return {
        ...state,
        members: action.snapshot.members,
        gridData: action.snapshot.gridData,
        teamVaultTotal: action.snapshot.teamVaultTotal,
        currentUser: action.snapshot.currentUser,
        activeSeason: action.snapshot.activeSeason,
        today: action.snapshot.today,
        totalDays: action.snapshot.totalDays,
        currentUserId: action.snapshot.currentUserId,
        lastAppliedPollRequestId:
          action.source === "poll"
            ? action.requestId
            : state.lastAppliedPollRequestId,
        pendingPunchEpoch:
          action.source === "punch"
            ? state.pendingPunchEpoch === action.punchEpoch
              ? undefined
              : state.pendingPunchEpoch
            : state.pendingPunchEpoch,
        latestSettledPunchEpoch:
          action.source === "punch"
            ? Math.max(state.latestSettledPunchEpoch ?? 0, action.punchEpoch)
            : state.latestSettledPunchEpoch,
      };
    default:
      return state;
  }
}

interface BoardContextType {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
}

const BoardContext = createContext<BoardContextType | null>(null);

export function BoardProvider({
  initialState,
  children,
}: {
  initialState: BoardState;
  children: ReactNode;
}) {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const requestId = reservePollRequestId();
      const pendingPunchEpochAtStart = stateRef.current.pendingPunchEpoch ?? 0;
      const settledPunchEpochAtStart =
        stateRef.current.latestSettledPunchEpoch ?? 0;

      try {
        const snapshot = await fetchBoardState();
        if (!cancelled) {
          dispatch({
            type: "SYNC_REMOTE_STATE",
            snapshot,
            source: "poll",
            requestId,
            pendingPunchEpochAtStart,
            settledPunchEpochAtStart,
          });
        }
      } catch {
        // Keep the current UI usable when polling fails.
      }
    };

    const timer = window.setInterval(sync, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return <BoardContext.Provider value={{ state, dispatch }}>{children}</BoardContext.Provider>;
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error("useBoard must be used within BoardProvider");
  return context;
}
