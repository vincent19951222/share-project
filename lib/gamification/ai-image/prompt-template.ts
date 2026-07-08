import "server-only";

import type { AiImagePromptSections } from "@/lib/gamification/ai-image/types";

export const USER_PROMPT_PLACEHOLDER = "{{user_instruction}}";

function cleanSection(value: string) {
  return value.trim();
}

export function buildStructuredPromptTemplate(sections: AiImagePromptSections) {
  return [
    ["任务目标", sections.taskGoal],
    ["输入适配", sections.inputFit],
    ["参考图使用规则", sections.referenceRules],
    ["固定视觉风格", sections.styleRules],
    ["固定画面规则", sections.compositionRules],
    ["用户额外需求", USER_PROMPT_PLACEHOLDER],
    ["用户额外需求使用规则", sections.userPromptRules],
    ["冲突处理规则", sections.conflictRules],
    ["输出质量要求", sections.qualityRules],
    ["限制条件", sections.negativeRules],
  ]
    .map(([title, body]) => `【${title}】\n${cleanSection(body)}`)
    .join("\n\n");
}
