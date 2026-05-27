import { supplyUiLabCatalog } from "../supply-data/catalog";
import { supplyUiLabResources } from "../supply-data/resources";
import type { SupplyUiLabCatalogCategory, SupplyUiLabUseTiming } from "../supply-data/types";
import { supplyShopAssetPaths } from "./assets";
import type {
  SupplyShopCategory,
  SupplyShopCategoryId,
  SupplyShopFilter,
  SupplyShopPreview,
  SupplyShopProduct,
  SupplyShopProductDetail,
  SupplyShopRarity,
} from "./types";

export { supplyShopAssetPaths };

const categoryMeta: Record<SupplyShopCategoryId, { label: string; icon: string; iconImage: string }> = {
  all: { label: "全部商品", icon: "▦", iconImage: supplyShopAssetPaths.categoryIcons.all },
  boost: { label: "增益道具", icon: "▲", iconImage: supplyShopAssetPaths.categoryIcons.boost },
  protection: { label: "防护道具", icon: "◆", iconImage: supplyShopAssetPaths.categoryIcons.protection },
  social: { label: "社交道具", icon: "✦", iconImage: supplyShopAssetPaths.categoryIcons.social },
  task: { label: "任务道具", icon: "▣", iconImage: supplyShopAssetPaths.categoryIcons.task },
  real_world: { label: "真实福利", icon: "★", iconImage: supplyShopAssetPaths.categoryIcons.real_world },
};

const categoryOrder: SupplyShopCategoryId[] = ["all", "boost", "protection", "task", "social", "real_world"];

const categoryTagLabel: Record<SupplyUiLabCatalogCategory, string> = {
  boost: "增益",
  protection: "防护",
  social: "社交",
  task: "任务",
  real_world: "真实福利",
};

const rarityTagLabel: Record<SupplyShopRarity, string> = {
  N: "N",
  R: "R",
  SR: "SR",
  SSR: "SSR",
};

const useTimingLabel: Record<SupplyUiLabUseTiming, string> = {
  today: "今日生效，可在当天结算前使用",
  instant: "立即生效，兑换后进入背包预览",
  manual_redemption: "提交申请后等待管理员确认",
};

function formatLimit(item: (typeof supplyUiLabCatalog)[number]) {
  if (item.shop.dailyLimit !== undefined) {
    return `每日限购 ${item.shop.dailyLimit} 次`;
  }

  if (item.shop.weeklyLimit !== undefined) {
    return `每周限购 ${item.shop.weeklyLimit} 次`;
  }

  return "不限购";
}

function buildProduct(item: (typeof supplyUiLabCatalog)[number], index: number): SupplyShopProduct {
  const categoryLabel = categoryTagLabel[item.category];
  const limitLabel = formatLimit(item);

  return {
    id: item.sourceItemId,
    name: item.name,
    subtitle: item.effectSummary,
    categoryId: item.category,
    categoryLabel,
    image: item.media.image,
    rarity: item.rarity,
    tags: [
      rarityTagLabel[item.rarity],
      categoryLabel,
      limitLabel,
      ...(item.shop.requiresAdminConfirmation ? ["需要管理员确认"] : []),
    ],
    price: {
      currency: "coins",
      amount: item.shop.priceCoins,
    },
    ownedQuantity: item.inventory.quantity,
    sourceLabel: "来源：抽奖池 / 商店",
    limitLabel,
    requiresAdminConfirmation: item.shop.requiresAdminConfirmation,
    selected: index === 0,
  };
}

function buildProductDetail(item: (typeof supplyUiLabCatalog)[number]): SupplyShopProductDetail {
  const adminConfirmationLabel = item.shop.requiresAdminConfirmation
    ? "真实福利：兑换后进入管理员确认流程"
    : null;
  const redeemState = item.shop.requiresAdminConfirmation
    ? "adminConfirmation"
    : item.sourceItemId === "double_niuma_coupon"
      ? "limitReached"
      : "available";

  return {
    productId: item.sourceItemId,
    description: item.description,
    effect: item.effectSummary,
    useTiming: useTimingLabel[item.useTiming],
    useTimingId: item.useTiming,
    purchaseLimit: formatLimit(item),
    costLabel: `银子 ${item.shop.priceCoins}`,
    sourceLabel: "来源：抽奖池 / 商店",
    ownedLabel: `持有 ${item.inventory.quantity}`,
    adminConfirmationLabel,
    footnote: item.shop.requiresAdminConfirmation
      ? "真实福利不会直接发放到背包，本页只展示提交后的本地状态。"
      : "虚拟道具兑换后会展示本地加入背包反馈，刷新后不会保留。",
    redeemLabel: item.shop.requiresAdminConfirmation ? "申请兑换" : `兑换 ${item.name}`,
    redeemFeedback: item.shop.requiresAdminConfirmation
      ? "兑换中：已提交管理员确认"
      : redeemState === "limitReached"
        ? "今日预览：该稀有道具本周限购已达上限"
      : `已加入背包：${item.name}`,
    redeemState,
    redeemDisabledReason: redeemState === "limitReached" ? "本周限购已达上限" : undefined,
  };
}

const buyableCatalogItems = supplyUiLabCatalog.filter((item) => item.shop.buyable);
const products = buyableCatalogItems.map(buildProduct);
const productDetails = buyableCatalogItems.map(buildProductDetail);

const categories: SupplyShopCategory[] = categoryOrder.map((categoryId, index) => ({
  id: categoryId,
  label: categoryMeta[categoryId].label,
  icon: categoryMeta[categoryId].icon,
  iconImage: categoryMeta[categoryId].iconImage,
  active: index === 0,
}));

const filters: SupplyShopFilter[] = [
  { id: "all", label: "全部", active: true },
  { id: "redeemable", label: "可兑换", active: false },
  { id: "owned", label: "已拥有", active: false },
  { id: "admin", label: "需确认", active: false },
];

export const supplyShopMock: SupplyShopPreview = {
  topBar: {
    resources: supplyUiLabResources.shop,
    profile: {
      username: "Vincent",
      avatar: supplyShopAssetPaths.profileAvatar,
    },
  },
  sidebar: {
    categories,
    resources: supplyUiLabResources.shop,
  },
  filters,
  products,
  productDetails,
  selectedProductDetail: productDetails[0],
  notice: "商店商品与抽奖池 active 道具保持一致，当前页面仅做本地兑换预览。",
  rules: [
    "商品来源统一为共享 catalog，银子奖励不会作为商品出售。",
    "虚拟道具点击兑换后只展示已加入背包的本地反馈。",
    "真实福利类商品会进入管理员确认，本页只展示兑换中的本地状态。",
  ],
  initialFeedback: "本地预览：兑换不会写入后端。",
};
