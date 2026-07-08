# AI Image Theme Prompt Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 AI 生图 theme 的 prompt 从整段自由文本升级为结构化模板，并先重构 `theme-01` 到 `theme-05`。

**Architecture:** 保留现有 `promptTemplate` 运行时合同，新增内部结构字段和编译器，由 `themes.ts` 生成结构化 prompt。`buildPromptSnapshot()` 负责把用户补充输入注入 `{{user_instruction}}` 槽位，并兼容尚未重构的旧 theme。

**Tech Stack:** Next.js 15 App Router, TypeScript strict mode, Vitest node environment, server-only prompt modules.

---

## Scope

本计划只做三件事：

1. 建立结构化 prompt 类型、编译器和用户输入槽位注入逻辑。
2. 重构 `theme-01` 到 `theme-05` 的 prompt 内核。
3. 写一份中文准入规范，规定未来外部 prompt 必须 reconstruct 后才能进入配置。

本计划不重构 `theme-06` 到 `theme-13`。它们继续通过兼容路径工作，后续可以按同一规范分批迁移。

## File Structure

- Modify: `lib/gamification/ai-image/types.ts`
  - 增加 `AiImageTemplateKind`、`AiImageReferencePolicy`、`AiImagePromptSections`，并让内部 theme 可以携带结构化字段。
- Create: `lib/gamification/ai-image/prompt-template.ts`
  - 负责把结构化 sections 编译成固定段落 prompt，并导出 `USER_PROMPT_PLACEHOLDER`。
- Modify: `lib/gamification/ai-image/prompt.ts`
  - 负责把 `{{user_instruction}}` 替换为用户补充输入；旧 prompt 没有槽位时继续使用现有追加逻辑。
- Modify: `lib/gamification/ai-image/themes.ts`
  - 增加 theme 工厂和深拷贝逻辑。
  - 先把 `theme-01` 到 `theme-05` 改成结构化 sections。
- Modify: `__tests__/ai-image-prompt.test.ts`
  - 覆盖用户输入槽位注入、空输入兜底和旧 prompt 兼容。
- Create: `__tests__/ai-image-prompt-template.test.ts`
  - 覆盖结构化 prompt 编译顺序和必备段落。
- Modify: `__tests__/ai-image-themes.test.ts`
  - 更新 `theme-01` 到 `theme-05` 的断言，验证结构化字段和去样张化结果。
- Create: `docs/ai-image-theme-prompt-guidelines.md`
  - 记录未来 prompt reconstruct 流程和准入检查。

---

### Task 1: Add Structured Prompt Types And Compiler

**Files:**
- Modify: `lib/gamification/ai-image/types.ts`
- Create: `lib/gamification/ai-image/prompt-template.ts`
- Test: `__tests__/ai-image-prompt-template.test.ts`

- [ ] **Step 1: Write the failing compiler test**

Create `__tests__/ai-image-prompt-template.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the compiler test to verify it fails**

Run:

```bash
npm test -- __tests__/ai-image-prompt-template.test.ts
```

Expected: FAIL because `@/lib/gamification/ai-image/prompt-template` does not exist.

- [ ] **Step 3: Add structured prompt types**

Modify `lib/gamification/ai-image/types.ts` to this full content:

```ts
export type AiImageTaskStatus = "queued" | "running" | "completed" | "partial" | "failed";
export type AiImageItemStatus = "queued" | "running" | "completed" | "failed";
export type AiImageThemeUnlockSource = "default" | "draw";

export type AiImageTemplateKind =
  | "reference_edit"
  | "reference_transform"
  | "creative_poster"
  | "scene_generation"
  | "asset_generation";

export type AiImageReferencePolicy = "required" | "recommended" | "optional" | "not_recommended";

export interface AiImagePromptSections {
  taskGoal: string;
  inputFit: string;
  referenceRules: string;
  styleRules: string;
  compositionRules: string;
  userPromptRules: string;
  conflictRules: string;
  qualityRules: string;
  negativeRules: string;
}

export interface AiImageThemePublicDefinition {
  id: string;
  name: string;
  description: string;
  previewImageUrl: string;
  defaultUnlocked: boolean;
  enabled: boolean;
  sortOrder: number;
  tag: string;
  palette: string[];
}

export interface AiImageThemeDefinition extends AiImageThemePublicDefinition {
  templateKind: AiImageTemplateKind;
  referencePolicy: AiImageReferencePolicy;
  bestFor: string[];
  avoidFor: string[];
  promptSections?: AiImagePromptSections;
  promptTemplate: string;
}

export interface AiImagePromptSnapshot {
  themeId: string;
  themeName: string;
  providerPrompt: string;
  clientPromptSummary: string;
}
```

- [ ] **Step 4: Add the structured prompt compiler**

Create `lib/gamification/ai-image/prompt-template.ts`:

```ts
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
```

- [ ] **Step 5: Run the compiler test to verify it passes**

Run:

```bash
npm test -- __tests__/ai-image-prompt-template.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

Run:

