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
export type GamificationSocialStatus = "placeholder" | "active";

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
  reservedQuantity: number;
  availableQuantity: number;
  useEnabled: boolean;
  useDisabledReason: string | null;
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

export interface SocialInvitationSnapshot {
  id: string;
  senderUserId: string;
  senderUsername: string | null;
  recipientUserId: string | null;
  recipientUsername: string | null;
  invitationType: string;
  status: "PENDING" | "RESPONDED" | "EXPIRED" | "CANCELLED";
  dayKey: string;
  message: string;
  responseCount: number;
  wechatWebhookSentAt: string | null;
  respondedAt: string | null;
  expiredAt: string | null;
  createdAt: string;
}

export interface SocialInvitationResponseSnapshot {
  id: string;
  invitationId: string;
  invitationType: string;
  responderUserId: string;
  responderUsername: string;
  responseText: string | null;
  createdAt: string;
}

export interface SocialRecipientSnapshot {
  userId: string;
  username: string;
  avatarKey: string;
}

export interface GamificationSocialSummary {
  status: GamificationSocialStatus;
  pendingSentCount: number;
  pendingReceivedCount: number;
  teamWidePendingCount: number;
  sent: SocialInvitationSnapshot[];
  received: SocialInvitationSnapshot[];
  teamWide: SocialInvitationSnapshot[];
  recentResponses: SocialInvitationResponseSnapshot[];
  availableRecipients: SocialRecipientSnapshot[];
  message: string;
}

export type RealWorldRedemptionStatus = "REQUESTED" | "CONFIRMED" | "CANCELLED";

export interface GamificationRedemptionSnapshot {
  id: string;
  userId: string;
  username: string | null;
  itemId: string;
  itemName: string;
  redemptionType: "luckin_coffee" | "unknown";
  status: RealWorldRedemptionStatus;
  statusLabel: string;
  statusTone: "warning" | "success" | "muted" | "danger";
  requestedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  confirmedByUsername: string | null;
  cancelledByUsername: string | null;
  note: string | null;
}

export interface GamificationRedemptionSectionSnapshot {
  mine: GamificationRedemptionSnapshot[];
  adminQueue: GamificationRedemptionSnapshot[];
}

export interface GamificationStateSnapshot {
  currentUserId: string;
  currentUserRole: string;
  teamId: string;
  dayKey: string;
  ticketBalance: number;
  dimensions: GamificationDimensionSnapshot[];
  ticketSummary: GamificationTicketSummary;
  lottery: GamificationLotterySummary;
  backpack: GamificationBackpackSummary;
  social: GamificationSocialSummary;
  redemptions: GamificationRedemptionSectionSnapshot;
}

export interface GamificationWeeklyReportMetric {
  key: string;
  label: string;
  value: string;
  helper: string;
  tone: "default" | "success" | "warning" | "highlight";
}

export interface GamificationWeeklyReportCard {
  key: string;
  title: string;
  body: string;
  tone: "default" | "success" | "warning" | "highlight";
}

export interface GamificationWeeklyReportHighlight {
  id: string;
  title: string;
  summary: string;
  sourceType: string;
  sourceId: string;
  occurredAt: string;
}

export interface GamificationWeeklyReportMetrics {
  teamMemberCount: number;
  daysInWindow: number;
  expectedTaskCount: number;
  completedTaskCount: number;
  taskCompletionRate: number;
  allFourCompletionDays: number;
  fitnessTicketsEarned: number;
  lifeTicketsEarned: number;
  paidTicketsBought: number;
  ticketsSpent: number;
  netTicketChange: number;
  drawCount: number;
  singleDrawCount: number;
  tenDrawCount: number;
  coinSpent: number;
  coinRewarded: number;
  rareRewardCount: number;
  realWorldRewardCount: number;
  itemUseCount: number;
  boostUseCount: number;
  boostAssetBonusTotal: number;
  boostSeasonBonusTotal: number;
  leaveCouponUseCount: number;
  pendingItemUseCount: number;
  expiredItemUseCount: number;
  socialInvitationCount: number;
  directInvitationCount: number;
  teamInvitationCount: number;
  socialResponseCount: number;
  socialResponseRate: number;
  gameDynamicCount: number;
  rarePrizeDynamicCount: number;
  boostDynamicCount: number;
  socialMomentDynamicCount: number;
}

export interface GamificationWeeklyReportSnapshot {
  teamId: string;
  weekStartDayKey: string;
  weekEndDayKey: string;
  generatedAt: string;
  published: boolean;
  publishedDynamicId: string | null;
  metrics: GamificationWeeklyReportMetrics;
  metricCards: GamificationWeeklyReportMetric[];
  summaryCards: GamificationWeeklyReportCard[];
  highlights: GamificationWeeklyReportHighlight[];
}

export interface GamificationWeeklyReportPublishResult {
  snapshot: GamificationWeeklyReportSnapshot;
  teamDynamic: {
    status: "CREATED" | "EXISTING";
    id: string;
  };
  wechat: {
    status: "NOT_REQUESTED" | "SENT" | "SKIPPED" | "FAILED";
    failureReason?: string;
  };
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
