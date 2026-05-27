export interface ShopCatalogItem {
  itemId: string;
  priceCoins: number;
  dailyLimit?: number;
  weeklyLimit?: number;
}

const SHOP_CATALOG_ITEMS: readonly ShopCatalogItem[] = [
  { itemId: "task_reroll_coupon", priceCoins: 150, dailyLimit: 1 },
  { itemId: "small_boost_coupon", priceCoins: 220, dailyLimit: 1 },
  { itemId: "fitness_leave_coupon", priceCoins: 260, dailyLimit: 1 },
  { itemId: "drink_water_ping", priceCoins: 80, dailyLimit: 2 },
  { itemId: "walk_ping", priceCoins: 80, dailyLimit: 2 },
  { itemId: "team_standup_ping", priceCoins: 180, dailyLimit: 1 },
  { itemId: "chat_ping", priceCoins: 90, dailyLimit: 2 },
  { itemId: "share_info_ping", priceCoins: 90, dailyLimit: 2 },
  { itemId: "team_broadcast_coupon", priceCoins: 200, dailyLimit: 1 },
  { itemId: "double_niuma_coupon", priceCoins: 600, weeklyLimit: 1 },
  { itemId: "season_sprint_coupon", priceCoins: 520, weeklyLimit: 1 },
  { itemId: "luckin_coffee_coupon", priceCoins: 500, dailyLimit: 1 },
];

export function getShopCatalogItems() {
  return SHOP_CATALOG_ITEMS;
}

export function getShopCatalogItem(itemId: string) {
  return SHOP_CATALOG_ITEMS.find((item) => item.itemId === itemId) ?? null;
}
