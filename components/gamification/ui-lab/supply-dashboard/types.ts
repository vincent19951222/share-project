import type {
  SupplyUiLabActiveEffect,
  SupplyUiLabResourceId,
} from "../supply-data/types";

export type SupplyDashboardResource = {
  id: SupplyUiLabResourceId;
  label: string;
  value: number;
  maxValue?: number;
  icon: string;
  iconImage?: string;
};

export type SupplyDashboardActiveEffect = SupplyUiLabActiveEffect;

export type SupplyDashboardQuest = {
  id: string;
  dimension: "movement" | "hydration" | "social" | "learning";
  title: string;
  subtitle: string;
  description: string;
  image: string;
  difficulty: "轻" | "中";
  tags: string[];
  durationLabel: string;
  completed: boolean;
  reward: {
    icon: string;
    label: string;
    amount: number;
  };
};

export type SupplyDashboardInventoryItem = {
  id: string;
  name: string;
  icon: string;
  quantity: number;
};

export type SupplyDashboardShortcutLink = {
  id: "home" | "backpack" | "draw-pool" | "task-record";
  href: string;
  title: string;
  subtitle: string;
  badge: string;
  image: string | null;
};

export type SupplyDashboardPreview = {
  profile: {
    username: string;
    avatar: string;
    title: string;
    level: number;
    totalExp: number;
    currentLevelExp: number;
    nextLevelExp: number;
    streakDays: number;
  };
  motto: string;
  resources: SupplyDashboardResource[];
  activeEffects: SupplyDashboardActiveEffect[];
  dailyQuests: SupplyDashboardQuest[];
  dailyReward?: {
    claimable: boolean;
    claimed: boolean;
  };
  shortcutLinks: SupplyDashboardShortcutLink[];
  inventoryPreview: {
    usedSlots: number;
    totalSlots: number;
    items: SupplyDashboardInventoryItem[];
  };
  supplyPreview: {
    remainingDraws: number;
    maxDraws: number;
    featuredRewards: SupplyDashboardInventoryItem[];
  };
  announcement: {
    message: string;
  };
};