```bash
git add lib/gamification/ai-image/types.ts lib/gamification/ai-image/prompt-template.ts __tests__/ai-image-prompt-template.test.ts
git commit -m "feat: add structured AI image prompt templates"
```

Expected: commit succeeds.

---

### Task 2: Inject User Input Into Structured Prompt Slot

**Files:**
- Modify: `lib/gamification/ai-image/prompt.ts`
- Test: `__tests__/ai-image-prompt.test.ts`

- [ ] **Step 1: Replace prompt snapshot tests with slot-aware coverage**

Modify `__tests__/ai-image-prompt.test.ts` to this full content:

```ts
// @vitest-environment node

import { describe, expect, it } from "vitest";
import { buildPromptSnapshot } from "@/lib/gamification/ai-image/prompt";
import type { AiImageThemeDefinition } from "@/lib/gamification/ai-image/types";
import { USER_PROMPT_PLACEHOLDER } from "@/lib/gamification/ai-image/prompt-template";
import { getAiImageThemeById } from "@/lib/gamification/ai-image/themes";

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
    const theme = makeStructuredTheme(`【任务目标】\n生成创意人物海报。\n\n【用户额外需求】\n${USER_PROMPT_PLACEHOLDER}\n\n【限制条件】\n不要改变人物身份。`);
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
    const theme = makeStructuredTheme(`【任务目标】\n生成创意人物海报。\n\n【用户额外需求】\n${USER_PROMPT_PLACEHOLDER}\n\n【限制条件】\n不要改变人物身份。`);
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
```

- [ ] **Step 2: Run prompt snapshot tests to verify they fail**

Run:

```bash
npm test -- __tests__/ai-image-prompt.test.ts
```

Expected: FAIL because `buildPromptSnapshot()` still appends `User add-on:` and does not replace `{{user_instruction}}`.

- [ ] **Step 3: Update runtime prompt snapshot injection**

Modify `lib/gamification/ai-image/prompt.ts` to this full content:

```ts
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
```

- [ ] **Step 4: Run prompt snapshot tests to verify they pass**

Run:

```bash
npm test -- __tests__/ai-image-prompt.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run compiler and prompt tests together**

Run:

```bash
npm test -- __tests__/ai-image-prompt-template.test.ts __tests__/ai-image-prompt.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Run:

```bash
git add lib/gamification/ai-image/prompt.ts __tests__/ai-image-prompt.test.ts
git commit -m "feat: inject AI image user prompt slots"
```

Expected: commit succeeds.

---

### Task 3: Reconstruct Theme 01 To Theme 05

**Files:**
- Modify: `lib/gamification/ai-image/themes.ts`
- Test: `__tests__/ai-image-themes.test.ts`

- [ ] **Step 1: Add failing theme structure assertions**

In `__tests__/ai-image-themes.test.ts`, replace the five tests named `configures theme-01...` through `configures theme-05...` with the following tests:

