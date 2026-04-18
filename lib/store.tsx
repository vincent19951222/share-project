"use client";

import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import { BoardState, BoardAction } from "./types";

function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "PUNCH": {
      const newGrid = state.gridData.map((row) => [...row]);
      newGrid[action.memberIndex][action.dayIndex] = true;
      return {
        ...state,
        gridData: newGrid,
        teamCoins: state.teamCoins + 15,
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}`,
            text: `<div class="w-4 h-4 inline-block align-middle text-slate-800">${state.members[action.memberIndex].avatarSvg}</div> <b>${state.members[action.memberIndex].name}</b> 完成了 <b>${action.punchType}</b>! Team Pts +15.`,
            type: "success",
            timestamp: new Date(),
          },
        ],
      };
    }
    case "ADD_LOG":
      return { ...state, logs: [...state.logs, action.log] };
    case "SET_TAB":
      return { ...state, activeTab: action.tab };
    case "SIMULATE_REMOTE_PUNCH": {
      const member = state.members[action.memberIndex];
      const dayIdx = state.today - 1;
      if (state.gridData[action.memberIndex][dayIdx] === true) return state;
      const newGrid = state.gridData.map((row) => [...row]);
      newGrid[action.memberIndex][dayIdx] = true;
      return {
        ...state,
        gridData: newGrid,
        teamCoins: state.teamCoins + 15,
        logs: [
          ...state.logs,
          {
            id: `log-${Date.now()}`,
            text: `[实时推送] <div class="w-4 h-4 inline-block align-middle text-slate-800">${member.avatarSvg}</div> <b>${member.name}</b> 刚刚完成了 ${action.typeDesc}，点亮了格子！`,
            type: "highlight",
            timestamp: new Date(),
          },
        ],
      };
    }
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

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch({ type: "SIMULATE_REMOTE_PUNCH", memberIndex: 1, typeDesc: "力量训练" });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BoardContext.Provider value={{ state, dispatch }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) throw new Error("useBoard must be used within BoardProvider");
  return context;
}
