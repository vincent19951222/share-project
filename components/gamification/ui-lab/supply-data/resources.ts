import type { SupplyUiLabResource, SupplyUiLabResourceGroupId } from "./types";

export const supplyUiLabResourceIconPaths = {
  coins: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_resource_coins.png",
  ticket: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_resource_ticket.png",
  backpack: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_resource_backpack.png",
} as const;

const sharedResources: SupplyUiLabResource[] = [
  { id: "coins", label: "银子", value: "2,450", icon: "◎", iconImage: supplyUiLabResourceIconPaths.coins },
  { id: "ticket", label: "抽奖券", value: "18", icon: "券", iconImage: supplyUiLabResourceIconPaths.ticket },
  { id: "backpack", label: "背包", value: "18/60", icon: "包", iconImage: supplyUiLabResourceIconPaths.backpack },
];

export const supplyUiLabResources = {
  dashboard: sharedResources,
  backpack: sharedResources,
  shop: sharedResources,
  drawPool: sharedResources,
  taskRecord: sharedResources,
} satisfies Record<SupplyUiLabResourceGroupId, SupplyUiLabResource[]>;
