import type {
  SupplyUiLabAssetStatus,
  SupplyUiLabCatalogItem,
  SupplyUiLabCoinRewardRow,
} from "./types";

export const SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS = [
  "task_reroll_coupon",
  "small_boost_coupon",
  "fitness_leave_coupon",
  "drink_water_ping",
  "walk_ping",
  "team_standup_ping",
  "chat_ping",
  "share_info_ping",
  "team_broadcast_coupon",
  "double_niuma_coupon",
  "season_sprint_coupon",
  "luckin_coffee_coupon",
] as const;

export type SupplyUiLabActiveNonCoinRewardItemId =
  (typeof SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS)[number];

const COS_IMAGE_BASE = "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images";

const rewardIcon = (sourceItemId: string) =>
  `${COS_IMAGE_BASE}/share_project_public_gamification_rewards_icons_${sourceItemId}.png`;
const generatedItemAsset = (fileName: string) =>
  `${COS_IMAGE_BASE}/share_project_public_assets_home_scenes_supply_items_${fileName.replaceAll("-", "_")}.webp`;

export const SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS = [
  "fitness_leave_coupon",
  "drink_water_ping",
  "walk_ping",
  "team_standup_ping",
  "chat_ping",
  "share_info_ping",
  "double_niuma_coupon",
  "season_sprint_coupon",
] as const;

export type SupplyUiLabGeneratedItemAssetId =
  (typeof SUPPLY_UI_LAB_GENERATED_ITEM_ASSET_IDS)[number];

export const SUPPLY_UI_LAB_ITEM_MEDIA = {
  task_reroll_coupon: {
    image: rewardIcon("task_reroll_coupon"),
    assetStatus: "existing",
  },
  small_boost_coupon: {
    image: rewardIcon("small_boost_coupon"),
    assetStatus: "existing",
  },
  fitness_leave_coupon: {
    image: generatedItemAsset("fitness-leave-coupon"),
    assetStatus: "needs_generated",
  },
  drink_water_ping: {
    image: generatedItemAsset("drink-water-ping"),
    assetStatus: "needs_generated",
  },
  walk_ping: {
    image: generatedItemAsset("walk-ping"),
    assetStatus: "needs_generated",
  },
  team_standup_ping: {
    image: generatedItemAsset("team-standup-ping"),
    assetStatus: "needs_generated",
  },
  chat_ping: {
    image: generatedItemAsset("chat-ping"),
    assetStatus: "needs_generated",
  },
  share_info_ping: {
    image: generatedItemAsset("share-info-ping"),
    assetStatus: "needs_generated",
  },
  team_broadcast_coupon: {
    image: rewardIcon("team_broadcast_coupon"),
    assetStatus: "existing",
  },
  double_niuma_coupon: {
    image: generatedItemAsset("double-niuma-coupon"),
    assetStatus: "needs_generated",
  },
  season_sprint_coupon: {
    image: generatedItemAsset("season-sprint-coupon"),
    assetStatus: "needs_generated",
  },
  luckin_coffee_coupon: {
    image: rewardIcon("luckin_coffee_coupon"),
    assetStatus: "existing",
  },
} satisfies Record<
  SupplyUiLabActiveNonCoinRewardItemId,
  {
    image: string;
    assetStatus: SupplyUiLabAssetStatus;
  }
>;

export const SUPPLY_UI_LAB_COIN_REWARD_ROWS: SupplyUiLabCoinRewardRow[] = [
  {
    rewardId: "coins_005",
    name: "摸鱼津贴",
    amount: 5,
    weightLabel: "权重 15",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_005.png",
  },
  {
    rewardId: "coins_010",
    name: "工位补贴",
    amount: 10,
    weightLabel: "权重 12",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_010.png",
  },
  {
    rewardId: "coins_020",
    name: "今日没白来",
    amount: 20,
    weightLabel: "权重 10",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_020.png",
  },
  {
    rewardId: "coins_040",
    name: "老板没发现",
    amount: 40,
    weightLabel: "权重 5",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_040.png",
  },
  {
    rewardId: "coins_080",
    name: "小发一笔",
    amount: 80,
    weightLabel: "权重 2",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_080.png",
  },
  {
    rewardId: "coins_120",
    name: "牛马暴富",
    amount: 120,
    weightLabel: "权重 1",
    image: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_120.png",
  },
];

