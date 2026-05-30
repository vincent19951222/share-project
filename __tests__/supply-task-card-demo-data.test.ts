import { describe, expect, it } from "vitest";
import {
  taskCardReviewCards,
  taskCardThemeTokens,
} from "@/components/gamification/ui-lab/task-cards/task-card-demo-data";

describe("supply task-card demo data", () => {
  it("defines the four-card 3:4 review set from the canonical content", () => {
    expect(taskCardReviewCards.map((card) => card.id)).toEqual([
      "movement_004",
      "hydration_003",
      "social_001",
      "learning_005",
    ]);

    expect(taskCardReviewCards.map((card) => [card.dimension, card.slogan, card.title])).toEqual([
      ["movement", "把电充绿", "窗边回血"],
      ["hydration", "把尿喝白", "杯子见底"],
      ["social", "把事办黄", "废话 KPI"],
      ["learning", "把股看红", "一句话笔记"],
    ]);

    expect(taskCardReviewCards.map((card) => [card.difficulty, card.sceneLabel, card.cooldownLabel])).toEqual([
      ["轻", "通用", "4天"],
      ["轻", "通用", "2天"],
      ["轻", "办公室", "3天"],
      ["中", "通用", "4天"],
    ]);

    expect(taskCardReviewCards.map((card) => card.image)).toEqual([
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_movement_004_window_heal.webp",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_hydration_003_empty_cup.webp",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_social_001_small_talk.webp",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_task_cards_illustrations_learning_005_one_note.webp",
    ]);
    expect(
      taskCardReviewCards.every((card) =>
        card.image.includes("share_project_public_assets_task_cards_illustrations_"),
      ),
    ).toBe(true);
    expect(taskCardReviewCards.every((card) => !card.image.includes("/raw/"))).toBe(true);
    expect(taskCardReviewCards.every((card) => card.aspectRatio === "3:4")).toBe(true);
  });

  it("has a complete theme token for every review dimension", () => {
    expect(Object.keys(taskCardThemeTokens)).toEqual(["movement", "hydration", "social", "learning"]);
    expect(taskCardThemeTokens.movement.accent).toBe("#3E9C35");
    expect(taskCardThemeTokens.hydration.accent).toBe("#278BD6");
    expect(taskCardThemeTokens.social.accent).toBe("#E1AE20");
    expect(taskCardThemeTokens.learning.accent).toBe("#D9432F");
  });
});
