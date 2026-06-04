import { supplyUiLabResourceIconPaths } from "@/components/gamification/ui-lab/supply-data/resources";
import type { SupplyNavContext } from "@/lib/navigation-routes";
import type { SupplyStationProductionSnapshot } from "@/lib/types";

function getInvitationActionLabel(invitationType: string) {
  if (invitationType === "DRINK_WATER") {
    return "喝水";
  }

  if (invitationType === "WALK_AROUND") {
    return "走一走";
  }

  return "互动";
}

function buildLatestSocialLabel(snapshot: SupplyStationProductionSnapshot): string | null {
  const latest = [...snapshot.social.received, ...snapshot.social.teamWide].find(
    (invite) => invite.status === "PENDING",
  );

  if (!latest) {
    return null;
  }

  return `${latest.senderUsername ?? "队友"} 邀请你${getInvitationActionLabel(latest.invitationType)}`;
}

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
    social: {
      pendingCount: snapshot.social.pendingReceivedCount + snapshot.social.teamWidePendingCount,
      latestLabel: buildLatestSocialLabel(snapshot),
    },
  };
}
