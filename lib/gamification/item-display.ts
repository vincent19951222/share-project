import type {
  ItemCategory,
  ItemDefinition,
  ItemEffect,
  ItemUseTiming,
} from "@/content/gamification/types";
import type {
  GamificationBackpackCategory,
  GamificationItemUseTiming,
} from "@/lib/types";

export const BACKPACK_CATEGORY_ORDER: GamificationBackpackCategory[] = [
  "boost",
  "protection",
  "social",
  "lottery",
  "task",
  "cosmetic",
  "real_world",
  "unknown",
];

export function normalizeBackpackCategory(
  category: ItemCategory | undefined,
): GamificationBackpackCategory {
  if (
    category === "boost" ||
    category === "protection" ||
    category === "social" ||
    category === "lottery" ||
    category === "task" ||
    category === "cosmetic" ||
    category === "real_world"
  ) {
    return category;
  }

  return "unknown";
}

export function getBackpackCategoryLabel(category: GamificationBackpackCategory) {
  switch (category) {
    case "boost":
      return "暴击增益";
    case "protection":
      return "请假保护";
    case "social":
      return "弱社交";
    case "lottery":
      return "抽奖辅助";
    case "task":
      return "任务辅助";
    case "cosmetic":
      return "趣味收藏";
    case "real_world":
      return "真实福利";
    case "unknown":
      return "未知补给";
  }
}

export function normalizeUseTiming(
  useTiming: ItemUseTiming | undefined,
): GamificationItemUseTiming {
  if (useTiming === "today" || useTiming === "instant" || useTiming === "manual_redemption") {
    return useTiming;
  }

  return "unknown";
}

export function getUseTimingLabel(useTiming: GamificationItemUseTiming) {
  switch (useTiming) {
    case "today":
      return "今日生效";
    case "instant":
      return "立即生效";
    case "manual_redemption":
      return "手动兑换";
    case "unknown":
      return "未知时机";
  }
}

export function summarizeItemEffect(effect: ItemEffect | unknown): string {
  if (!effect || typeof effect !== "object" || !("type" in effect)) {
    return "配置缺失，暂不可使用。";
  }

  const itemEffect = effect as ItemEffect;

  switch (itemEffect.type) {
    case "fitness_coin_multiplier":
      return `当日真实健身打卡个人资产 ${itemEffect.multiplier}x。`;
    case "fitness_season_multiplier":
      return `当日真实健身打卡赛季贡献 ${itemEffect.multiplier}x。`;
    case "fitness_coin_and_season_multiplier":
      return `当日真实健身打卡个人资产和赛季贡献 ${itemEffect.multiplier}x。`;
    case "task_reroll":
      return "把当天一个四维任务换成同维度另一张卡。";
    case "lottery_guarantee":
      return itemEffect.appliesTo === "single"
        ? "下一次单抽至少不低于指定奖励层级。"
        : "下一次十连至少不低于指定奖励层级。";
    case "ticket_discount":
      return `抽奖补券享受 ${(itemEffect.discountRate * 10).toFixed(1)} 折。`;
    case "social_invitation":
      return "发起一次轻量团队互动邀请。";
    case "leave_protection":
      return "当天无法健身时保护连续记录不断联，并冻结下一次真实健身奖励档位。";
    case "real_world_redemption":
      return "可向管理员申请线下兑换真实福利。";
    case "dimension_coin_bonus":
      return `今天完成指定四维任务后额外获得 ${itemEffect.amount} 银子。`;
    case "cosmetic":
      return "用于趣味展示，不影响经济结算。";
  }
}

export function summarizeUsageLimit(item: ItemDefinition | undefined): string {
  if (!item) {
    return "配置缺失，暂不可使用。";
  }

  const parts: string[] = [];

  parts.push(item.stackable ? "可叠加持有" : "不可叠加使用");

  if (item.maxUsePerUserPerDay) {
    parts.push(`每人每天最多 ${item.maxUsePerUserPerDay} 次`);
  }
  if (item.maxUsePerUserPerWeek) {
    parts.push(`每人每周最多 ${item.maxUsePerUserPerWeek} 次`);
  }
  if (item.maxUsePerTeamPerDay) {
    parts.push(`每队每天最多 ${item.maxUsePerTeamPerDay} 次`);
  }
  if (item.requiresAdminConfirmation) {
    parts.push("需要管理员确认");
  }

  return parts.join("；");
}

export function getItemUseStatusLabel(status: string) {
  switch (status) {
    case "PENDING":
      return "今日待生效";
    case "SETTLED":
      return "今日已结算";
    case "EXPIRED":
      return "已过期";
    case "CANCELLED":
      return "已取消";
    default:
      return "未知状态";
  }
}