const catalogData = {
  task_reroll_coupon: {
    id: "catalog-task-reroll",
    sourceRewardId: "reward_task_reroll",
    name: "任务换班券",
    category: "task",
    rarity: "R",
    description: "把当天一个四维任务换成同维度另一张卡。",
    effectSummary: "同维度更换 1 个今日主线任务",
    useTiming: "instant",
    priceCoins: 150,
    dailyLimit: 1,
    tier: "utility",
    weightLabel: "权重 10",
    quantity: 2,
    selected: true,
  },
  small_boost_coupon: {
    id: "catalog-small-boost",
    sourceRewardId: "reward_small_boost",
    name: "小暴击券",
    category: "boost",
    rarity: "R",
    description: "当日真实健身打卡个人资产 1.5x，不影响赛季贡献。",
    effectSummary: "今日个人银子收益 1.5x",
    useTiming: "today",
    priceCoins: 220,
    dailyLimit: 1,
    tier: "utility",
    weightLabel: "权重 9",
    quantity: 3,
    selected: false,
  },
  fitness_leave_coupon: {
    id: "catalog-fitness-leave",
    sourceRewardId: "reward_fitness_leave",
    name: "健身请假券",
    category: "protection",
    rarity: "R",
    description: "当天无法健身时保护连续记录不掉线，并冻结下一次真实健身奖励档位。",
    effectSummary: "保护连续记录，不发银子，不推进赛季",
    useTiming: "today",
    priceCoins: 260,
    dailyLimit: 1,
    tier: "utility",
    weightLabel: "权重 8",
    quantity: 1,
    selected: false,
  },
  drink_water_ping: {
    id: "catalog-drink-water",
    sourceRewardId: "reward_drink_water_ping",
    name: "点名喝水令",
    category: "social",
    rarity: "N",
    description: "点名一位成员喝水，对方确认后生成响应记录。",
    effectSummary: "发起 1 次喝水提醒",
    useTiming: "instant",
    priceCoins: 80,
    dailyLimit: 2,
    tier: "social",
    weightLabel: "权重 5",
    quantity: 6,
    selected: false,
  },
  walk_ping: {
    id: "catalog-walk",
    sourceRewardId: "reward_walk_ping",
    name: "出门溜达令",
    category: "social",
    rarity: "N",
    description: "邀请一位成员起身走一圈，对方确认后生成轻动态。",
    effectSummary: "发起 1 次起身活动邀请",
    useTiming: "instant",
    priceCoins: 80,
    dailyLimit: 2,
    tier: "social",
    weightLabel: "权重 5",
    quantity: 5,
    selected: false,
  },
  team_standup_ping: {
    id: "catalog-team-standup",
    sourceRewardId: "reward_team_standup_ping",
    name: "全员起立令",
    category: "social",
    rarity: "R",
    description: "发起一次全队起身提醒，记录当天响应人数。",
    effectSummary: "发起 1 次全队起身提醒",
    useTiming: "instant",
    priceCoins: 180,
    dailyLimit: 1,
    tier: "social",
    weightLabel: "权重 4",
    quantity: 2,
    selected: false,
  },
  chat_ping: {
    id: "catalog-chat",
    sourceRewardId: "reward_chat_ping",
    name: "今日闲聊令",
    category: "social",
    rarity: "N",
    description: "邀请一位成员完成“把事办黄”，双方完成后生成响应记录。",
    effectSummary: "发起 1 次闲聊互动",
    useTiming: "instant",
    priceCoins: 90,
    dailyLimit: 2,
    tier: "social",
    weightLabel: "权重 4",
    quantity: 4,
    selected: false,
  },
  share_info_ping: {
    id: "catalog-share-info",
    sourceRewardId: "reward_share_info_ping",
    name: "红盘情报令",
    category: "social",
    rarity: "N",
    description: "点名一位成员分享今天看到的新东西，完成后进入今日小摘要。",
    effectSummary: "发起 1 次信息分享邀请",
    useTiming: "instant",
    priceCoins: 90,
    dailyLimit: 2,
    tier: "social",
    weightLabel: "权重 4",
    quantity: 4,
    selected: false,
  },
  team_broadcast_coupon: {
    id: "catalog-team-broadcast",
    sourceRewardId: "reward_team_broadcast",
    name: "团队小喇叭",
    category: "social",
    rarity: "R",
    description: "把一句轻量播报发到团队动态或后续摘要。",
    effectSummary: "发布 1 条团队轻量播报",
    useTiming: "instant",
    priceCoins: 200,
    dailyLimit: 1,
    tier: "social",
    weightLabel: "权重 2",
    quantity: 1,
    selected: false,
  },
  double_niuma_coupon: {
    id: "catalog-double-niuma",
    sourceRewardId: "reward_double_niuma",
    name: "双倍牛马券",
    category: "boost",
    rarity: "SSR",
    description: "当日真实健身打卡个人资产 2x，赛季贡献 2x。",
    effectSummary: "今日银子和赛季贡献双倍",
    useTiming: "today",
    priceCoins: 600,
    weeklyLimit: 1,
    tier: "rare",
    weightLabel: "权重 2",
    quantity: 1,
    selected: false,
  },
  season_sprint_coupon: {
    id: "catalog-season-sprint",
    sourceRewardId: "reward_season_sprint",
    name: "赛季冲刺券",
    category: "boost",
    rarity: "SSR",
    description: "当日真实健身打卡赛季贡献 2x。",
    effectSummary: "今日赛季贡献双倍",
    useTiming: "today",
    priceCoins: 520,
    weeklyLimit: 1,
    tier: "rare",
    weightLabel: "权重 1",
    quantity: 1,
    selected: false,
  },
  luckin_coffee_coupon: {
    id: "catalog-luckin-coffee",
    sourceRewardId: "reward_luckin_coffee",
    name: "瑞幸咖啡券",
    category: "real_world",
    rarity: "SSR",
    description: "可找管理员线下兑换一杯瑞幸咖啡。",
    effectSummary: "管理员确认后兑换 1 杯瑞幸咖啡",
    useTiming: "manual_redemption",
    priceCoins: 500,
    dailyLimit: 1,
    tier: "rare",
    weightLabel: "权重 1",
    quantity: 1,
    selected: false,
  },
} satisfies Record<
  SupplyUiLabActiveNonCoinRewardItemId,
  Omit<
    SupplyUiLabCatalogItem,
    "sourceItemId" | "obtainSources" | "shop" | "drawPool" | "inventory" | "media"
  > & {
    priceCoins: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    tier: SupplyUiLabCatalogItem["drawPool"]["tier"];
    weightLabel: string;
    quantity: number;
    selected: boolean;
  }
