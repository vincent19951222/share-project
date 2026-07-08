import "server-only";

import type {
  AiImagePromptSnapshot,
  AiImageThemeDefinition,
} from "@/lib/gamification/ai-image/types";
import { USER_PROMPT_PLACEHOLDER } from "@/lib/gamification/ai-image/prompt-template";

const USER_PROMPT_LIMIT = 240;
const EMPTY_USER_PROMPT_TEXT = "用户未提供额外需求。";

export function normalizeAiImageUserPrompt(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";

  if (normalized.length > USER_PROMPT_LIMIT) {
    throw new Error(`补充描述不能超过 ${USER_PROMPT_LIMIT} 个字符`);
  }

  return normalized;
}

function buildProviderPrompt({
  promptTemplate,
  normalizedUserPrompt,
}: {
  promptTemplate: string;
  normalizedUserPrompt: string;
}) {
  if (promptTemplate.includes(USER_PROMPT_PLACEHOLDER)) {
    return promptTemplate.replaceAll(
      USER_PROMPT_PLACEHOLDER,
      normalizedUserPrompt || EMPTY_USER_PROMPT_TEXT,
    );
  }

  return normalizedUserPrompt
    ? `${promptTemplate}\n\nUser add-on: ${normalizedUserPrompt}`
    : promptTemplate;
}

export function buildPromptSnapshot({
  theme,
  userPrompt,
}: {
  theme: AiImageThemeDefinition;
  userPrompt?: string | null;
}): AiImagePromptSnapshot {
  const normalizedUserPrompt = normalizeAiImageUserPrompt(userPrompt);
  const providerPrompt = buildProviderPrompt({
    promptTemplate: theme.promptTemplate,
    normalizedUserPrompt,
  });

  return {
    themeId: theme.id,
    themeName: theme.name,
    providerPrompt,
    clientPromptSummary: normalizedUserPrompt,
  };
}
