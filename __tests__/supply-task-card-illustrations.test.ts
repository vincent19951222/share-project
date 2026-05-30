import { describe, expect, it } from "vitest";
import { TASK_CARDS } from "@/content/gamification/task-cards";
import type { TaskDimensionKey } from "@/content/gamification/types";
import {
  taskCardIllustrationById,
  taskCardIllustrationIds,
} from "@/components/gamification/ui-lab/task-cards/task-card-art";

describe("supply task-card illustrations", () => {
  it("maps every task card to an illustration asset", () => {
    expect(taskCardIllustrationIds.sort()).toEqual(TASK_CARDS.map((card) => card.id).sort());
  });

  it("maps every illustration to uploaded COS media", () => {
    for (const [cardId, assetPath] of Object.entries(taskCardIllustrationById)) {
      expect(assetPath.startsWith("https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/")).toBe(
        true,
      );
      expect(assetPath.includes("share_project_public_assets_task_cards_illustrations_"), cardId).toBe(true);
      expect(assetPath.endsWith(".webp"), `${cardId} should use WebP`).toBe(true);
    }
  });

  it("keeps five illustrations for each task dimension", () => {
    const counts: Record<TaskDimensionKey, number> = {
      movement: 0,
      hydration: 0,
      social: 0,
      learning: 0,
    };

    for (const cardId of taskCardIllustrationIds) {
      const dimension = cardId.split("_")[0] as TaskDimensionKey;
      counts[dimension] += 1;
    }

    expect(counts).toEqual({
      movement: 5,
      hydration: 5,
      social: 5,
      learning: 5,
    });
  });
});
