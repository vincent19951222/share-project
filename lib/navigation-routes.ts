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

export interface SupplyNavContext {
  resources: SupplyNavResource[];
  profile: {
    username: string;
    avatarKey: string;
  };
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
    iconImage: "/assets/home-scenes/supply/nav-icons/supply-nav-status.png",
    route: supplyPanelRoutes.dashboard,
  },
  {
    id: "shop",
    label: "补给商店",
    iconImage: "/assets/home-scenes/supply/nav-icons/supply-nav-shop.png",
    route: supplyPanelRoutes.shop,
  },
  {
    id: "taskRecord",
    label: "任务记录",
    iconImage: "/assets/home-scenes/supply/nav-icons/supply-nav-task-record.png",
    route: supplyPanelRoutes.taskRecord,
  },
  {
    id: "backpack",
    label: "背包",
    iconImage: "/assets/home-scenes/supply/nav-icons/supply-nav-backpack.png",
    route: supplyPanelRoutes.backpack,
  },
  {
    id: "drawPool",
    label: "抽奖池",
    iconImage: "/assets/home-scenes/supply/nav-icons/supply-nav-draw-pool.png",
    route: supplyPanelRoutes.drawPool,
  },
];
