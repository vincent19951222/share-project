export type SupplyDashboardResource = {
  id: "coins" | "energy" | "ticket";
  label: string;
  value: number;
  maxValue?: number;
  icon: string;
};

export type SupplyDashboardEffect = {
  id: string;
  icon: string;
  label: string;
  value: string;
  expiresIn: string;
};

export type SupplyDashboardQuest = {
  id: string;
  dimension: "movement" | "hydration" | "social" | "learning";
  title: string;
  subtitle: string;
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

export type SupplyDashboardPreview = {
  profile: {
    username: string;
    avatar: string;
    title: string;
    level: number;
    exp: number;
    nextLevelExp: number;
    streakDays: number;
  };
  motto: string;
  resources: SupplyDashboardResource[];
  activeEffects: SupplyDashboardEffect[];
  dailyQuests: SupplyDashboardQuest[];
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
