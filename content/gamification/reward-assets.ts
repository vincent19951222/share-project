import type { RewardDefinition } from "./types";

export const REWARD_ASSET_PROMPT_VERSION = "gm20-v1";

export interface RewardAssetDefinition {
  assetId: string;
  src: string;
  alt: string;
  promptVersion: typeof REWARD_ASSET_PROMPT_VERSION;
  status: "generated" | "planned";
}

function defineAsset(
  assetId: string,
  alt: string,
  status: RewardAssetDefinition["status"],
): RewardAssetDefinition {
  return {
    assetId,
    src: `/gamification/rewards/icons/${assetId}.png`,
    alt,
    promptVersion: REWARD_ASSET_PROMPT_VERSION,
    status,
  };
}

export const REWARD_ASSETS: RewardAssetDefinition[] = [
  defineAsset("coins_005", "摸鱼津贴", "generated"),
  defineAsset("coins_010", "工位补贴", "generated"),
  defineAsset("coins_020", "今日没白来", "generated"),
  defineAsset("coins_040", "老板没发现", "generated"),
  defineAsset("coins_080", "小发一笔", "generated"),
  defineAsset("coins_120", "牛马暴富", "generated"),
  defineAsset("task_reroll_coupon", "任务换班券", "generated"),
  defineAsset("small_boost_coupon", "小暴击券", "generated"),
  defineAsset("fitness_leave_coupon", "健身请假券", "generated"),
  defineAsset("drink_water_ping", "点名喝水令", "generated"),
  defineAsset("walk_ping", "出门溜达令", "generated"),
  defineAsset("team_standup_ping", "全员起立令", "generated"),
  defineAsset("chat_ping", "今日闲聊令", "generated"),
  defineAsset("share_info_ping", "红盘情报令", "generated"),
  defineAsset("team_broadcast_coupon", "团队小喇叭", "generated"),
  defineAsset("double_niuma_coupon", "双倍牛马券", "generated"),
  defineAsset("season_sprint_coupon", "赛季冲刺券", "generated"),
  defineAsset("luckin_coffee_coupon", "瑞幸咖啡券", "generated"),
];

const rewardAssetById = new Map(REWARD_ASSETS.map((asset) => [asset.assetId, asset]));

export function getRewardAssetId(reward: RewardDefinition) {
  if (reward.effect.type === "grant_item" || reward.effect.type === "grant_real_world_redemption") {
    return reward.effect.itemId;
  }

  return reward.id;
}

export function getRewardAsset(reward: RewardDefinition) {
  return rewardAssetById.get(getRewardAssetId(reward)) ?? null;
}
