export type SupplyDrawPoolResourceId = "ticket" | "coins";
export type SupplyDrawPoolActionId = "single" | "ten";
export type SupplyDrawPoolRarity = "SSR" | "SR" | "R" | "N";

export type SupplyDrawPoolResource = {
  id: SupplyDrawPoolResourceId;
  label: string;
  value: string;
  icon: string;
};

export type SupplyDrawPoolWalletAction = {
  id: "more-tickets" | "tasks";
  label: string;
  tone: "primary" | "secondary";
};

export type SupplyDrawPoolWallet = {
  ticketIcon: string;
  ticketBalance: number;
  dailyEarned: number;
  dailyLimit: number;
  helper: string;
  actions: SupplyDrawPoolWalletAction[];
};

export type SupplyDrawPoolGuide = {
  mascotImage: string;
  message: string;
  actionLabel: string;
};

export type SupplyDrawPoolRate = {
  rarity: SupplyDrawPoolRarity;
  percent: number;
  tone: "ssr" | "sr" | "r" | "n";
};

export type SupplyDrawPoolMachineAction = {
  id: SupplyDrawPoolActionId;
  label: string;
  drawCount: number;
  costTicket: number;
  tone: "single" | "ten";
  guaranteeLabel?: string;
};

export type SupplyDrawPoolMachine = {
  title: string;
  emblemImage: string;
  skipAnimation: boolean;
  actions: SupplyDrawPoolMachineAction[];
};

export type SupplyDrawPoolPity = {
  remainingDraws: number;
  guaranteeLabel: string;
  current: number;
  target: number;
  rewardImage: string;
};

export type SupplyDrawPoolRecentDrop = {
  id: string;
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
    resources: SupplyDrawPoolResource[];
    closeHref: string;
  };
  wallet: SupplyDrawPoolWallet;
  guide: SupplyDrawPoolGuide;
  poolRates: SupplyDrawPoolRate[];
  machine: SupplyDrawPoolMachine;
  pity: SupplyDrawPoolPity;
  recentDrops: SupplyDrawPoolRecentDrop[];
  rules: string[];
  probabilityHref: string;
  recordsHref: string;
  backHref: string;
};
