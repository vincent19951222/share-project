import type { SupplyDrawPoolPreview } from "./types";

export const supplyDrawPoolAssetPaths = {
  logo: "/logo.png",
  background: "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
  drawPool: {
    machine: "/assets/home-scenes/supply/draw-pool/draw-pool-machine.png",
    capsuleBed: "/assets/home-scenes/supply/draw-pool/draw-pool-capsule-bed.webp",
    guideMascot: "/assets/home-scenes/supply/draw-pool/draw-pool-guide-mascot.webp",
    wristband: "/assets/home-scenes/supply/draw-pool/draw-pool-wristband.webp",
    runningShoe: "/assets/home-scenes/supply/draw-pool/draw-pool-running-shoe.webp",
  },
  rewardIcons: {
    ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
    coins: "/gamification/rewards/icons/coins_120.png",
    exp: "/gamification/rewards/icons/small_boost_coupon.png",
    coffee: "/gamification/rewards/icons/luckin_coffee_coupon.png",
    social: "/gamification/rewards/icons/team_broadcast_coupon.png",
  },
} as const;

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
    resources: [
      { id: "ticket", label: "抽奖券", value: "18", icon: "券" },
      { id: "coins", label: "银子", value: "2,450", icon: "◎" },
    ],
    closeHref: "/ui-lab/supply-dashboard",
  },
  wallet: {
    ticketIcon: supplyDrawPoolAssetPaths.rewardIcons.ticket,
    ticketBalance: 18,
    dailyEarned: 18,
    dailyLimit: 30,
    helper: "今日获取上限：18/30 张",
    actions: [
      { id: "more-tickets", label: "获取更多抽奖券", tone: "primary" },
      { id: "tasks", label: "前往任务", tone: "secondary" },
    ],
  },
  guide: {
    mascotImage: supplyDrawPoolAssetPaths.drawPool.guideMascot,
    message: "完成任务获取抽奖券，抽取道具、效果或补给券！",
    actionLabel: "去完成",
  },
  poolRates: [
    { rarity: "SSR", percent: 3, tone: "ssr" },
    { rarity: "SR", percent: 17, tone: "sr" },
    { rarity: "R", percent: 35, tone: "r" },
    { rarity: "N", percent: 45, tone: "n" },
  ],
  machine: {
    title: "补给抽卡机",
    emblemImage: supplyDrawPoolAssetPaths.logo,
    skipAnimation: false,
    actions: [
      { id: "single", label: "单抽 x1", drawCount: 1, costTicket: 1, tone: "single" },
      { id: "ten", label: "十连 x10", drawCount: 10, costTicket: 10, tone: "ten", guaranteeLabel: "必出 SR 或以上" },
    ],
  },
  pity: {
    remainingDraws: 22,
    guaranteeLabel: "SR 或以上",
    current: 48,
    target: 70,
    rewardImage: supplyDrawPoolAssetPaths.rewardIcons.ticket,
  },
  recentDrops: [
    { id: "coins-200", rarity: "SSR", name: "银子", quantityLabel: "x200", image: supplyDrawPoolAssetPaths.rewardIcons.coins },
    { id: "wristband", rarity: "SR", name: "运动护腕", quantityLabel: "x6", image: supplyDrawPoolAssetPaths.drawPool.wristband },
    { id: "exp-card", rarity: "R", name: "经验加成券", quantityLabel: "x2", image: supplyDrawPoolAssetPaths.rewardIcons.exp },
    { id: "coffee", rarity: "R", name: "咖啡兑换券", quantityLabel: "x1", image: supplyDrawPoolAssetPaths.rewardIcons.coffee },
    { id: "running-shoe", rarity: "SR", name: "疾风跑鞋", quantityLabel: "x1", image: supplyDrawPoolAssetPaths.drawPool.runningShoe },
    { id: "social", rarity: "R", name: "社交互动券", quantityLabel: "x1", image: supplyDrawPoolAssetPaths.rewardIcons.social },
  ],
  rules: [
    "消耗抽奖券进行抽取，随机获得道具、效果或补给券。",
    "十连抽必出 SR 或以上奖励。",
    "抽奖券可通过完成任务获得。",
  ],
  probabilityHref: "/docs?tab=rules#supply-station-probability",
  recordsHref: "/ui-lab/supply-dashboard/task-record",
  backHref: "/ui-lab/supply-dashboard",
};
