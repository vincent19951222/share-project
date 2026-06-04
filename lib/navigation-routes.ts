import type { AppTab } from "@/lib/types";

export type SupplyPanelKey = "dashboard" | "drawPool" | "backpack" | "shop" | "taskRecord";

export type SupplyNavResourceId = "coins" | "ticket" | "backpack";

export interface SupplyNavResource {
  id: SupplyNavResourceId;
  label: "银子" | "抽奖券" | "背包";
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
  calendar: "/calendar",
  dash: "/report",
  supply: "/dashboard/status",
};

export const supplyPanelRoutes: Record<SupplyPanelKey, string> = {
  dashboard: "/dashboard/status",
  drawPool: "/dashboard/cards",
  backpack: "/dashboard/backpack",
  shop: "/dashboard/store",
  taskRecord: "/dashboard/quest",
};

export const supplyNavItems: SupplyNavItem[] = [
  {
    id: "dashboard",
    label: "我的状态",
    iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_status.png",
    route: supplyPanelRoutes.dashboard,
  },
  {
    id: "shop",
    label: "补给商店",
    iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_shop.png",
    route: supplyPanelRoutes.shop,
  },
  {
    id: "taskRecord",
    label: "任务记录",
    iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_task_record.png",
    route: supplyPanelRoutes.taskRecord,
  },
  {
    id: "backpack",
    label: "背包",
    iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_backpack.png",
    route: supplyPanelRoutes.backpack,
  },
  {
    id: "drawPool",
    label: "抽奖池",
    iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_draw_pool.png",
    route: supplyPanelRoutes.drawPool,
  },
];
