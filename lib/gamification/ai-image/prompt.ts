import type {
  AiImagePromptSnapshot,
  AiImageThemeDefinition,
} from "@/lib/gamification/ai-image/types";

const USER_PROMPT_LIMIT = 240;

export function normalizeAiImageUserPrompt(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  if (normalized.length > USER_PROMPT_LIMIT) {
    throw new Error(`补充描述不能超过 ${USER_PROMPT_LIMIT} 个字符`);
  }

  return normalized;
}

export function buildPromptSnapshot({
  theme,
  userPrompt,
}: {
  theme: AiImageThemeDefinition;
  userPrompt?: string | null;
}): AiImagePromptSnapshot {
  const normalizedUserPrompt = normalizeAiImageUserPrompt(userPrompt);
  const providerPrompt = normalizedUserPrompt
    ? `${theme.promptTemplate}\n\nUser add-on: ${normalizedUserPrompt}`
    : theme.promptTemplate;

  return {
    themeId: theme.id,
    themeName: theme.name,
    providerPrompt,
    clientPromptSummary: normalizedUserPrompt,
  };
}
