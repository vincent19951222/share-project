import type { SupplyUiLabCatalogCategory } from "./types";

export const supplyUiLabCategoryIcons = {
  all: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_all.png",
  boost: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_boost.png",
  protection: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_protection.png",
  real_world: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_real_world.png",
  social: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_social.png",
  task: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shop_categories_category_task.png",
} as const satisfies Record<"all" | SupplyUiLabCatalogCategory, string>;
