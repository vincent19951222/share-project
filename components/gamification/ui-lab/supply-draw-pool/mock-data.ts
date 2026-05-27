import {
  SUPPLY_UI_LAB_COIN_REWARD_ROWS,
  supplyUiLabCatalog,
  supplyUiLabCatalogBySourceItemId,
} from "../supply-data/catalog";
import { supplyUiLabResources } from "../supply-data/resources";
import type { SupplyUiLabCatalogItem, SupplyUiLabCoinRewardRow } from "../supply-data/types";
import { supplyDrawPoolAssetPaths } from "./assets";
import type { SupplyDrawPoolPreview, SupplyDrawPoolRewardRow } from "./types";

export { supplyDrawPoolAssetPaths };

const coinRewardToDrawRow = (row: SupplyUiLabCoinRewardRow): SupplyDrawPoolRewardRow => ({
  id: row.rewardId,
  tier: "coin",
  rarity: "N",
  name: row.name,
  quantityLabel: `银子 x${row.amount}`,
  image: row.image,
});

const catalogItemToDrawRow = (item: SupplyUiLabCatalogItem): SupplyDrawPoolRewardRow => ({
  id: item.sourceItemId,
  tier: item.drawPool.tier,
  rarity: item.rarity,
  name: item.name,
  quantityLabel: "x1",
  image: item.media.image,
});

const coinRows = SUPPLY_UI_LAB_COIN_REWARD_ROWS.map(coinRewardToDrawRow);
const catalogRows = supplyUiLabCatalog.map(catalogItemToDrawRow);
const catalogRowById = Object.fromEntries(catalogRows.map((row) => [row.id, row])) as Record<string, SupplyDrawPoolRewardRow>;

export const supplyDrawPoolMock: SupplyDrawPoolPreview = {
  media: {
    background: supplyDrawPoolAssetPaths.background,
    machine: supplyDrawPoolAssetPaths.drawPool.machine,
    capsuleBed: supplyDrawPoolAssetPaths.drawPool.capsuleBed,
    guideMascot: supplyDrawPoolAssetPaths.drawPool.guideMascot,
    wristband: supplyDrawPoolAssetPaths.drawPool.wristband,
    runningShoe: supplyDrawPoolAssetPaths.drawPool.runningShoe,
  },
  topBar: {
    resources: supplyUiLabResources.drawPool,
    closeHref: "/dashboard/status",
  },
  wallet: {
    ticketIcon: supplyDrawPoolAssetPaths.rewardIcons.ticket,
    ticketBalance: 18,
    dailyEarned: 18,
    dailyLimit: 30,
    helper: "今日获取上限：18/30 张抽奖券",
  },
  guide: {
    mascotImage: supplyDrawPoolAssetPaths.drawPool.guideMascot,
    message: "完成任务拿抽奖券，抽银子、道具和福利奖励！",
  },
  poolRates: [
    { tier: "coin", rarity: "银子", percent: 45, tone: "n" },
    { tier: "utility", rarity: "实用", percent: 27, tone: "r" },
    { tier: "social", rarity: "社交", percent: 24, tone: "sr" },
    { tier: "rare", rarity: "稀有", percent: 4, tone: "ssr" },
  ],
  machine: {
    title: "补给抽卡机",
    emblemImage: supplyDrawPoolAssetPaths.cowLogo,
    actions: [
      { id: "single", label: "单抽", drawCount: 1, costTicket: 1, tone: "single", guaranteeLabel: "单抽无保底" },
      { id: "ten", label: "十连", drawCount: 10, costTicket: 10, tone: "ten", guaranteeLabel: "十连批次保底" },
    ],
  },
  guarantee: {
    title: "十连保底说明",
    description: "单抽没有保底；十连批次如果自然结果没有实用、社交或稀有奖励，则补 1 个合格奖励。",
    eligibleTiers: ["utility", "social", "rare"],
    eligibleTierLabels: ["实用", "社交", "稀有"],
  },
  recentDrops: [
    coinRewardToDrawRow(SUPPLY_UI_LAB_COIN_REWARD_ROWS[5]),
    catalogRowById.double_niuma_coupon,
    catalogRowById.team_broadcast_coupon,
    coinRewardToDrawRow(SUPPLY_UI_LAB_COIN_REWARD_ROWS[2]),
    catalogRowById.luckin_coffee_coupon,
    catalogRowById.drink_water_ping,
  ],
  singleDrawResult: [coinRewardToDrawRow(SUPPLY_UI_LAB_COIN_REWARD_ROWS[2])],
  tenDrawResult: [
    coinRows[0],
    coinRows[1],
    catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.drink_water_ping),
    coinRows[2],
    catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.walk_ping),
    coinRows[3],
    catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.task_reroll_coupon),
    catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.team_broadcast_coupon),
    coinRows[4],
    catalogItemToDrawRow(supplyUiLabCatalogBySourceItemId.luckin_coffee_coupon),
  ],
  emptyDrawMessage: "抽奖券不足，先完成今日主线获取更多。",
  rules: [
    "消耗抽奖券进行抽取，随机获得银子、实用道具、社交道具或稀有奖励。",
    "单抽没有保底。",
    "十连批次如果自然十连没有实用、社交或稀有奖励，则补 1 个合格奖励。",
  ],
  probabilityHref: "/docs?tab=rules#supply-station-probability",
  recordsHref: "/dashboard/quest",
  backHref: "/dashboard/status",
};