```ts
  it("configures theme-01 as a structured interactive photo doodle preset", () => {
    const theme = getAiImageThemeById("theme-01");

    expect(theme).toMatchObject({
      id: "theme-01",
      name: "互动照片涂鸦",
      description: "保留原照片主体，在画面上加入会互动的手绘涂鸦和俏皮手写感元素。",
      tag: "涂鸦",
      templateKind: "reference_edit",
      referencePolicy: "required",
      bestFor: ["主体明确的生活照片", "人物、宠物、物品或运动瞬间"],
      avoidFor: ["主体过小的远景照片", "文字密集截图"],
      previewImageUrl:
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-01-interactive-photo-doodle.webp",
      palette: ["#fef3c7", "#111827", "#38bdf8"],
    });
    expect(theme?.promptTemplate).toContain("【任务目标】");
    expect(theme?.promptTemplate).toContain("【参考图使用规则】");
    expect(theme?.promptTemplate).toContain("【用户额外需求】\n{{user_instruction}}");
    expect(theme?.promptTemplate).toContain("保留原始主体、构图关系和真实光影");
    expect(theme?.promptTemplate).toContain("手绘涂鸦要与参考图中的主体产生直接互动");
    expect(theme?.promptTemplate).not.toContain("{{reference_image}}");
  });

  it("configures theme-02 as a structured cold fashion creative poster without fixed sample identity", () => {
    const theme = getAiImageThemeById("theme-02");

    expect(theme).toMatchObject({
      id: "theme-02",
      name: "冷感时装肖像",
      description: "基于单人人像参考图生成高级时尚杂志质感的冷色调棚拍肖像。",
      tag: "时尚",
      templateKind: "creative_poster",
      referencePolicy: "recommended",
      bestFor: ["单人人像", "主体清晰的半身或全身照片"],
      avoidFor: ["多人合照", "非人物照片", "面部遮挡严重的照片"],
      previewImageUrl:
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-02-cold-fashion-portrait.webp",
      palette: ["#f8fafc", "#111827", "#cbd5e1"],
    });
    expect(theme?.promptTemplate).toContain("冷色调高级时尚杂志棚拍肖像");
    expect(theme?.promptTemplate).toContain("不要强行改变人物性别、年龄、脸型、发色或核心气质");
    expect(theme?.promptTemplate).toContain("用户额外需求主要用于调整服装方向、背景色、姿态、配饰、氛围和镜头语言");
    expect(theme?.promptTemplate).not.toContain("一位年轻女性");
    expect(theme?.promptTemplate).not.toContain("银灰金色");
    expect(theme?.promptTemplate).not.toContain("双手随意插在口袋");
  });

  it("configures theme-03 as a structured pixel bead asset generation preset", () => {
    const theme = getAiImageThemeById("theme-03");

    expect(theme).toMatchObject({
      id: "theme-03",
      name: "像素拼豆图纸",
      description: "把参考人像或主体转换成带编号色板和 45x45 网格的专业 2D 拼豆设计图纸。",
      tag: "拼豆",
      templateKind: "asset_generation",
      referencePolicy: "recommended",
      bestFor: ["单人人像", "主体轮廓明确的角色或物品"],
      avoidFor: ["复杂多人场景", "主体边界不清晰的照片"],
      previewImageUrl:
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-03-pixel-bead-blueprint.webp",
      palette: ["#f8fafc", "#0f172a", "#60a5fa"],
    });
    expect(theme?.promptTemplate).toContain("专业 2D 拼豆图案设计图纸");
    expect(theme?.promptTemplate).toContain("45x45 网格矩阵");
    expect(theme?.promptTemplate).toContain("左侧垂直色板/图例");
    expect(theme?.promptTemplate).toContain("输出必须是拼豆图纸，不是写实照片");
  });

  it("configures theme-04 as a structured travel journal collage preset", () => {
    const theme = getAiImageThemeById("theme-04");

    expect(theme).toMatchObject({
      id: "theme-04",
      name: "旅行手账拼贴",
      description: "保留旅行照片底图，叠加同一人物的 Q 版迷你分身、贴纸和手写旅行笔记。",
      tag: "旅行",
      templateKind: "reference_edit",
      referencePolicy: "required",
      bestFor: ["旅行照片", "街景或景点中的单人照片", "主体和背景都有记忆点的照片"],
      avoidFor: ["纯白背景证件照", "无场景信息的近距离自拍", "多人拥挤合照"],
      previewImageUrl:
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-04-travel-journal-chibi-collage.webp",
      palette: ["#ffffff", "#f9a8d4", "#60a5fa"],
    });
    expect(theme?.promptTemplate).toContain("旅行手账风格 Q 版拼贴画");
    expect(theme?.promptTemplate).toContain("添加 4 到 7 个同一人物的可爱 Q 版迷你形象");
    expect(theme?.promptTemplate).toContain("每条中文短语控制在 4 到 10 个汉字");
    expect(theme?.promptTemplate).toContain("不要替换真实旅行场景");
  });

  it("configures theme-05 as a structured childlike crayon transform preset", () => {
    const theme = getAiImageThemeById("theme-05");

    expect(theme).toMatchObject({
      id: "theme-05",
      name: "童趣蜡笔画",
      description: "把参考图重绘成 10 岁孩子手绘般的白纸蜡笔幻想插画。",
      tag: "蜡笔",
      templateKind: "reference_transform",
      referencePolicy: "recommended",
      bestFor: ["人物、宠物、物品或简单场景", "主体轮廓明确的照片"],
      avoidFor: ["文字截图", "复杂表格", "细节极密的群像照片"],
      previewImageUrl:
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-05-childlike-crayon-fantasy.webp",
      palette: ["#ffffff", "#fb7185", "#60a5fa"],
    });
    expect(theme?.promptTemplate).toContain("10 岁孩子手绘般的白纸蜡笔幻想插画");
    expect(theme?.promptTemplate).toContain("蜡笔颗粒感、涂抹不均和轻微涂出边界");
    expect(theme?.promptTemplate).toContain("城堡、塔楼、糖果、星星、云朵");
    expect(theme?.promptTemplate).toContain("不要做成专业写实插画");
  });
```

- [ ] **Step 2: Run theme tests to verify they fail**

Run:

```bash
npm test -- __tests__/ai-image-themes.test.ts
```

Expected: FAIL because themes do not yet expose `templateKind`, `referencePolicy`, `bestFor`, `avoidFor`, and the old prompts still contain freeform text.

- [ ] **Step 3: Add theme factory and deep clone support**

Modify the top of `lib/gamification/ai-image/themes.ts` so the imports and helper definitions start like this:

```ts
import "server-only";

import { buildStructuredPromptTemplate } from "@/lib/gamification/ai-image/prompt-template";
import type {
  AiImagePromptSections,
  AiImageThemeDefinition,
} from "@/lib/gamification/ai-image/types";

type AiImageThemeDraft = Omit<AiImageThemeDefinition, "promptTemplate">;

function createTheme(theme: AiImageThemeDraft): AiImageThemeDefinition {
  return {
    ...theme,
    promptTemplate: theme.promptSections
      ? buildStructuredPromptTemplate(theme.promptSections)
      : "",
  };
}
```

