import type { RewardDefinition } from "./types";

export const REWARD_ASSET_PROMPT_VERSION = "gm20-v1";

const TASK_REROLL_COUPON_PROMPT = [
  "Use case: background-extraction",
  "Asset type: transparent pixel-art inventory icon for 脱脂牛马 / 牛马补给站",
  "Primary request: Create a square pixel-art icon for 任务换班券. The object is a blue utility coupon ticket with a reroll arrow and tiny checklist marks, designed for a web game backpack item grid.",
  "Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.",
  "Subject: one standalone coupon ticket icon only.",
  "Style/medium: crisp pixel-art UI asset, black pixel outline, simple highlights, readable at small inventory size.",
  "Composition/framing: icon centered, 1:1 canvas, subject uses 60-70% of the canvas, generous padding.",
  "Color palette: blue utility accent, off-white ticket paper, black outline, small yellow highlight. Do not use #00ff00 anywhere in the subject.",
  "Text: no text.",
  "Constraints: no card frame, no rarity label, no quantity, no item name, no shadow, no watermark.",
  "Avoid: gradients, realistic paper texture, cinematic lighting, background objects, green inside the icon.",
].join("\n");

interface RewardAssetGenerationTrace {
  prompt: string;
  sourceImagePath: string;
  processing: string;
}

export interface RewardAssetDefinition {
  assetId: string;
  src: string;
  alt: string;
  promptVersion: typeof REWARD_ASSET_PROMPT_VERSION;
  status: "generated" | "planned";
  generationTrace?: RewardAssetGenerationTrace;
}

function defineAsset(
  assetId: string,
  alt: string,
  status: RewardAssetDefinition["status"],
  generationTrace?: RewardAssetGenerationTrace,
): RewardAssetDefinition {
  const asset: RewardAssetDefinition = {
    assetId,
    src: `/gamification/rewards/icons/${assetId}.png`,
    alt,
    promptVersion: REWARD_ASSET_PROMPT_VERSION,
    status,
  };

  if (generationTrace) {
    asset.generationTrace = generationTrace;
  }

  return asset;
}

export const REWARD_ASSETS: RewardAssetDefinition[] = [
  defineAsset("coins_005", "摸鱼津贴", "planned"),
  defineAsset("coins_010", "工位补贴", "planned"),
  defineAsset("coins_020", "今日没白来", "planned"),
  defineAsset("coins_040", "老板没发现", "planned"),
  defineAsset("coins_080", "小发一笔", "planned"),
  defineAsset("coins_120", "牛马暴富", "planned"),
  defineAsset("task_reroll_coupon", "任务换班券", "generated", {
    prompt: TASK_REROLL_COUPON_PROMPT,
    sourceImagePath:
      "/Users/vincent/.codex/generated_images/019de83d-dacf-73e3-af09-44cf6a33be05/ig_09b2caf270bbf26c0169f63531728481919789d4fd3a98e6fb.png",
    processing:
      "remove_chroma_key.py --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill",
  }),
  defineAsset("small_boost_coupon", "小暴击券", "planned"),
  defineAsset("fitness_leave_coupon", "健身请假券", "planned"),
  defineAsset("drink_water_ping", "点名喝水令", "planned"),
  defineAsset("walk_ping", "出门溜达令", "planned"),
  defineAsset("team_standup_ping", "全员起立令", "planned"),
  defineAsset("chat_ping", "今日闲聊令", "planned"),
  defineAsset("share_info_ping", "红盘情报令", "planned"),
  defineAsset("team_broadcast_coupon", "团队小喇叭", "planned"),
  defineAsset("double_niuma_coupon", "双倍牛马券", "planned"),
  defineAsset("season_sprint_coupon", "赛季冲刺券", "planned"),
  defineAsset("luckin_coffee_coupon", "瑞幸咖啡券", "planned"),
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
