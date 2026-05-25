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
import { taskCardIllustrationById } from "./task-card-art";

const reviewCardIds = ["movement_004", "hydration_003", "social_001", "learning_005"] as const;

const taskCardArtById: Record<(typeof reviewCardIds)[number], string> = {
  movement_004: taskCardIllustrationById.movement_004,
  hydration_003: taskCardIllustrationById.hydration_003,
  social_001: taskCardIllustrationById.social_001,
  learning_005: taskCardIllustrationById.learning_005,
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