Then replace the existing `cloneTheme()` function with:

```ts
function cloneTheme(theme: AiImageThemeDefinition): AiImageThemeDefinition {
  return {
    ...theme,
    palette: [...theme.palette],
    bestFor: [...theme.bestFor],
    avoidFor: [...theme.avoidFor],
    promptSections: theme.promptSections ? { ...theme.promptSections } : undefined,
  };
}
```

- [ ] **Step 4: Add legacy fields to theme-06 through theme-13**

For each unchanged legacy theme from `theme-06` through `theme-13`, add these fields above its existing `promptTemplate`:

```ts
    templateKind: "scene_generation",
    referencePolicy: "optional",
    bestFor: ["文字描述明确的健身主题场景"],
    avoidFor: ["需要严格保留人物身份的参考图"],
```

For `theme-12`, use this more accurate block:

```ts
    templateKind: "asset_generation",
    referencePolicy: "optional",
    bestFor: ["健身贴纸、头像、道具素材"],
    avoidFor: ["需要保留真实照片构图的任务"],
```

- [ ] **Step 5: Reconstruct theme-01**

In the `theme-01` object, remove the old `promptTemplate` field and add these fields after `palette`:

```ts
    templateKind: "reference_edit",
    referencePolicy: "required",
    bestFor: ["主体明确的生活照片", "人物、宠物、物品或运动瞬间"],
    avoidFor: ["主体过小的远景照片", "文字密集截图"],
    promptSections: {
      taskGoal: "基于用户上传的参考图片，生成一张保留原照片真实主体的互动照片涂鸦作品。",
      inputFit:
        "本模板适合主体明确的生活照片、人物照片、宠物照片、物品照片或运动瞬间。若参考图主体过小、画面信息极乱或主要内容是文字截图，则优先保留可识别主体并减少涂鸦密度。",
      referenceRules:
        "参考图已作为图像输入提供。请分析并保留原始主体、构图关系和真实光影，保留人物或物体的核心辨识度、姿态方向、主要色彩关系和场景氛围。参考图用于确定主体、空间层次和可互动元素，不要替换主体身份，不要重绘成完全不同场景。",
      styleRules:
        "整体采用真实照片叠加手绘涂鸦的社交媒体创意风格。涂鸦应有机、略显不均匀、带随性手绘笔触，颜色鲜明但要与原图自然协调。画面可以加入俏皮手写感元素，但文字应短、清楚、与场景氛围相关。",
      compositionRules:
        "保持原照片主体清晰，涂鸦围绕主体动作、轮廓或场景元素展开。手绘线条可以勾勒姿势、延伸动作、添加运动线、表情符号、箭头、小星星或与主体互动的小元素。涂鸦不能遮挡面部、关键物体或用户强调需要保留的细节。",
      userPromptRules:
        "用户额外需求主要用于指定涂鸦主题、手写短语、情绪氛围、需要保留的物体或希望强化的互动方向。",
      conflictRules:
        "如果用户额外需求与参考图主体身份或关键细节冲突，优先保留参考图。若用户要求增加文字，请生成简短自然的中文或符号，不要输出长句和宣传口号。",
      qualityRules:
        "高分辨率、主体清晰、涂鸦边缘干净、手写元素可读、照片和涂鸦层次自然融合、色彩鲜明但不脏乱。",
      negativeRules:
        "不要改变主体身份。不要覆盖面部和关键细节。不要生成水印、乱码、长段文字或无关 Logo。不要把照片完全重绘成插画。不要添加与场景无关的多余人物。",
    },
```

- [ ] **Step 6: Reconstruct theme-02**

In the `theme-02` object:

1. Change `description` to:

```ts
    description: "基于单人人像参考图生成高级时尚杂志质感的冷色调棚拍肖像。",
```

2. Remove the old `promptTemplate` field and add these fields after `palette`:

