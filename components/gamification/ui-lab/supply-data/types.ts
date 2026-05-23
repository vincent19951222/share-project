export type SupplyUiLabResourceId = "coins" | "ticket" | "backpack";
export type SupplyUiLabResourceGroupId = "dashboard" | "backpack" | "shop" | "drawPool" | "taskRecord";
export type SupplyUiLabCatalogCategory = "boost" | "protection" | "social" | "task" | "real_world";
export type SupplyUiLabCatalogRarity = "N" | "R" | "SR" | "SSR";
export type SupplyUiLabUseTiming = "today" | "instant" | "manual_redemption";
export type SupplyUiLabObtainSource = "draw_pool" | "shop";
export type SupplyUiLabDrawTier = "utility" | "social" | "rare";
export type SupplyUiLabAssetStatus = "existing" | "needs_generated";
export type SupplyUiLabEffectStatus = "pending" | "active" | "expired";

export type SupplyUiLabResource = {
  id: SupplyUiLabResourceId;
  label: "银子" | "抽奖券" | "背包";
  value: string;
  icon: string;
  iconImage?: string;
};

export type SupplyUiLabCatalogItem = {
  id: string;
  sourceItemId: string;
  sourceRewardId: string;
  name: string;
  category: SupplyUiLabCatalogCategory;
  rarity: SupplyUiLabCatalogRarity;
  description: string;
  effectSummary: string;
  useTiming: SupplyUiLabUseTiming;
  obtainSources: SupplyUiLabObtainSource[];
  shop: {
    buyable: boolean;
    priceCoins: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    requiresAdminConfirmation: boolean;
  };
  drawPool: {
    drawable: boolean;
    tier: SupplyUiLabDrawTier;
    weightLabel: string;
  };
  inventory: {
    quantity: number;
    selected: boolean;
  };
  media: {
    image: string;
    assetStatus: SupplyUiLabAssetStatus;
  };
};

export type SupplyUiLabCoinRewardRow = {
  rewardId: string;
  name: string;
  amount: number;
  weightLabel: string;
  image: string;
};

export type SupplyUiLabActiveEffect = {
  id: string;
  sourceItemId: string;
  label: string;
  effectSummary: string;
  businessSource: string;
  status: SupplyUiLabEffectStatus;
  statusLabel: "今日待生效" | "今日已生效" | "已过期";
  endsAtLabel: string;
  icon: string;
};
