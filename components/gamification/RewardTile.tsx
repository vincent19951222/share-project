import type { RewardRarity, RewardTier } from "@/content/gamification/types";

type RewardTileSize = "inventory" | "draw-result" | "detail";

const rarityBadgeByRarity: Record<RewardRarity, string> = {
  common: "N",
  uncommon: "R",
  rare: "SR",
  epic: "SSR",
};

const tierClassByTier: Record<RewardTier, string> = {
  coin: "reward-tile-tier-coin",
  utility: "reward-tile-tier-utility",
  social: "reward-tile-tier-social",
  cosmetic: "reward-tile-tier-cosmetic",
  rare: "reward-tile-tier-rare",
};

const sizeClassBySize: Record<RewardTileSize, string> = {
  inventory: "reward-tile-size-inventory",
  "draw-result": "reward-tile-size-draw-result",
  detail: "reward-tile-size-detail",
};

export interface RewardTileProps {
  name: string;
  rewardTier: RewardTier;
  rarity: RewardRarity;
  iconSrc?: string | null;
  iconAlt?: string | null;
  quantity?: number;
  selected?: boolean;
  disabled?: boolean;
  decorative?: boolean;
  size?: RewardTileSize;
  className?: string;
}

export function RewardTile({
  name,
  rewardTier,
  rarity,
  iconSrc,
  iconAlt,
  quantity,
  selected = false,
  disabled = false,
  decorative = false,
  size = "inventory",
  className = "",
}: RewardTileProps) {
  const badge = rarityBadgeByRarity[rarity];

  return (
    <span
      data-reward-tile={rewardTier}
      aria-hidden={decorative ? true : undefined}
      className={[
        "reward-tile",
        tierClassByTier[rewardTier],
        sizeClassBySize[size],
        selected ? "reward-tile-selected" : "",
        disabled ? "reward-tile-disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="reward-tile-rarity">{badge}</span>
      <span className="reward-tile-icon-wrap" aria-hidden={iconSrc ? undefined : true}>
        {iconSrc ? (
          <img className="reward-tile-icon" src={iconSrc} alt={iconAlt ?? name} />
        ) : (
          <span className="reward-tile-fallback">?</span>
        )}
      </span>
      {quantity !== undefined ? <span className="reward-tile-quantity">x{quantity}</span> : null}
      <span className="reward-tile-name">{name}</span>
    </span>
  );
}