```ts
    templateKind: "creative_poster",
    referencePolicy: "recommended",
    bestFor: ["单人人像", "主体清晰的半身或全身照片"],
    avoidFor: ["多人合照", "非人物照片", "面部遮挡严重的照片"],
    promptSections: {
      taskGoal:
        "基于用户上传的单人人像参考图片，生成一张冷色调高级时尚杂志棚拍肖像。",
      inputFit:
        "本模板最适合单人、主体清晰、面部可辨识的人像参考图。若参考图不是人物、包含多人或面部遮挡严重，则生成同风格时尚海报，但不要伪造参考人物身份。",
      referenceRules:
        "参考图已作为图像输入提供。请保留参考人物的身份、主要面部特征、脸型、发型方向、体态、年龄感、气质和主要穿搭季节感。允许重新设计姿势、服装细节、背景、镜头、灯光和视觉故事。不要强行改变人物性别、年龄、脸型、发色或核心气质。",
      styleRules:
        "整体采用超写实高级时尚杂志风格，冷色调单色分级，极简棚拍环境，奢华街头服饰广告美学。画面应有中画幅时尚摄影质感，干净、克制、锋利、有高级杂志封面完成度。",
      compositionRules:
        "构图为半身、七分身或全身时尚肖像，主体居中或略偏中轴，背景为白色、浅灰或冷调渐变棚拍空间。允许大面积负空间，面部和眼神必须清晰，服装材质、发丝和配饰细节需要可见。",
      userPromptRules:
        "用户额外需求主要用于调整服装方向、背景色、姿态、配饰、氛围和镜头语言。用户可以指定更偏机能风、街头风、极简风或杂志封面感。",
      conflictRules:
        "如果用户额外需求与参考图人物身份冲突，优先保留参考人物身份。如果用户要求改变发色、妆容或服装，只做风格化调整，不覆盖参考人物的核心辨识度。",
      qualityRules:
        "照片级真实、自然皮肤纹理、清晰五官、精准眼神焦点、自然手部结构、真实布料褶皱、柔和但有层次的棚拍光影、高级精修质感。",
      negativeRules:
        "不要改变人物身份。不要生成多余人物。不要把人物幼态化。不要输出水印、乱码、无关文字或 Logo。不要复制参考图原始构图。不要使用廉价霓虹或过度赛博效果。",
    },
```

- [ ] **Step 7: Reconstruct theme-03**

In the `theme-03` object:

1. Change `description` to:

```ts
    description: "把参考人像或主体转换成带编号色板和 45x45 网格的专业 2D 拼豆设计图纸。",
```

2. Remove the old `promptTemplate` field and add these fields after `palette`:

```ts
    templateKind: "asset_generation",
    referencePolicy: "recommended",
    bestFor: ["单人人像", "主体轮廓明确的角色或物品"],
    avoidFor: ["复杂多人场景", "主体边界不清晰的照片"],
    promptSections: {
      taskGoal:
        "基于用户上传的参考图片，生成一个专业 2D 拼豆图案设计图纸。",
      inputFit:
        "本模板适合单人人像、主体轮廓明确的角色、宠物或物品。若参考图包含复杂多人场景，则只选择最清晰的主要主体进行拼豆图纸化。",
      referenceRules:
        "参考图已作为图像输入提供。请保留主体的发型、面部气质、服装方向、轮廓比例、代表性色块和整体辨识度。参考图用于提取主体特征，不需要保留真实照片背景和光影。",
      styleRules:
        "整体采用清爽的 2D 像素拼豆蓝图风格，白色或浅色背景，干净、平整、无写实阴影。画面应像可执行的拼豆设计稿，而不是像素艺术海报。",
      compositionRules:
        "主体显示在完美的 45x45 网格矩阵中。每个拼豆像素必须具有清晰、干净、不模糊的边界。画布左侧放置垂直色板/图例，展示带准确编号的颜色方块，例如 #01、#02、#03。主体应完整居中，留出图纸边距。",
      userPromptRules:
        "用户额外需求主要用于指定保留的服装、表情、配色偏好、主体姿态或希望出现在色板中的关键颜色。",
      conflictRules:
        "如果用户额外需求要求写实照片效果，优先保持拼豆图纸输出。如果用户要求超出 45x45 的复杂细节，请简化为可读的拼豆像素块。",
      qualityRules:
        "网格清晰、像素边界锐利、色板编号可读、主体轮廓明确、色块数量合理、图纸布局专业整洁。",
      negativeRules:
        "输出必须是拼豆图纸，不是写实照片。不要模糊网格。不要生成复杂背景。不要生成乱码编号。不要添加无关人物、水印或 Logo。",
    },
```

- [ ] **Step 8: Reconstruct theme-04**

In the `theme-04` object, remove the old `promptTemplate` field and add these fields after `palette`:

```ts
    templateKind: "reference_edit",
    referencePolicy: "required",
    bestFor: ["旅行照片", "街景或景点中的单人照片", "主体和背景都有记忆点的照片"],
    avoidFor: ["纯白背景证件照", "无场景信息的近距离自拍", "多人拥挤合照"],
    promptSections: {
      taskGoal:
        "基于用户上传的旅行参考照片，生成一张保留真实底图的旅行手账风格 Q 版拼贴画。",
      inputFit:
        "本模板适合旅行照片、街景照片、景点照片或具有明确地点记忆的单人照片。若参考图缺少旅行场景信息，则保留人物和可识别背景，并用轻量贴纸补足手账氛围。",
      referenceRules:
        "参考图已作为图像输入提供。请保留真实照片作为底图，保持原始人物身份、面部特征、表情、体型、姿势、服装、光影和真实背景结构。不要替换真实旅行场景，不要重绘人物面部，不要改变照片中的地点关系。",
      styleRules:
        "整体采用轻盈、治愈、通透、可爱的旅行手账拼贴风格。叠加白色和柔和粉色为主的手绘贴纸、胶带纸、路线虚线、定位图标、星星、爱心、闪光、小飞机、箭头和手绘圆圈。",
      compositionRules:
        "添加 4 到 7 个同一人物的可爱 Q 版迷你形象，每个迷你角色都基于参考图中的同一个人，并保持一致的面部特征、发型、服装细节和个性。迷你角色可以做拍照、看地图、拉行李箱、喝咖啡、欣赏风景、摆姿势、查看导航或开心跳跃等自然旅行小动作。",
      userPromptRules:
        "用户额外需求主要用于指定旅行地点、想保留的道具、手写短语、贴纸主题、迷你角色动作或整体心情。",
      conflictRules:
        "如果用户额外需求与真实照片底图冲突，优先保留真实照片和人物身份。如果用户要求添加中文短语，每条中文短语控制在 4 到 10 个汉字，短语要自然、有生活感、清晰可读。",
      qualityRules:
        "照片底图清晰、Q 版角色精致、贴纸边缘干净、中文短语可读、画面通透、层次轻盈、真实照片和手账元素融合自然。",
      negativeRules:
        "不要替换真实旅行场景。不要改变人物身份。不要生成多余真实人物。不要输出错别字、乱码、重复字符、水印或无关 Logo。不要让贴纸遮挡面部和关键景点。",
    },
```

