import type { SupplyStationProductionSnapshot } from "@/lib/types";

export interface SupplyDisplayResource {
  id: "coins" | "ticket" | "backpack";
  label: "银子" | "抽奖券" | "背包";
  value: number;
  maxValue?: number;
}

export function getSupplyDisplayResources(
  snapshot: SupplyStationProductionSnapshot,
): SupplyDisplayResource[] {
  return [
    {
      id: "coins",
      label: "银子",
      value: snapshot.resources.coins.value,
      maxValue: snapshot.resources.coins.maxValue,
    },
    {
      id: "ticket",
      label: "抽奖券",
      value: snapshot.resources.ticket?.value ?? snapshot.legacyArchive.ticketBalance,
      maxValue: snapshot.resources.ticket?.maxValue,
    },
    {
      id: "backpack",
      label: "背包",
      value: snapshot.resources.backpack?.value ?? snapshot.backpack.capacity.usedSlots,
      maxValue: snapshot.resources.backpack?.maxValue ?? snapshot.backpack.capacity.totalSlots,
    },
  ];
}
