// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  USER_PROMPT_PLACEHOLDER,
  buildStructuredPromptTemplate,
} from "@/lib/gamification/ai-image/prompt-template";

describe("AI image structured prompt template", () => {
  it("renders structured prompt sections in the project standard order", () => {
    const prompt = buildStructuredPromptTemplate({
      taskGoal: "基于用户上传的参考图片，生成一张高质量的创意人物海报。",
      inputFit: "本模板适合单人或主体明确的人物参考图。",
      referenceRules: "参考图已作为图像输入提供。请保留人物身份和主要面部特征。",
      styleRules: "整体采用高完成度日系动漫插画风格。",
      compositionRules: "画面比例为 4:5，人物半身或中近景，背景简洁。",
      userPromptRules: "用户额外需求主要用于调整氛围、背景、动作、服装细节、道具和故事感。",
      conflictRules: "如果用户额外需求与参考图人物身份冲突，优先保留参考图人物身份。",
      qualityRules: "高细节、自然光影、清晰五官、合理手部结构、统一画面风格。",
      negativeRules: "不要改变人物身份。不要生成多余人物。",
    });

    expect(prompt).toContain("【任务目标】\n基于用户上传的参考图片，生成一张高质量的创意人物海报。");
    expect(prompt).toContain("【输入适配】\n本模板适合单人或主体明确的人物参考图。");
    expect(prompt).toContain("【用户额外需求】\n{{user_instruction}}");
    expect(prompt).toContain("【用户额外需求使用规则】\n用户额外需求主要用于调整氛围、背景、动作、服装细节、道具和故事感。");
    expect(prompt).not.toContain("{{reference_image}}");

    expect(prompt.indexOf("【任务目标】")).toBeLessThan(prompt.indexOf("【输入适配】"));
    expect(prompt.indexOf("【输入适配】")).toBeLessThan(prompt.indexOf("【参考图使用规则】"));
    expect(prompt.indexOf("【参考图使用规则】")).toBeLessThan(prompt.indexOf("【固定视觉风格】"));
    expect(prompt.indexOf("【固定视觉风格】")).toBeLessThan(prompt.indexOf("【固定画面规则】"));
    expect(prompt.indexOf("【固定画面规则】")).toBeLessThan(prompt.indexOf("【用户额外需求】"));
    expect(prompt.indexOf("【用户额外需求】")).toBeLessThan(prompt.indexOf("【用户额外需求使用规则】"));
    expect(prompt.indexOf("【用户额外需求使用规则】")).toBeLessThan(prompt.indexOf("【冲突处理规则】"));
    expect(prompt.indexOf("【冲突处理规则】")).toBeLessThan(prompt.indexOf("【输出质量要求】"));
    expect(prompt.indexOf("【输出质量要求】")).toBeLessThan(prompt.indexOf("【限制条件】"));
  });

  it("exports the exact user prompt placeholder used by runtime injection", () => {
    expect(USER_PROMPT_PLACEHOLDER).toBe("{{user_instruction}}");
  });
});
