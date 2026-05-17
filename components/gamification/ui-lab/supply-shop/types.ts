export type SupplyShopCurrency = "coins" | "ticket";
export type SupplyShopRarity = "common" | "rare" | "sr" | "ssr";
export type SupplyShopCategoryId = "featured" | "boost" | "task" | "social" | "real" | "cosmetic";

export type SupplyShopResource = {
  id: "coins" | "ticket" | "backpack";
  label: string;
  value: string;
  icon: string;
};

export type SupplyShopCategory = {
  id: SupplyShopCategoryId;
  label: string;
  icon: string;
  active: boolean;
};

export type SupplyShopFilter = {
  id: "all" | "redeemable" | "owned";
  label: string;
  active: boolean;
};

export type SupplyShopProduct = {
  id: string;
  name: string;
  subtitle: string;
  categoryId: SupplyShopCategoryId;
  image: string;
  rarity: SupplyShopRarity;
  tags: string[];
  price: {
    currency: SupplyShopCurrency;
    amount: number;
  };
  ownedQuantity: number;
  stock?: {
    label: string;
    remaining: number;
    total: number;
  };
  dailyLimit?: {
    label: string;
    used: number;
    total: number;
  };
  requiresAdminConfirmation: boolean;
  selected: boolean;
};

export type SupplyShopProductDetail = {
  productId: string;
  description: string;
  effect: string;
  useTiming: string;
  purchaseLimit: string;
  costLabel: string;
  footnote: string;
  redeemDisabled: boolean;
  redeemDisabledReason: string;
};

export type SupplyShopPreview = {
  topBar: {
    resources: SupplyShopResource[];
    profile: {
      username: string;
      avatar: string;
    };
  };
  sidebar: {
    categories: SupplyShopCategory[];
    resources: SupplyShopResource[];
  };
  filters: SupplyShopFilter[];
  sortOptions: string[];
  selectedSort: string;
  products: SupplyShopProduct[];
  selectedProductDetail: SupplyShopProductDetail;
  notice: string;
};
