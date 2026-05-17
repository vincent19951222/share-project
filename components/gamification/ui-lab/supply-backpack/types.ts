export type SupplyBackpackRarity = "N" | "R" | "SR" | "SSR";
export type SupplyBackpackCategoryId = "all" | "boost" | "task" | "social" | "real";

export type SupplyBackpackResource = {
  id: "coins" | "ticket" | "backpack";
  label: string;
  value: string;
  icon: string;
};

export type SupplyBackpackCategory = {
  id: SupplyBackpackCategoryId;
  label: string;
  icon: string;
  active: boolean;
};

export type SupplyBackpackTodayEffect = {
  id: string;
  icon: string;
  label: string;
  value: string;
  expiresIn: string;
};

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
      type: "locked";
      id: string;
      unlockLevel: number;
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
    totalPages: number;
    slots: SupplyBackpackSlot[];
  };
  selectedItemDetail: SupplyBackpackSelectedDetail;
  hint: string;
};
