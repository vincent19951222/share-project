import type { AppTab } from "@/lib/types";

export type AiImagePanelKey = "studio" | "themes" | "artworks";

export const aiImagePanelRoutes: Record<AiImagePanelKey, string> = {
  studio: "/ai-image",
  themes: "/ai-image?view=themes",
  artworks: "/ai-image?view=artworks",
};

/** @deprecated Kept only for dormant legacy supply components. */
export type SupplyPanelKey = "studio" | "themeGacha" | "artworks" | "legacyArchive";

export type SupplyNavResourceId = "coins";

export interface SupplyNavResource {
  id: SupplyNavResourceId;
  label: "银子";
  value: number;
  maxValue?: number;
  iconImage: string;
}

export interface SupplyNavSocialContext {
  pendingCount: number;
  latestLabel: string | null;
}

export interface SupplyNavContext {
  resources: SupplyNavResource[];
  profile: {
    username: string;
    avatarKey: string;
  };
  social: SupplyNavSocialContext;
}

export interface SupplyNavItem {
  id: SupplyPanelKey;
  label: string;
  iconImage: string;
  route: string;
}

export const appTabRoutes: Record<AppTab, string> = {
  punch: "/",
  board: "/board",
  coffee: "/drink",
  data: "/calendar",
};

export const supplyPanelRoutes: Record<SupplyPanelKey, string> = {
  studio: "/dashboard/status",
  themeGacha: "/dashboard/cards",
  artworks: "/dashboard/backpack",
  legacyArchive: "/dashboard/store",
};

export const supplyNavItems: SupplyNavItem[] = [
  {
    id: "studio",
    label: "生图工位",
    iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_status.png",
    route: supplyPanelRoutes.studio,
  },
  {
    id: "themeGacha",
    label: "主题扭蛋",
    iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_shop.png",
    route: supplyPanelRoutes.themeGacha,
  },
  {
    id: "artworks",
    label: "作品库",
    iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_task_record.png",
    route: supplyPanelRoutes.artworks,
  },
  {
    id: "legacyArchive",
    label: "旧补给归档",
    iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_backpack.png",
    route: supplyPanelRoutes.legacyArchive,
  },
];
