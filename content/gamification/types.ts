export type TaskDimensionKey = "movement" | "hydration" | "social" | "learning";
export type TaskEffort = "light" | "medium";
export type TaskScene = "office" | "home" | "general";

export type RewardTier = "coin" | "utility" | "social" | "cosmetic" | "rare";
export type RewardKind = "coins" | "inventory_item" | "title" | "real_world_redemption";
export type RewardRarity = "common" | "uncommon" | "rare" | "epic";

export type ItemCategory =
  | "boost"
  | "protection"
  | "social"
  | "lottery"
  | "task"
  | "cosmetic"
  | "real_world";
export type ItemUseTiming = "today" | "instant" | "manual_redemption";

export interface DimensionDefinition {
  key: TaskDimensionKey;
  title: string;
  subtitle: string;
  description: string;
}

export interface TaskCardDefinition {
  id: string;
  dimensionKey: TaskDimensionKey;
  title: string;
  description: string;
  completionTextOptions: string[];
  effort: TaskEffort;
  scene: TaskScene;
  repeatCooldownDays: number;
  isWeekendOnly: boolean;
  tags: string[];
  weight: number;
  enabled: boolean;
}

export type RewardEffect =
  | { type: "grant_coins"; amount: number }
  | { type: "grant_item"; itemId: string; quantity: number }
  | { type: "grant_title"; titleId: string }
  | { type: "grant_real_world_redemption"; itemId: string; quantity: number };

export interface RewardDefinition {
  id: string;
  tier: RewardTier;
  kind: RewardKind;
  rarity: RewardRarity;
  name: string;
  description: string;
  weight: number;
  effect: RewardEffect;
  enabled: boolean;
  highlightInDynamics?: boolean;
}

export type ItemEffect =
  | { type: "fitness_coin_multiplier"; multiplier: 1.5 | 2 }
  | { type: "fitness_season_multiplier"; multiplier: 2 }
  | { type: "fitness_coin_and_season_multiplier"; multiplier: 2 }
  | { type: "task_reroll"; scope: "same_dimension" }
  | { type: "lottery_guarantee"; minTier: RewardTier; appliesTo: "single" | "ten_draw" }
  | { type: "ticket_discount"; discountRate: number }
  | { type: "social_invitation"; invitationType: string }
  | { type: "leave_protection"; protectsStreak: true; freezesNextFitnessRewardTier: true }
  | { type: "real_world_redemption"; redemptionType: "luckin_coffee" }
  | { type: "dimension_coin_bonus"; dimensionKey: TaskDimensionKey; amount: number }
  | { type: "cosmetic"; cosmeticType: "calendar_sticker" | "team_broadcast_draft" };

export interface ItemDefinition {
  id: string;
  category: ItemCategory;
  name: string;
  description: string;
  useTiming: ItemUseTiming;
  effect: ItemEffect;
  stackable: boolean;
  maxUsePerUserPerDay?: number;
  maxUsePerUserPerWeek?: number;
  maxUsePerTeamPerDay?: number;
  requiresAdminConfirmation: boolean;
  enabled: boolean;
  highlightInDynamics?: boolean;
}

export interface GamificationContentBundle {
  dimensions: DimensionDefinition[];
  taskCards: TaskCardDefinition[];
  rewards: RewardDefinition[];
  items: ItemDefinition[];
}
