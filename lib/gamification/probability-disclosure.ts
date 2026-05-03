import type {
  ItemDefinition,
  RewardDefinition,
  RewardEffect,
  RewardKind,
  RewardRarity,
  RewardTier,
} from "@/content/gamification/types";
import { getItemDefinitions, getRewardDefinitions } from "@/lib/gamification/content";

const TIER_ORDER: RewardTier[] = ["coin", "utility", "social", "cosmetic", "rare"];

const INACTIVE_ITEM_NOTE_IDS = [
  "single_draw_guarantee_coupon",
  "ticket_discount_90",
  "hydration_bonus",
  "movement_bonus",
] as const;

export const GAMIFICATION_PROBABILITY_REQUIRED_FACTS = [
  "active_reward_total_weight=100",
  "active_reward_tier_weights=coin45_utility27_social24_cosmetic0_rare4",
  "direct_coin_ev=8.75",
  "probability_disclosure_weights_are_relative",
  "disabled_rewards_not_drawable",
  "unsupported_items_not_in_active_pool",
] as const;

export interface GamificationProbabilityTierWeight {
  tier: RewardTier;
  weight: number;
  probabilityLabel: string;
}

export interface GamificationProbabilityRewardRow {
  id: string;
  tier: RewardTier;
  kind: RewardKind;
  rarity: RewardRarity;
  name: string;
  description: string;
  weight: number;
  probability: number;
  probabilityLabel: string;
  effectSummary: string;
}

export interface GamificationProbabilityInactiveItemNote {
  itemId: string;
  itemName: string;
  reason: string;
}

export interface GamificationProbabilityDisclosure {
  activeTotalWeight: number;
  tierWeights: GamificationProbabilityTierWeight[];
  directCoinExpectedValue: number;
  activeRewards: GamificationProbabilityRewardRow[];
  disabledRewards: GamificationProbabilityRewardRow[];
  inactiveItemNotes: GamificationProbabilityInactiveItemNote[];
  notes: string[];
  requiredFacts: string[];
}

function formatProbability(probability: number) {
  if (probability === 0) {
    return "0%";
  }

  const percent = probability * 100;

  return `${Number.isInteger(percent) ? percent : Number(percent.toFixed(2))}%`;
}

function rewardEffectSummary(effect: RewardEffect, itemNameById: Map<string, string>) {
  switch (effect.type) {
    case "grant_coins":
      return `获得 ${effect.amount} 银子`;
    case "grant_item":
      return `获得 ${effect.quantity} 个${itemNameById.get(effect.itemId) ?? effect.itemId}`;
    case "grant_real_world_redemption":
      return `获得 ${effect.quantity} 个${itemNameById.get(effect.itemId) ?? effect.itemId}兑换资格`;
    case "grant_title":
      return `获得称号 ${effect.titleId}`;
  }
}

function toRewardRow(
  reward: RewardDefinition,
  activeTotalWeight: number,
  itemNameById: Map<string, string>,
): GamificationProbabilityRewardRow {
  const probability = reward.enabled && activeTotalWeight > 0 ? reward.weight / activeTotalWeight : 0;

  return {
    id: reward.id,
    tier: reward.tier,
    kind: reward.kind,
    rarity: reward.rarity,
    name: reward.name,
    description: reward.description,
    weight: reward.weight,
    probability,
    probabilityLabel: formatProbability(probability),
    effectSummary: rewardEffectSummary(reward.effect, itemNameById),
  };
}

function inactiveItemReason(item: ItemDefinition) {
  switch (item.effect.type) {
    case "lottery_guarantee":
      return "道具定义已存在，但当前版本还没有接入使用闭环。";
    case "ticket_discount":
      return "道具定义已存在，但当前补券规则还没有接入折扣卡。";
    case "dimension_coin_bonus":
      return "道具定义已存在，但当前四维任务还没有接入维度加成结算。";
    default:
      return "当前版本未进入 active 奖池。";
  }
}

export function buildGamificationProbabilityDisclosure(): GamificationProbabilityDisclosure {
  const rewards = getRewardDefinitions();
  const items = getItemDefinitions();
  const itemNameById = new Map(items.map((item) => [item.id, item.name]));
  const activeRewards = rewards.filter((reward) => reward.enabled);
  const disabledRewards = rewards.filter((reward) => !reward.enabled);
  const activeTotalWeight = activeRewards.reduce((total, reward) => total + reward.weight, 0);
  const tierWeights = TIER_ORDER.map((tier) => {
    const weight = activeRewards
      .filter((reward) => reward.tier === tier)
      .reduce((total, reward) => total + reward.weight, 0);

    return {
      tier,
      weight,
      probabilityLabel: formatProbability(activeTotalWeight > 0 ? weight / activeTotalWeight : 0),
    };
  });
  const directCoinExpectedValue = activeRewards.reduce((total, reward) => {
    if (reward.effect.type !== "grant_coins" || activeTotalWeight === 0) {
      return total;
    }

    return total + (reward.weight / activeTotalWeight) * reward.effect.amount;
  }, 0);
  const inactiveItemNotes = INACTIVE_ITEM_NOTE_IDS.flatMap((itemId) => {
    const item = items.find((candidate) => candidate.id === itemId);

    return item
      ? [
          {
            itemId: item.id,
            itemName: item.name,
            reason: inactiveItemReason(item),
          },
        ]
      : [];
  });

  return {
    activeTotalWeight,
    tierWeights,
    directCoinExpectedValue,
    activeRewards: activeRewards.map((reward) => toRewardRow(reward, activeTotalWeight, itemNameById)),
    disabledRewards: disabledRewards.map((reward) => toRewardRow(reward, activeTotalWeight, itemNameById)),
    inactiveItemNotes,
    notes: [
      "当前 active 奖池总权重为 100，所以权重可以近似理解为长期概率百分比。",
      "单抽没有保底；十连保留 GM-06 的实用道具、弱社交道具或稀有以上奖励保底。",
      "抽奖能抽到银子，但直接银子期望低于补券成本，不设计为无限套利入口。",
      "disabled rewards 和未接入使用闭环的道具不会进入当前 active 奖池。",
    ],
    requiredFacts: [...GAMIFICATION_PROBABILITY_REQUIRED_FACTS],
  };
}
