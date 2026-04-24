"use client";

import type { CSSProperties, ImgHTMLAttributes } from "react";

export const assetIconSources = {
  workout: "/assets/icons/workout-pixel.svg",
  board: "/assets/icons/board-pixel.svg",
  coffee: "/assets/icons/coffee-pixel.svg",
  calendar: "/assets/icons/calendar-pixel.svg",
  report: "/assets/icons/report-pixel.svg",
  vaultTrophy: "/assets/icons/vault-trophy-pixel.svg",
} as const;

export type AssetIconName = keyof typeof assetIconSources;

interface AssetIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  name: AssetIconName;
  alt?: string;
  decorative?: boolean;
}

export function AssetIcon({
  name,
  alt = "",
  decorative = true,
  className = "",
  style,
  ...props
}: AssetIconProps) {
  return (
    <img
      src={assetIconSources[name]}
      alt={decorative ? "" : alt}
      aria-hidden={decorative ? "true" : undefined}
      className={className}
      style={{ imageRendering: "pixelated", ...(style as CSSProperties | undefined) }}
      {...props}
    />
  );
}
