import { describe, expect, it } from "vitest";
import { buildPromptSnapshot } from "@/lib/gamification/ai-image/prompt";
import { getAiImageThemeById } from "@/lib/gamification/ai-image/themes";

describe("AI image prompt snapshot", () => {
  it("combines server-only theme prompt and user prompt", () => {
    const theme = getAiImageThemeById("theme-01")!;
    const snapshot = buildPromptSnapshot({
      theme,
      userPrompt: "加入团队口号：今天也要动一动",
    });

    expect(snapshot.providerPrompt).toContain(theme.promptTemplate);
    expect(snapshot.providerPrompt).toContain("今天也要动一动");
    expect(snapshot.clientPromptSummary).toBe("加入团队口号：今天也要动一动");
    expect(snapshot.themeId).toBe("theme-01");
  });

  it("trims blank user prompt without exposing prompt templates to client summary", () => {
    const theme = getAiImageThemeById("theme-01")!;
    const snapshot = buildPromptSnapshot({ theme, userPrompt: "   " });

    expect(snapshot.clientPromptSummary).toBe("");
    expect(snapshot.providerPrompt).toContain(theme.promptTemplate);
  });
});
