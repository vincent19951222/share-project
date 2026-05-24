import type { SupplyUiLabCatalogCategory } from "./types";

export const supplyUiLabCategoryIcons = {
  all: "/assets/home-scenes/supply/shop/categories/category-all.png",
  boost: "/assets/home-scenes/supply/shop/categories/category-boost.png",
  protection: "/assets/home-scenes/supply/shop/categories/category-protection.png",
  real_world: "/assets/home-scenes/supply/shop/categories/category-real-world.png",
  social: "/assets/home-scenes/supply/shop/categories/category-social.png",
  task: "/assets/home-scenes/supply/shop/categories/category-task.png",
} as const satisfies Record<"all" | SupplyUiLabCatalogCategory, string>;
