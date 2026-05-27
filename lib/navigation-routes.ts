import type { AppTab } from "@/lib/types";

export type SupplyPanelKey = "dashboard" | "drawPool" | "backpack" | "shop" | "taskRecord";

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
