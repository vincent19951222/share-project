import { GAMIFICATION_DIMENSIONS } from "@/content/gamification/dimensions";
import { TASK_CARDS } from "@/content/gamification/task-cards";
import type {
  TaskCardDefinition,
  TaskDimensionKey,
  TaskEffort,
  TaskScene,
} from "@/content/gamification/types";
import type {
  SupplyTaskCardPreviewData,
  SupplyTaskCardThemeToken,
} from "./types";

const reviewCardIds = ["movement_004", "hydration_003", "social_001", "learning_005"] as const;

const taskCardArtById: Record<(typeof reviewCardIds)[number], string> = {
  movement_004: "/assets/task-cards/raw/movement_004%C2%A0%E7%AA%97%E8%BE%B9%E5%9B%9E%E8%A1%80.png",
  hydration_003: "/assets/task-cards/raw/hydration_003%C2%A0%E6%9D%AF%E5%AD%90%E8%A7%81%E5%BA%95.png",
  social_001: "/assets/task-cards/raw/social_001%C2%A0%E5%BA%9F%E8%AF%9D%20KPI.png",
  learning_005: "/assets/task-cards/raw/learning_005%C2%A0%E4%B8%80%E5%8F%A5%E8%AF%9D%E7%AC%94%E8%AE%B0.png",
};

const effortLabels: Record<TaskEffort, SupplyTaskCardPreviewData["difficulty"]> = {
  light: "轻",
  medium: "中",
};

const sceneLabels: Record<TaskScene, SupplyTaskCardPreviewData["sceneLabel"]> = {
  general: "通用",
  office: "办公室",
  home: "居家",
};

export const taskCardThemeTokens: Record<TaskDimensionKey, SupplyTaskCardThemeToken> = {
  movement: {
    accent: "#3E9C35",
    accentDark: "#14532D",
    accentSoft: "#DCFCE7",
    ink: "#0F100E",
  },
  hydration: {
    accent: "#278BD6",
    accentDark: "#075985",
    accentSoft: "#E0F2FE",
    ink: "#0F100E",
  },
  social: {
    accent: "#E1AE20",
    accentDark: "#92400E",
    accentSoft: "#FEF3C7",
    ink: "#0F100E",
  },
  learning: {
    accent: "#D9432F",
    accentDark: "#991B1B",
    accentSoft: "#FEE2E2",
    ink: "#0F100E",
  },
};

function findTaskCard(id: string): TaskCardDefinition {
  const card = TASK_CARDS.find((candidate) => candidate.id === id);

  if (card === undefined) {
    throw new Error(`Missing task-card definition: ${id}`);
  }

  return card;
}

function findDimensionTitle(dimensionKey: TaskDimensionKey): string {
  const dimension = GAMIFICATION_DIMENSIONS.find((candidate) => candidate.key === dimensionKey);

  if (dimension === undefined) {
    throw new Error(`Missing task-card dimension: ${dimensionKey}`);
  }

  return dimension.title;
}

function toPreviewCard(id: (typeof reviewCardIds)[number], completed: boolean): SupplyTaskCardPreviewData {
  const source = findTaskCard(id);

  return {
    id: source.id,
    dimension: source.dimensionKey,
    slogan: findDimensionTitle(source.dimensionKey),
    title: source.title,
    description: source.description,
    image: taskCardArtById[id],
    difficulty: effortLabels[source.effort],
    sceneLabel: sceneLabels[source.scene],
    cooldownLabel: `${source.repeatCooldownDays}天`,
    completed,
    aspectRatio: "3:4",
  };
}

export const taskCardReviewCards: SupplyTaskCardPreviewData[] = reviewCardIds.map((id, index) =>
  toPreviewCard(id, index < 3),
);
