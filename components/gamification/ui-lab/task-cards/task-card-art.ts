export const taskCardIllustrationById = {
  movement_001: "/assets/task-cards/illustrations/movement_001-desk-reboot.webp",
  movement_002: "/assets/task-cards/illustrations/movement_002-seat-offline.webp",
  movement_003: "/assets/task-cards/illustrations/movement_003-neck-boot.webp",
  movement_004: "/assets/task-cards/illustrations/movement_004-window-heal.webp",
  movement_005: "/assets/task-cards/illustrations/movement_005-back-thaw.webp",
  hydration_001: "/assets/task-cards/illustrations/hydration_001-first-cup.webp",
  hydration_002: "/assets/task-cards/illustrations/hydration_002-pantry-refill.webp",
  hydration_003: "/assets/task-cards/illustrations/hydration_003-empty-cup.webp",
  hydration_004: "/assets/task-cards/illustrations/hydration_004-sugar-free.webp",
  hydration_005: "/assets/task-cards/illustrations/hydration_005-coffee-debt.webp",
  social_001: "/assets/task-cards/illustrations/social_001-small-talk.webp",
  social_002: "/assets/task-cards/illustrations/social_002-work-smell-vent.webp",
  social_003: "/assets/task-cards/illustrations/social_003-praise-heal.webp",
  social_004: "/assets/task-cards/illustrations/social_004-status-report.webp",
  social_005: "/assets/task-cards/illustrations/social_005-hard-work-launch.webp",
  learning_001: "/assets/task-cards/illustrations/learning_001-three-minute-scan.webp",
  learning_002: "/assets/task-cards/illustrations/learning_002-new-term.webp",
  learning_003: "/assets/task-cards/illustrations/learning_003-bookmark-heal-pack.webp",
  learning_004: "/assets/task-cards/illustrations/learning_004-ai-cheat-sheet.webp",
  learning_005: "/assets/task-cards/illustrations/learning_005-one-note.webp",
} as const;

export type TaskCardIllustrationId = keyof typeof taskCardIllustrationById;

export const taskCardIllustrationIds = Object.keys(taskCardIllustrationById) as TaskCardIllustrationId[];

export function getTaskCardIllustrationPath(cardId: TaskCardIllustrationId): string {
  return taskCardIllustrationById[cardId];
}
