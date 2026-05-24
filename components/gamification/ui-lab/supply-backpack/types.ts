import type {
  SupplyUiLabActiveEffect,
  SupplyUiLabCatalogCategory,
  SupplyUiLabCatalogRarity,
  SupplyUiLabResource,
} from "../supply-data/types";

export type SupplyBackpackRarity = SupplyUiLabCatalogRarity;
export type SupplyBackpackCategoryId = "all" | "boost" | "task" | "social" | "real";

export type SupplyBackpackResource = SupplyUiLabResource;

export type SupplyBackpackCategory = {
  id: SupplyBackpackCategoryId;
  label: string;
  icon: string;
  iconImage: string;
  active: boolean;
};

export type SupplyBackpackTodayEffect = SupplyUiLabActiveEffect;

export type SupplyBackpackInventoryItem = {
  id: string;
  name: string;
  image: string;
  rarity: SupplyBackpackRarity;
  categoryId: Exclude<SupplyBackpackCategoryId, "all">;
  quantity: number;
  selected: boolean;
};

export type SupplyBackpackSlot =
  | {
      type: "item";
      item: SupplyBackpackInventoryItem;
    }
  | {
      type: "empty";
      id: string;
    };

export type SupplyBackpackSelectedDetail = {
  itemId: string;
  name: string;
  rarity: SupplyBackpackRarity;
  tag: string;
  ownedQuantity: number;
  image: string;
  description: string;
  effect: string;
  useTiming: string;
  restrictions: string[];
  primaryAction: string;
  secondaryAction: string;
  shopCta: {
    label: string;
    href: string;
    description: string;
  };
  requiresAdminConfirmation: boolean;
  redemptionStateLabel?: string;
};

export type SupplyBackpackPreview = {
  topBar: {
    breadcrumb: string[];
    resources: SupplyBackpackResource[];
  };
  sidebar: {
    capacity: string;
    categories: SupplyBackpackCategory[];
    todayEffects: SupplyBackpackTodayEffect[];
  };
  sortOptions: string[];
  selectedSort: string;
  inventory: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalSlots: number;
    slots: SupplyBackpackSlot[];
  };
  itemDetails: SupplyBackpackSelectedDetail[];
  selectedItemDetail: SupplyBackpackSelectedDetail;
  hint: string;
};

export type SupplyBackpackCategoryMap = Record<
  SupplyUiLabCatalogCategory,
  Exclude<SupplyBackpackCategoryId, "all">
>;
