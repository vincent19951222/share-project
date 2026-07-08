// @vitest-environment node

import { describe, expect, it } from "vitest";
import { buildPromptSnapshot } from "@/lib/gamification/ai-image/prompt";
import { USER_PROMPT_PLACEHOLDER } from "@/lib/gamification/ai-image/prompt-template";
import { getAiImageThemeById } from "@/lib/gamification/ai-image/themes";
import type { AiImageThemeDefinition } from "@/lib/gamification/ai-image/types";

function makeStructuredTheme(promptTemplate: string): AiImageThemeDefinition {
  return {
    id: "theme-test",
    name: "测试主题",
    description: "测试结构化 prompt 注入。",
    previewImageUrl: "https://example.com/theme-test.webp",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 1,
    tag: "测试",
    palette: ["#ffffff", "#111827", "#fde047"],
    templateKind: "creative_poster",
    referencePolicy: "recommended",
    bestFor: ["单人人像", "主体明确的人物照片"],
    avoidFor: ["多人拥挤合照", "主体过小的远景照片"],
    promptTemplate,
  };
}

describe("AI image prompt snapshot", () => {
  it("injects user prompt into the structured user instruction slot", () => {
    const theme = makeStructuredTheme(
      `【任务目标】\n生成创意人物海报。\n\n【用户额外需求】\n${USER_PROMPT_PLACEHOLDER}\n\n【限制条件】\n不要改变人物身份。`,
    );
    const snapshot = buildPromptSnapshot({
      theme,
      userPrompt: "加入团队口号：今天也要动一动",
    });

    expect(snapshot.providerPrompt).toContain("【用户额外需求】\n加入团队口号：今天也要动一动");
    expect(snapshot.providerPrompt).not.toContain(USER_PROMPT_PLACEHOLDER);
    expect(snapshot.providerPrompt).not.toContain("User add-on:");
    expect(snapshot.clientPromptSummary).toBe("加入团队口号：今天也要动一动");
    expect(snapshot.themeId).toBe("theme-test");
  });

  it("replaces a blank structured user prompt with a neutral sentence", () => {
    const theme = makeStructuredTheme(
      `【任务目标】\n生成创意人物海报。\n\n【用户额外需求】\n${USER_PROMPT_PLACEHOLDER}\n\n【限制条件】\n不要改变人物身份。`,
    );
    const snapshot = buildPromptSnapshot({ theme, userPrompt: "   " });

    expect(snapshot.clientPromptSummary).toBe("");
    expect(snapshot.providerPrompt).toContain("【用户额外需求】\n用户未提供额外需求。");
    expect(snapshot.providerPrompt).not.toContain(USER_PROMPT_PLACEHOLDER);
  });

  it("keeps backward compatibility for old prompt templates without the user slot", () => {
    const theme = getAiImageThemeById("theme-06")!;
    const snapshot = buildPromptSnapshot({
      theme,
      userPrompt: "加入黄色训练灯牌",
    });

    expect(snapshot.providerPrompt).toContain(theme.promptTemplate);
    expect(snapshot.providerPrompt).toContain("User add-on: 加入黄色训练灯牌");
    expect(snapshot.clientPromptSummary).toBe("加入黄色训练灯牌");
  });

  it("trims blank user prompt for old prompt templates without appending add-on text", () => {
    const theme = getAiImageThemeById("theme-06")!;
    const snapshot = buildPromptSnapshot({ theme, userPrompt: "   " });

    expect(snapshot.clientPromptSummary).toBe("");
    expect(snapshot.providerPrompt).toBe(theme.promptTemplate);
  });
});