- [ ] **Step 9: Reconstruct theme-05**

In the `theme-05` object, remove the old `promptTemplate` field and add these fields after `palette`:

```ts
    templateKind: "reference_transform",
    referencePolicy: "recommended",
    bestFor: ["人物、宠物、物品或简单场景", "主体轮廓明确的照片"],
    avoidFor: ["文字截图", "复杂表格", "细节极密的群像照片"],
    promptSections: {
      taskGoal:
        "基于用户上传的参考图片，生成一张 10 岁孩子手绘般的白纸蜡笔幻想插画。",
      inputFit:
        "本模板适合人物、宠物、物品或简单场景。若参考图细节过多，则保留最主要主体和轮廓，主动简化背景和复杂纹理。",
      referenceRules:
        "参考图已作为图像输入提供。请保留原图主体的基本轮廓、姿态、主要特征和可辨识气质。参考图用于识别主体，不要求保留原始配色、写实光影或复杂背景。",
      styleRules:
        "整体采用 10 岁孩子手绘般的蜡笔幻想插画风格。画面在干净白纸背景上呈现明亮、活泼、略带瑕疵的蜡笔色。保留蜡笔颗粒感、涂抹不均和轻微涂出边界的手作痕迹。",
      compositionRules:
        "主体造型简洁、亲切、轮廓清楚，可以加入城堡、塔楼、糖果、星星、云朵、彩虹、小花或太阳等童趣幻想元素。构图保持空白感，不需要复杂透视。",
      userPromptRules:
        "用户额外需求主要用于指定童趣元素、想保留的主体特征、画面颜色、幻想道具或故事氛围。",
      conflictRules:
        "如果用户额外需求要求写实、精修或复杂商业插画效果，优先保持儿童蜡笔画风格。如果用户要求保留原图颜色，可以只保留代表性色彩，不复制真实照片配色。",
      qualityRules:
        "主体可辨识、色彩干净、蜡笔质感明显、白纸背景清爽、细节可爱但不过度精修、整体充满孩童般想象力。",
      negativeRules:
        "不要做成专业写实插画。不要使用复杂真实阴影。不要过度精修。不要输出水印、乱码、无关文字或 Logo。不要让主体失去基本辨识度。",
    },
```

- [ ] **Step 10: Wrap all theme objects with `createTheme()`**

Change the `THEMES` array so each object is wrapped by `createTheme(...)`.

Example shape for `theme-01`:

```ts
const THEMES: AiImageThemeDefinition[] = [
  createTheme({
    id: "theme-01",
    name: "互动照片涂鸦",
    description: "保留原照片主体，在画面上加入会互动的手绘涂鸦和俏皮手写感元素。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-01-interactive-photo-doodle.webp",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 1,
    tag: "涂鸦",
    palette: ["#fef3c7", "#111827", "#38bdf8"],
    templateKind: "reference_edit",
    referencePolicy: "required",
    bestFor: ["主体明确的生活照片", "人物、宠物、物品或运动瞬间"],
    avoidFor: ["主体过小的远景照片", "文字密集截图"],
    promptSections: {
      taskGoal: "基于用户上传的参考图片，生成一张保留原照片真实主体的互动照片涂鸦作品。",
      inputFit:
        "本模板适合主体明确的生活照片、人物照片、宠物照片、物品照片或运动瞬间。若参考图主体过小、画面信息极乱或主要内容是文字截图，则优先保留可识别主体并减少涂鸦密度。",
      referenceRules:
        "参考图已作为图像输入提供。请分析并保留原始主体、构图关系和真实光影，保留人物或物体的核心辨识度、姿态方向、主要色彩关系和场景氛围。参考图用于确定主体、空间层次和可互动元素，不要替换主体身份，不要重绘成完全不同场景。",
      styleRules:
        "整体采用真实照片叠加手绘涂鸦的社交媒体创意风格。涂鸦应有机、略显不均匀、带随性手绘笔触，颜色鲜明但要与原图自然协调。画面可以加入俏皮手写感元素，但文字应短、清楚、与场景氛围相关。",
      compositionRules:
        "保持原照片主体清晰，涂鸦围绕主体动作、轮廓或场景元素展开。手绘线条可以勾勒姿势、延伸动作、添加运动线、表情符号、箭头、小星星或与主体互动的小元素。涂鸦不能遮挡面部、关键物体或用户强调需要保留的细节。",
      userPromptRules:
        "用户额外需求主要用于指定涂鸦主题、手写短语、情绪氛围、需要保留的物体或希望强化的互动方向。",
      conflictRules:
        "如果用户额外需求与参考图主体身份或关键细节冲突，优先保留参考图。若用户要求增加文字，请生成简短自然的中文或符号，不要输出长句和宣传口号。",
      qualityRules:
        "高分辨率、主体清晰、涂鸦边缘干净、手写元素可读、照片和涂鸦层次自然融合、色彩鲜明但不脏乱。",
      negativeRules:
        "不要改变主体身份。不要覆盖面部和关键细节。不要生成水印、乱码、长段文字或无关 Logo。不要把照片完全重绘成插画。不要添加与场景无关的多余人物。",
    },
  }),
];
```

