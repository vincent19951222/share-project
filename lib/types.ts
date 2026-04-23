export interface Member {
  id: string;
  name: string;
  avatarKey: string;
  assetBalance?: number;
  seasonIncome?: number;
  slotContribution?: number;
}

export interface BoardContribution {
  userId: string;
  name: string;
  avatarKey: string;
  colorIndex: number;
  slotContribution: number;
  seasonIncome: number;
}

export interface ActiveSeasonSnapshot {
  id: string;
  monthKey: string;
  goalName: string;
  targetSlots: number;
  filledSlots: number;
  contributions: BoardContribution[];
}

export interface CurrentUserSnapshot {
  assetBalance: number;
  currentStreak: number;
  nextReward: number;
  seasonIncome: number;
  isAdmin: boolean;
}

export type AppTab = "punch" | "board" | "coffee" | "dash" | "calendar";

export interface CoffeeMemberSnapshot {
  id: string;
  name: string;
  avatarKey: string;
}

export interface CoffeeDayCell {
  cups: number;
}

export interface CoffeeKingSnapshot {
  userId: string;
  name: string;
  cups: number;
}

export interface CoffeeSnapshot {
  members: CoffeeMemberSnapshot[];
  gridData: CoffeeDayCell[][];
  today: number;
  totalDays: number;
  currentUserId: string;
  stats: {
    todayTotalCups: number;
    todayDrinkers: number;
    currentUserTodayCups: number;
    coffeeKing: CoffeeKingSnapshot | null;
  };
}

export interface CalendarDayRecord {
  day: number;
  workedOut: boolean;
  coffeeCups: number;
}

export interface CalendarMonthSnapshot {
  monthKey: string;
  currentMonthKey: string;
  todayDay: number | null;
  totalDays: number;
  workoutDays: number;
  coffeeCupTotal: number;
  days: CalendarDayRecord[];
}

export type CellStatus = boolean | null;

export interface ActivityLog {
  id: string;
  text: string;
  type: "system" | "success" | "alert" | "highlight";
  timestamp: Date;
}

export interface BoardSnapshot {
  members: Member[];
  gridData: CellStatus[][];
  teamVaultTotal?: number;
  currentUser?: CurrentUserSnapshot;
  activeSeason?: ActiveSeasonSnapshot | null;
  /** @deprecated Kept only while the UI migrates to teamVaultTotal. */
  teamCoins?: number;
  /** @deprecated Kept only while the UI migrates to activeSeason target slots. */
  targetCoins?: number;
  today: number;
  totalDays: number;
  currentUserId: string;
}

export interface BoardState extends BoardSnapshot {
  logs: ActivityLog[];
  activeTab: AppTab;
  lastAppliedPollRequestId?: number;
  pendingPunchEpoch?: number;
  latestSettledPunchEpoch?: number;
}

export type BoardAction =
  | { type: "ADD_LOG"; log: ActivityLog }
  | { type: "SET_TAB"; tab: AppTab }
  | { type: "BEGIN_PUNCH_SYNC"; punchEpoch: number }
  | { type: "END_PUNCH_SYNC"; punchEpoch: number }
  | { type: "APPLY_REMOTE_SNAPSHOT"; snapshot: BoardSnapshot }
  | {
      type: "SYNC_REMOTE_STATE";
      snapshot: BoardSnapshot;
      source: "poll";
      requestId: number;
      pendingPunchEpochAtStart: number;
      settledPunchEpochAtStart: number;
    }
  | {
      type: "SYNC_REMOTE_STATE";
      snapshot: BoardSnapshot;
      source: "punch";
      punchEpoch: number;
    };
