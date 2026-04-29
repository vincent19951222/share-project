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

export type AppTab = "punch" | "board" | "coffee" | "supply" | "dash" | "calendar";

export type GamificationTaskStatus = "pending" | "completed";
export type GamificationLotteryStatus = "placeholder" | "active";
export type GamificationSocialStatus = "placeholder";

export interface GamificationTaskAssignmentSnapshot {
  id: string;
  taskCardId: string;
  title: string;
  description: string;
  status: GamificationTaskStatus;
  completedAt: string | null;
  completionText: string | null;
  rerollCount: number;
  rerollLimit: 1;
  canComplete: boolean;
  canReroll: boolean;
}

export interface GamificationDimensionSnapshot {
  key: "movement" | "hydration" | "social" | "learning";
  title: string;
  subtitle: string;
  description: string;
  assignment: GamificationTaskAssignmentSnapshot | null;
}

export interface GamificationTicketSummary {
  maxFreeTicketsToday: 2;
  todayEarned: number;
  todaySpent: number;
  lifeTicketEarned: boolean;
  fitnessTicketEarned: boolean;
  taskCompletedCount: number;
  lifeTicketClaimable: boolean;
}

export interface GamificationLotteryRewardSnapshot {
  rewardId: string;
  rewardTier: string;
  rewardKind: string;
  name: string;
  description: string;
  effectSummary: string;
}

export interface GamificationLotteryDrawSnapshot {
  id: string;
  drawType: "SINGLE" | "TEN";
  ticketSpent: number;
  coinSpent: number;
  guaranteeApplied: boolean;
  createdAt: string;
  rewards: GamificationLotteryRewardSnapshot[];
}

export interface GamificationLotterySummary {
  status: GamificationLotteryStatus;
  singleDrawEnabled: boolean;
  tenDrawEnabled: boolean;
  tenDrawTopUpRequired: number;
  tenDrawTopUpCoinCost: number;
  dailyTopUpPurchased: number;
  dailyTopUpLimit: 3;
  ticketPrice: 40;
  message: string;
  recentDraws: GamificationLotteryDrawSnapshot[];
}

export type GamificationBackpackCategory =
  | "boost"
  | "protection"
  | "social"
  | "lottery"
  | "task"
  | "cosmetic"
  | "real_world"
  | "unknown";

export type GamificationItemUseTiming = "today" | "instant" | "manual_redemption" | "unknown";

export interface GamificationBackpackItemSnapshot {
  itemId: string;
  category: GamificationBackpackCategory;
  categoryLabel: string;
  name: string;
  description: string;
  quantity: number;
  useTiming: GamificationItemUseTiming;
  useTimingLabel: string;
  effectSummary: string;
  usageLimitSummary: string;
  stackable: boolean;
  requiresAdminConfirmation: boolean;
  enabled: boolean;
  knownDefinition: boolean;
}

export interface GamificationBackpackGroupSnapshot {
  category: GamificationBackpackCategory;
  label: string;
  totalQuantity: number;
  items: GamificationBackpackItemSnapshot[];
}

export interface GamificationTodayEffectSnapshot {
  id: string;
  itemId: string;
  name: string;
  status: "PENDING" | "SETTLED" | "EXPIRED" | "CANCELLED";
  statusLabel: string;
  effectSummary: string;
  createdAt: string;
  settledAt: string | null;
}

export interface GamificationBackpackSummary {
  status: "active";
  totalQuantity: number;
  ownedItemCount: number;
  previewItems: GamificationBackpackItemSnapshot[];
  groups: GamificationBackpackGroupSnapshot[];
  todayEffects: GamificationTodayEffectSnapshot[];
  emptyMessage: string;
}

export interface GamificationSocialSummary {
  status: GamificationSocialStatus;
  pendingSentCount: number;
  pendingReceivedCount: number;
  message: string;
}

export interface GamificationStateSnapshot {
  currentUserId: string;
  teamId: string;
  dayKey: string;
  ticketBalance: number;
  dimensions: GamificationDimensionSnapshot[];
  ticketSummary: GamificationTicketSummary;
  lottery: GamificationLotterySummary;
  backpack: GamificationBackpackSummary;
  social: GamificationSocialSummary;
}

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
