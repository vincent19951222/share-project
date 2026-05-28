import { supplyUiLabResourceIconPaths } from "@/components/gamification/ui-lab/supply-data/resources";
import type { SupplyNavContext } from "@/lib/navigation-routes";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

export function buildSupplyNavContext(snapshot: SupplyStationProductionSnapshot): SupplyNavContext {
  return {
    resources: [
      {
        id: "coins",
        label: snapshot.resources.coins.label,
        value: snapshot.resources.coins.value,
        maxValue: snapshot.resources.coins.maxValue,
        iconImage: supplyUiLabResourceIconPaths.coins,
      },
      {
        id: "ticket",
        label: snapshot.resources.ticket.label,
        value: snapshot.resources.ticket.value,
        maxValue: snapshot.resources.ticket.maxValue,
        iconImage: supplyUiLabResourceIconPaths.ticket,
      },
      {
        id: "backpack",
        label: snapshot.resources.backpack.label,
        value: snapshot.resources.backpack.value,
        maxValue: snapshot.resources.backpack.maxValue,
        iconImage: supplyUiLabResourceIconPaths.backpack,
      },
    ],
    profile: {
      username: snapshot.profile.username,
      avatarKey: snapshot.profile.avatarKey,
    },
  };
}