All other theme entries should follow the same `createTheme({ ... })` wrapper. Legacy entries from `theme-06` to `theme-13` keep their existing `promptTemplate` string because `promptSections` is absent.

- [ ] **Step 11: Fix `createTheme()` so legacy theme prompt strings are preserved**

The `createTheme()` helper from Step 3 needs to support legacy theme drafts that still include `promptTemplate`. Replace the helper types and function with:

```ts
type StructuredAiImageThemeDraft = Omit<AiImageThemeDefinition, "promptTemplate"> & {
  promptSections: AiImagePromptSections;
};

type LegacyAiImageThemeDraft = Omit<AiImageThemeDefinition, "promptSections"> & {
  promptSections?: undefined;
};

type AiImageThemeDraft = StructuredAiImageThemeDraft | LegacyAiImageThemeDraft;

function createTheme(theme: AiImageThemeDraft): AiImageThemeDefinition {
  if (theme.promptSections) {
    return {
      ...theme,
      promptTemplate: buildStructuredPromptTemplate(theme.promptSections),
    };
  }

  return theme;
}
```

- [ ] **Step 12: Run theme tests to verify they pass**

Run:

```bash
npm test -- __tests__/ai-image-themes.test.ts
```

Expected: PASS.

- [ ] **Step 13: Run prompt-related tests together**

Run:

```bash
npm test -- __tests__/ai-image-prompt-template.test.ts __tests__/ai-image-prompt.test.ts __tests__/ai-image-themes.test.ts
```

Expected: PASS.

- [ ] **Step 14: Commit Task 3**

Run:

```bash
git add lib/gamification/ai-image/themes.ts __tests__/ai-image-themes.test.ts
git commit -m "feat: reconstruct first AI image themes"
```

Expected: commit succeeds.

---

### Task 4: Document Future Prompt Intake Rules

**Files:**
- Create: `docs/ai-image-theme-prompt-guidelines.md`

- [ ] **Step 1: Create the prompt guidelines document**

Create `docs/ai-image-theme-prompt-guidelines.md`:

