import type { AiImageThemePublicDefinition } from "@/lib/gamification/ai-image/types";
import type { AiImageThemeSnapshot } from "@/lib/types";

export function toClientThemeSnapshot(
  theme: AiImageThemePublicDefinition,
  unlocked: boolean,
): AiImageThemeSnapshot {
  return {
    id: theme.id,
    name: theme.name,
    description: theme.description,
    previewImageUrl: theme.previewImageUrl,
    defaultUnlocked: theme.defaultUnlocked,
    unlocked,
    enabled: theme.enabled,
    sortOrder: theme.sortOrder,
    tag: theme.tag,
    palette: [...theme.palette],
  };
}
