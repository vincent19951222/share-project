import { taskCardIllustrationById } from "../task-cards/task-card-art";

export const supplyDashboardAssetPaths = {
  background: "/assets/home-scenes/supply/dashboard/dashboard-gym-bg.webp",
  hero: "/assets/home-scenes/supply/dashboard/niuma-hero.webp",
  levelAvatar: "/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png",
  dockBackpack: "/assets/home-scenes/supply/dashboard/dock-backpack.webp",
  dockSupplyMachine: "/assets/home-scenes/supply/dashboard/dock-supply-machine.webp",
  dockTaskRecord: "/assets/home-scenes/supply/dashboard/dock-task-record.webp",
  fallbackLogo: "/logo.png",
  taskCards: {
    hydration: taskCardIllustrationById.hydration_003,
    movement: taskCardIllustrationById.movement_004,
    social: taskCardIllustrationById.social_001,
    learning: taskCardIllustrationById.learning_005,
  },
  rewardIcons: {
    coin: "/gamification/rewards/icons/coins_020.png",
    ticket: "/gamification/rewards/icons/task_reroll_coupon.png",
    boost: "/gamification/rewards/icons/small_boost_coupon.png",
  },
} as const;
