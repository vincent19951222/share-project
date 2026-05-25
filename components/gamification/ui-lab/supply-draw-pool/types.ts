import type {
  SupplyUiLabCatalogRarity,
  SupplyUiLabDrawTier,
  SupplyUiLabResource,
} from "../supply-data/types";

export type SupplyDrawPoolActionId = "single" | "ten";
export type SupplyDrawPoolRateTier = "coin" | SupplyUiLabDrawTier;
export type SupplyDrawPoolRarity = SupplyUiLabCatalogRarity;

export type SupplyDrawPoolWallet = {
  ticketIcon: string;
  ticketBalance: number;
  dailyEarned: number;
  dailyLimit: number;
  helper: string;
};

export type SupplyDrawPoolGuide = {
  mascotImage: string;
  message: string;
};

export type SupplyDrawPoolRate = {
  tier: SupplyDrawPoolRateTier;
  rarity: "银子" | "实用" | "社交" | "稀有";
  percent: number;
  tone: "ssr" | "sr" | "r" | "n";
};

export type SupplyDrawPoolMachineAction = {
  id: SupplyDrawPoolActionId;
  label: string;
  drawCount: number;
  costTicket: number;
  tone: "single" | "ten";
  guaranteeLabel: "单抽无保底" | "十连批次保底";
};

export type SupplyDrawPoolMachine = {
  title: string;
  emblemImage: string;
  actions: SupplyDrawPoolMachineAction[];
};

export type SupplyDrawPoolGuarantee = {
  title: "十连保底说明";
  description: string;
  eligibleTiers: SupplyUiLabDrawTier[];
  eligibleTierLabels: Array<"实用" | "社交" | "稀有">;
};

export type SupplyDrawPoolRewardRow = {
  id: string;
  tier: SupplyDrawPoolRateTier;
  rarity: SupplyDrawPoolRarity;
  name: string;
  quantityLabel: string;
  image: string;
};

export type SupplyDrawPoolPreview = {
  media: {
    background: string;
    machine: string;
    capsuleBed: string;
    guideMascot: string;
    wristband: string;
    runningShoe: string;
  };
  topBar: {
    resources: SupplyUiLabResource[];
    closeHref: string;
  };
  wallet: SupplyDrawPoolWallet;
  guide: SupplyDrawPoolGuide;
  poolRates: SupplyDrawPoolRate[];
  machine: SupplyDrawPoolMachine;
  guarantee: SupplyDrawPoolGuarantee;
  recentDrops: SupplyDrawPoolRewardRow[];
  singleDrawResult: SupplyDrawPoolRewardRow[];
  tenDrawResult: SupplyDrawPoolRewardRow[];
  emptyDrawMessage: string;
  rules: string[];
  probabilityHref: string;
  recordsHref: string;
  backHref: string;
};
