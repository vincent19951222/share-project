export const taskCardIllustrationById = {
  movement_001: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_movement_001_desk_reboot.webp",
  movement_002: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_movement_002_seat_offline.webp",
  movement_003: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_movement_003_neck_boot.webp",
  movement_004: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_movement_004_window_heal.webp",
  movement_005: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_movement_005_back_thaw.webp",
  hydration_001: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_hydration_001_first_cup.webp",
  hydration_002: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_hydration_002_pantry_refill.webp",
  hydration_003: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_hydration_003_empty_cup.webp",
  hydration_004: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_hydration_004_sugar_free.webp",
  hydration_005: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_hydration_005_coffee_debt.webp",
  social_001: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_social_001_small_talk.webp",
  social_002: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_social_002_work_smell_vent.webp",
  social_003: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_social_003_praise_heal.webp",
  social_004: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_social_004_status_report.webp",
  social_005: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_social_005_hard_work_launch.webp",
  learning_001: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_learning_001_three_minute_scan.webp",
  learning_002: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_learning_002_new_term.webp",
  learning_003: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_learning_003_bookmark_heal_pack.webp",
  learning_004: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_learning_004_ai_cheat_sheet.webp",
  learning_005: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_learning_005_one_note.webp",
} as const;

export type TaskCardIllustrationId = keyof typeof taskCardIllustrationById;

export const taskCardIllustrationIds = Object.keys(taskCardIllustrationById) as TaskCardIllustrationId[];

export function getTaskCardIllustrationPath(cardId: TaskCardIllustrationId): string {
  return taskCardIllustrationById[cardId];
}
