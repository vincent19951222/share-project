import { taskCardIllustrationById } from "../task-cards/task-card-art";

export const supplyDashboardAssetPaths = {
  background: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_dashboard_gym_bg.webp",
  hero: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_niuma_hero.webp",
  levelAvatar: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_topbar_cow_logo.png",
  dockBackpack: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_dock_backpack.webp",
  dockSupplyMachine: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_dock_supply_machine.webp",
  dockTaskRecord: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_dashboard_dock_task_record.webp",
  fallbackLogo: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_logo.png",
  taskCards: {
    hydration: taskCardIllustrationById.hydration_003,
    movement: taskCardIllustrationById.movement_004,
    social: taskCardIllustrationById.social_001,
    learning: taskCardIllustrationById.learning_005,
  },
  rewardIcons: {
    coin: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_020.png",
    ticket: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_task_reroll_coupon.png",
    boost: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_small_boost_coupon.png",
  },
} as const;
