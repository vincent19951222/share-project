"use client";

import type { CSSProperties, ImgHTMLAttributes } from "react";

export const assetIconSources = {
  workout: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_workout_pixel.svg",
  board: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_board_pixel.svg",
  coffee: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_coffee_pixel.svg",
  supply: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_supply_pixel.svg",
  calendar: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_calendar_pixel.svg",
  report: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_report_pixel.svg",
  vaultTrophy: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_vault_trophy_pixel.svg",
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