>;

export const supplyUiLabCatalog: SupplyUiLabCatalogItem[] =
  SUPPLY_UI_LAB_ACTIVE_NON_COIN_REWARD_ITEM_IDS.map((sourceItemId) => {
    const item = catalogData[sourceItemId];

    return {
      id: item.id,
      sourceItemId,
      sourceRewardId: item.sourceRewardId,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      description: item.description,
      effectSummary: item.effectSummary,
      useTiming: item.useTiming,
      obtainSources: ["draw_pool", "shop"],
      shop: {
        buyable: true,
        priceCoins: item.priceCoins,
        dailyLimit: "dailyLimit" in item ? item.dailyLimit : undefined,
        weeklyLimit: "weeklyLimit" in item ? item.weeklyLimit : undefined,
        requiresAdminConfirmation: sourceItemId === "luckin_coffee_coupon",
      },
      drawPool: {
        drawable: true,
        tier: item.tier,
        weightLabel: item.weightLabel,
      },
      inventory: {
        quantity: item.quantity,
        selected: item.selected,
      },
      media: SUPPLY_UI_LAB_ITEM_MEDIA[sourceItemId],
    };
  });

export const supplyUiLabCatalogBySourceItemId = Object.fromEntries(
  supplyUiLabCatalog.map((item) => [item.sourceItemId, item]),
) as Record<SupplyUiLabActiveNonCoinRewardItemId, SupplyUiLabCatalogItem>;
