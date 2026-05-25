import { supplyUiLabCatalog } from "../supply-data/catalog";
import { supplyUiLabCategoryIcons } from "../supply-data/category-icons";
import { supplyUiLabActiveEffects } from "../supply-data/effects";
import { supplyUiLabResources } from "../supply-data/resources";
import type { SupplyUiLabCatalogItem, SupplyUiLabUseTiming } from "../supply-data/types";
import type {
  SupplyBackpackCategoryMap,
  SupplyBackpackInventoryItem,
  SupplyBackpackPreview,
  SupplyBackpackSelectedDetail,
  SupplyBackpackSlot,
} from "./types";

const BACKPACK_TOTAL_SLOTS = 60;
const BACKPACK_PAGE_SIZE = 20;

const categoryMap: SupplyBackpackCategoryMap = {
  boost: "boost",
  protection: "boost",
  social: "social",
  task: "task",
  real_world: "real",
};

const categoryTag = {
  boost: "增益",
  protection: "保护",
  social: "社交",
  task: "任务",
  real_world: "真实福利",
} satisfies Record<SupplyUiLabCatalogItem["category"], string>;

const useTimingLabel = {
  today: "今日使用，效果截止今日 23:59",
  instant: "点击后立即展示本地预览反馈",
  manual_redemption: "申请兑换后等待管理员确认",
} satisfies Record<SupplyUiLabUseTiming, string>;

const buildRestrictions = (item: SupplyUiLabCatalogItem) => {
  const restrictions: string[] = [];

  if (item.shop.dailyLimit) {
    restrictions.push(`每日最多使用或兑换 ${item.shop.dailyLimit} 次`);
  }

  if (item.shop.weeklyLimit) {
    restrictions.push(`每周最多使用或兑换 ${item.shop.weeklyLimit} 次`);
  }

  if (item.useTiming === "today") {
    restrictions.push("仅影响今日本地预览效果");
  }

  if (item.useTiming === "instant") {
    restrictions.push("当前静态页只展示模拟反馈，不写入库存");
  }

  if (item.shop.requiresAdminConfirmation) {
    restrictions.push("真实福利需管理员确认后发放");
  }

  return restrictions.length > 0 ? restrictions : ["当前静态页只展示模拟反馈，不写入库存"];
};

const toInventoryItem = (item: SupplyUiLabCatalogItem): SupplyBackpackInventoryItem => ({
  id: item.sourceItemId,
  name: item.name,
  image: item.media.image,
  rarity: item.rarity,
  categoryId: categoryMap[item.category],
  quantity: item.inventory.quantity,
  selected: item.inventory.selected,
});

const toDetail = (item: SupplyUiLabCatalogItem): SupplyBackpackSelectedDetail => ({
  itemId: item.sourceItemId,
  name: item.name,
  rarity: item.rarity,
  tag: categoryTag[item.category],
  ownedQuantity: item.inventory.quantity,
  image: item.media.image,
  description: item.description,
  effect: item.effectSummary,
  useTiming: useTimingLabel[item.useTiming],
  restrictions: buildRestrictions(item),
  primaryAction: "今日使用",
  secondaryAction: "申请兑换",
  shopCta: {
    label: "去商店",
    href: "/ui-lab/supply-dashboard/shop",
    description: "前往补给商店查看同源道具与兑换入口",
  },
  requiresAdminConfirmation: item.shop.requiresAdminConfirmation,
  redemptionStateLabel: item.shop.requiresAdminConfirmation ? "等待管理员确认" : undefined,
});

const catalogInventoryItems = supplyUiLabCatalog.filter((item) => item.inventory.quantity > 0);

const itemSlots: SupplyBackpackSlot[] = catalogInventoryItems.map((item) => ({
  type: "item",
  item: toInventoryItem(item),
}));

const emptySlots: SupplyBackpackSlot[] = Array.from(
  { length: BACKPACK_TOTAL_SLOTS - itemSlots.length },
  (_, index) => ({
    type: "empty",
    id: `empty-${index + 1}`,
  }),
);

const itemDetails = catalogInventoryItems.map(toDetail);
const selectedItemDetail =
  itemDetails.find((detail) =>
    catalogInventoryItems.some(
      (item) => item.sourceItemId === detail.itemId && item.inventory.selected,
    ),
  ) ?? itemDetails[0];

export const supplyBackpackMock: SupplyBackpackPreview = {
  topBar: {
    breadcrumb: ["牛马补给站", "背包"],
    resources: supplyUiLabResources.backpack,
  },
  sidebar: {
    capacity: "18/60",
    categories: [
      { id: "all", label: "全部", icon: "▦", iconImage: supplyUiLabCategoryIcons.all, active: true },
      { id: "boost", label: "增益", icon: "✧", iconImage: supplyUiLabCategoryIcons.boost, active: false },
      { id: "task", label: "任务", icon: "▣", iconImage: supplyUiLabCategoryIcons.task, active: false },
      { id: "social", label: "社交", icon: "♟", iconImage: supplyUiLabCategoryIcons.social, active: false },
      {
        id: "real",
        label: "真实福利",
        icon: "▤",
        iconImage: supplyUiLabCategoryIcons.real_world,
        active: false,
      },
    ],
    todayEffects: supplyUiLabActiveEffects,
  },
  inventory: {
    page: 1,
    pageSize: BACKPACK_PAGE_SIZE,
    totalPages: BACKPACK_TOTAL_SLOTS / BACKPACK_PAGE_SIZE,
    totalSlots: BACKPACK_TOTAL_SLOTS,
    slots: [...itemSlots, ...emptySlots],
  },
  itemDetails,
  selectedItemDetail,
  hint: "静态预览只模拟本地交互，不会消耗库存；真实福利后续接入管理员确认流程。",
};
