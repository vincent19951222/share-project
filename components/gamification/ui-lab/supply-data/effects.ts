import { supplyUiLabCatalogBySourceItemId } from "./catalog";
import type { SupplyUiLabActiveEffect } from "./types";

const smallBoost = supplyUiLabCatalogBySourceItemId.small_boost_coupon;
const seasonSprint = supplyUiLabCatalogBySourceItemId.season_sprint_coupon;

export const supplyUiLabActiveEffects: SupplyUiLabActiveEffect[] = [
  {
    id: "today-effect-small-boost",
    sourceItemId: "small_boost_coupon",
    label: smallBoost.name,
    effectSummary: smallBoost.effectSummary,
    businessSource: "来自背包道具 small_boost_coupon，等待今日健身打卡时结算",
    status: "pending",
    statusLabel: "今日待生效",
    endsAtLabel: "今日 23:59",
    icon: smallBoost.media.image,
  },
  {
    id: "today-effect-season-sprint",
    sourceItemId: "season_sprint_coupon",
    label: seasonSprint.name,
    effectSummary: seasonSprint.effectSummary,
    businessSource: "来自背包道具 season_sprint_coupon，今日赛季贡献结算已启用",
    status: "active",
    statusLabel: "今日已生效",
    endsAtLabel: "今日 23:59",
    icon: seasonSprint.media.image,
  },
];
