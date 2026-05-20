import type { SupplyUiLabResource, SupplyUiLabResourceGroupId } from "./types";

const sharedResources: SupplyUiLabResource[] = [
  { id: "coins", label: "银子", value: "2,450", icon: "◎" },
  { id: "ticket", label: "抽奖券", value: "18", icon: "券" },
  { id: "backpack", label: "背包", value: "18/60", icon: "包" },
];

export const supplyUiLabResources = {
  dashboard: sharedResources,
  backpack: sharedResources,
  shop: sharedResources,
  drawPool: sharedResources,
  taskRecord: sharedResources,
} satisfies Record<SupplyUiLabResourceGroupId, SupplyUiLabResource[]>;