```md
# AI 生图 Theme Prompt 准入规范

本文档规定 `lib/gamification/ai-image/themes.ts` 中 theme prompt 的准入流程。外部收集来的生图提示词不能直接进入项目，必须先完成结构化 reconstruct。

## 核心原则

theme 负责生成行为和视觉方向，用户只需要提供两类输入：

- 参考图
- 用户额外补充输入

服务端 prompt 必须解释这两类输入如何参与生成，并明确冲突时的优先级。

## templateKind

`templateKind` 表示生成行为，不表示视觉风格。

当前允许值：

- `reference_edit`：保留参考图结构，在图上做叠加、编辑或拼贴。
- `reference_transform`：基于参考图主体重绘成另一种风格。
- `creative_poster`：基于参考图主体生成创意海报，允许重构构图、背景和镜头。
- `scene_generation`：主要依赖主题和用户描述直接生成场景。
- `asset_generation`：生成贴纸、拼豆图纸、头像、素材包等资产型输出。

不要因为视觉风格新增 `templateKind`。例如日系动漫、赛博健身、旅行手账、冷感时装都属于具体 theme 或 style rules。

只有当参考图使用方式、prompt 拼装结构、UI 提示、输出物类型或 provider 调用方式发生变化时，才新增 `templateKind`。

## 标准 prompt sections

结构化 theme 必须填写以下 sections：

1. `taskGoal`：任务目标。
2. `inputFit`：输入适配，说明适合和不适合的参考图。
3. `referenceRules`：参考图使用规则，说明保留什么、允许改什么。
4. `styleRules`：固定视觉风格。
5. `compositionRules`：固定画面规则。
6. `userPromptRules`：用户额外需求的作用边界。
7. `conflictRules`：参考图、主题和用户补充冲突时的优先级。
8. `qualityRules`：输出质量要求。
9. `negativeRules`：限制条件。

编译后的 prompt 会自动插入：

```txt
【用户额外需求】
{{user_instruction}}
```

运行时由 `buildPromptSnapshot()` 将 `{{user_instruction}}` 替换为用户补充输入。参考图不使用文本占位符，因为参考图已经作为图像输入传给生图服务。

## 外部 prompt reconstruct 流程

每个外部 prompt 进入项目之前，按以下顺序处理：

1. 保留原始 prompt 作为分析材料。
2. 去样张化：删除固定人物身份、固定性别、固定发色、固定服装、固定姿势和固定背景。
3. 判断 `templateKind`。
4. 判断 `referencePolicy`。
5. 填写 `bestFor` 和 `avoidFor`。
6. 拆分进标准 prompt sections。
7. 明确用户额外输入可以修改什么。
8. 明确用户额外输入不能覆盖什么。
9. 加入冲突处理规则。
10. 加入限制条件。
11. 写测试断言关键字段、关键 prompt 段落和危险样张词已经移除。

## 新 theme 准入检查

提交新 theme 前，必须能回答这些问题：

- 它属于哪个 `templateKind`？
- 它是否需要参考图？
- 它最适合什么输入？
- 它不适合什么输入？
- 用户额外输入可以修改什么？
- 用户额外输入不能覆盖什么？
- 参考图和用户输入冲突时谁优先？
- 是否仍然包含外部样张里的固定人物、固定姿势或固定服装？

## 优先级

生成时遵循以下优先级：

```txt
参考图身份和关键细节 > 主题核心意图 > 用户额外补充 > 风格细节
```

如果 theme 是 `scene_generation` 且 `referencePolicy` 为 `optional`，参考图身份保留规则可以弱化，但必须在 `inputFit` 和 `referenceRules` 中写清楚。
```

- [ ] **Step 2: Verify the document contains the required rule names**

Run:

```bash
rg -n "templateKind|referencePolicy|bestFor|avoidFor|reconstruct|buildPromptSnapshot|用户额外需求" docs/ai-image-theme-prompt-guidelines.md
```

Expected: output includes all searched terms at least once.

- [ ] **Step 3: Commit Task 4**

Run:

```bash
git add docs/ai-image-theme-prompt-guidelines.md
git commit -m "docs: add AI image prompt intake rules"
```

Expected: commit succeeds.

---

### Task 5: Final Verification

**Files:**
- Verify only; no new files.

- [ ] **Step 1: Run focused prompt tests**

Run:

```bash
npm test -- __tests__/ai-image-prompt-template.test.ts __tests__/ai-image-prompt.test.ts __tests__/ai-image-themes.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript lint**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff --stat HEAD~4..HEAD
git diff --check HEAD~4..HEAD
```

Expected: `git diff --check` exits with no whitespace errors. The stat should include only:

```txt
__tests__/ai-image-prompt-template.test.ts
__tests__/ai-image-prompt.test.ts
__tests__/ai-image-themes.test.ts
docs/ai-image-theme-prompt-guidelines.md
lib/gamification/ai-image/prompt-template.ts
lib/gamification/ai-image/prompt.ts
lib/gamification/ai-image/themes.ts
lib/gamification/ai-image/types.ts
```

- [ ] **Step 5: Report verification result**

Report:

```txt
已完成 AI 生图 theme prompt 结构化重构计划中的实现。

完成内容：
- 新增结构化 prompt sections 和编译器。
- `buildPromptSnapshot()` 支持 `{{user_instruction}}` 注入并兼容旧 prompt。
- `theme-01` 到 `theme-05` 已重构为结构化模板。
- 新增未来外部 prompt reconstruct 准入规范。

验证：
- npm test -- __tests__/ai-image-prompt-template.test.ts __tests__/ai-image-prompt.test.ts __tests__/ai-image-themes.test.ts
- npm test
- npm run lint
```

---

## Self-Review

Spec coverage:

- 结构化 prompt 固定段落：Task 1。
- 用户只暴露参考图和额外补充输入：Task 2 和 Task 4。
- 先重构 `theme-01` 到 `theme-05`：Task 3。
- 未来外部 prompt 必须 reconstruct 后准入：Task 4。
- 兼容 `theme-06` 到 `theme-13`：Task 2 和 Task 3。

Placeholder scan:

- 本计划没有使用未定义的占位任务。
- 代码中的 `{{user_instruction}}` 是运行时槽位，不是计划占位。

Type consistency:

- `AiImageTemplateKind`、`AiImageReferencePolicy`、`AiImagePromptSections` 在 Task 1 定义。
- `buildStructuredPromptTemplate()` 和 `USER_PROMPT_PLACEHOLDER` 在 Task 1 定义，并在 Task 2 与 Task 3 使用。
- `promptSections`、`bestFor`、`avoidFor` 在 Task 3 的 clone 逻辑中保持可复制。
