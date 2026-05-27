import type { TaskDimensionKey } from "@/content/gamification/types";

export type SupplyTaskCardAspectRatio = "3:4";

export type SupplyTaskCardPreviewData = {
  id: string;
  dimension: TaskDimensionKey;
  slogan: string;
  title: string;
  description: string;
  image: string;
  difficulty: "轻" | "中";
  sceneLabel: "通用" | "办公室" | "居家";
  cooldownLabel: string;
  completed: boolean;
  aspectRatio: SupplyTaskCardAspectRatio;
};

export type SupplyTaskCardThemeToken = {
  accent: string;
  accentDark: string;
  accentSoft: string;
  ink: string;
};
