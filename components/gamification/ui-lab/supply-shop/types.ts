import type {
  SupplyUiLabCatalogCategory,
  SupplyUiLabCatalogRarity,
  SupplyUiLabResource,
  SupplyUiLabUseTiming,
} from "../supply-data/types";

export type SupplyShopCurrency = "coins";
export type SupplyShopRarity = SupplyUiLabCatalogRarity;
export type SupplyShopCategoryId = "all" | SupplyUiLabCatalogCategory;
export type SupplyShopFilterId = "all" | "redeemable" | "owned" | "admin";

export type SupplyShopResource = SupplyUiLabResource;

export type SupplyShopCategory = {
  id: SupplyShopCategoryId;
  label: string;
  icon: string;
  iconImage: string;
  active: boolean;
};

export type SupplyShopFilter = {
  id: SupplyShopFilterId;
  label: string;
  active: boolean;
};

export type SupplyShopProduct = {
  id: string;
  name: string;
  subtitle: string;
  categoryId: Exclude<SupplyShopCategoryId, "all">;
  categoryLabel: string;
  image: string;
  rarity: SupplyShopRarity;
  tags: string[];
  price: {
    currency: SupplyShopCurrency;
    amount: number;
  };
  ownedQuantity: number;
  sourceLabel: string;
  limitLabel: string;
  requiresAdminConfirmation: boolean;
  selected: boolean;
};

export type SupplyShopProductDetail = {
  productId: string;
  description: string;
  effect: string;
  useTiming: string;
  useTimingId: SupplyUiLabUseTiming;
  purchaseLimit: string;
  costLabel: string;
  sourceLabel: string;
  ownedLabel: string;
  adminConfirmationLabel: string | null;
  footnote: string;
  redeemLabel: string;
  redeemFeedback: string;
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
  products: SupplyShopProduct[];
  productDetails: SupplyShopProductDetail[];
  selectedProductDetail: SupplyShopProductDetail;
  notice: string;
  rules: string[];
  initialFeedback: string;
};
