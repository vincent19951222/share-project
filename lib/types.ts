export interface Member {
  id: string;
  name: string;
  avatarSvg: string;
}

export type CellStatus = boolean | null;

export interface ActivityLog {
  id: string;
  text: string;
  type: "system" | "success" | "alert" | "highlight";
  timestamp: Date;
}

export interface BoardState {
  members: Member[];
  gridData: CellStatus[][];
  teamCoins: number;
  targetCoins: number;
  today: number;
  totalDays: number;
  logs: ActivityLog[];
  activeTab: "punch" | "dash";
}

export type BoardAction =
  | { type: "PUNCH"; memberIndex: number; dayIndex: number; punchType: string }
  | { type: "ADD_LOG"; log: ActivityLog }
  | { type: "SET_TAB"; tab: "punch" | "dash" }
  | { type: "SIMULATE_REMOTE_PUNCH"; memberIndex: number; typeDesc: string };
