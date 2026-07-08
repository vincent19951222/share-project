// @vitest-environment node

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { toClientThemeSnapshot } from "@/lib/gamification/ai-image/theme-snapshot";
import { getAiImageThemeById, getAiImageThemes } from "@/lib/gamification/ai-image/themes";

describe("AI image preset themes", () => {
  it("loads 13 enabled presets with every theme available by default", () => {
    const themes = getAiImageThemes();

    expect(themes).toHaveLength(13);
    expect(themes.filter((theme) => theme.defaultUnlocked)).toHaveLength(13);
    expect(themes.every((theme) => theme.enabled)).toBe(true);
    expect(themes.every((theme) => theme.previewImageUrl.includes("/images/"))).toBe(true);
    expect(themes[0]?.previewImageUrl).toBe(
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-01-interactive-photo-doodle.webp",
    );
    expect(themes[12]?.previewImageUrl).toBe(
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-13-editorial-grid.webp",
    );
  });

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

  it("configures theme-06 as a structured Xiaohongshu experience cover preset", () => {
    const theme = getAiImageThemeById("theme-06");

    expect(theme).toMatchObject({
      id: "theme-06",
      name: "小红书体验封面",
      description: "基于参考图和文字内容生成第一人称体验感的小红书竖版封面。",
      tag: "封面",
      templateKind: "creative_poster",
      referencePolicy: "optional",
      bestFor: ["个人 IP 参考图", "工具、AI、效率、产品、方法或生活观察内容"],
      avoidFor: ["需要写实照片输出的任务", "多人合照或商业导师风形象"],
      previewImageUrl:
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-06-xiaohongshu-experience-cover.webp",
      palette: ["#fde047", "#111827", "#ffffff"],
    });
    expect(theme?.promptTemplate).toContain("小红书竖版封面");
    expect(theme?.promptTemplate).toContain("从“我试了型”“我做了型”“我懂了型”中自动选择 1 种");
    expect(theme?.promptTemplate).toContain("黑色短发、圆框眼镜、温和聪明且松弛的男生气质");
    expect(theme?.promptTemplate).toContain("用户额外需求主要用于提供主题、体验、工具、产品、方法、生活观察或想表达的内容");
    expect(theme?.promptTemplate).toContain("所有中文必须清晰可读");
    expect(theme?.promptTemplate).not.toContain("brutalist fitness poster");
  });

  it("configures theme-07 as a structured PVC figure display preset", () => {
    const theme = getAiImageThemeById("theme-07");

    expect(theme).toMatchObject({
      id: "theme-07",
      name: "PVC 手办展示",
      description: "把参考图角色转换成室内桌面 PVC 手办，并展示包装盒、底座和 Blender 建模屏幕。",
      tag: "手办",
      templateKind: "reference_transform",
      referencePolicy: "required",
      bestFor: ["单个角色或人物参考图", "主体清晰的半身或全身照片"],
      avoidFor: ["多人合照", "主体过小或遮挡严重的照片", "需要保留原始照片背景的任务"],
      previewImageUrl:
        "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-07-emoji-sticker-pack.webp",
      palette: ["#f8fafc", "#111827", "#e5e7eb"],
    });
    expect(theme?.promptTemplate).toContain("圆形塑料底座上的 PVC 角色手办");
    expect(theme?.promptTemplate).toContain("包装盒");
    expect(theme?.promptTemplate).toContain("Blender 建模过程");
    expect(theme?.promptTemplate).toContain("参考图用于设计手办本体、包装盒印刷图和 Blender 建模屏幕中的角色");
    expect(theme?.promptTemplate).toContain("不要漏掉圆形底座、包装盒或电脑建模屏幕");
    expect(theme?.promptTemplate).not.toContain("cute muscular pet mascot");
  });

  it("does not expose promptTemplate in client snapshots", () => {
    const theme = getAiImageThemeById("theme-01");
    expect(theme?.promptTemplate).toContain("手绘涂鸦");

    const snapshot = toClientThemeSnapshot(theme!, true);

    expect(snapshot).toMatchObject({
      id: "theme-01",
      unlocked: true,
      defaultUnlocked: true,
    });
    expect(JSON.stringify(snapshot)).not.toContain("promptTemplate");
    expect(JSON.stringify(snapshot)).not.toContain(theme!.promptTemplate);
  });

  it("keeps prompt-bearing themes behind a server-only module and snapshots in a prompt-free module", () => {
    const themesSource = readFileSync(
      path.join(process.cwd(), "lib/gamification/ai-image/themes.ts"),
      "utf8",
    );
    const promptSource = readFileSync(
      path.join(process.cwd(), "lib/gamification/ai-image/prompt.ts"),
      "utf8",
    );
    const snapshotSource = readFileSync(
      path.join(process.cwd(), "lib/gamification/ai-image/theme-snapshot.ts"),
      "utf8",
    );
    const vitestConfigSource = readFileSync(path.join(process.cwd(), "vitest.config.ts"), "utf8");

    expect(themesSource).toContain('import "server-only";');
    expect(promptSource).toContain('import "server-only";');
    expect(snapshotSource).not.toContain("promptTemplate");
    expect(snapshotSource).not.toContain("server-only");
    expect(snapshotSource).not.toContain('from "@/lib/gamification/ai-image/themes"');
    expect(vitestConfigSource).toContain(
      '"server-only": path.resolve(__dirname, "__tests__/fixtures/server-only-empty.ts")',
    );
    expect(vitestConfigSource).not.toContain("node_modules/next/dist/compiled/server-only/empty.js");
  });

  it("returns cloned theme definitions so caller mutation cannot change preset state", () => {
    const theme = getAiImageThemeById("theme-01")!;
    const originalPalette = [...theme.palette];

    theme.name = "changed";
    theme.palette.push("#000000");

    const freshTheme = getAiImageThemeById("theme-01")!;
    const freshThemes = getAiImageThemes();

    expect(freshTheme.name).toBe("互动照片涂鸦");
    expect(freshTheme.palette).toEqual(originalPalette);
    expect(freshThemes[0].name).toBe("互动照片涂鸦");
    expect(freshThemes[0].palette).toEqual(originalPalette);
  });

  it("returns cloned snapshot palettes so client mutation stays local", () => {
    const theme = getAiImageThemeById("theme-01")!;
    const snapshot = toClientThemeSnapshot(theme, true);

    snapshot.palette.push("#000000");

    const freshSnapshot = toClientThemeSnapshot(getAiImageThemeById("theme-01")!, true);

    expect(freshSnapshot.palette).toEqual(["#fef3c7", "#111827", "#38bdf8"]);
  });
});
