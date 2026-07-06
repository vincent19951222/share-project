import "server-only";

import type { AiImageThemeDefinition } from "@/lib/gamification/ai-image/types";

const THEMES: AiImageThemeDefinition[] = [
  {
    id: "theme-01",
    name: "牛马像素馆",
    description: "把照片或文字变成粗边框像素健身角色。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_120.png",
    promptTemplate:
      "8-bit pixel art fitness poster, chunky black outlines, bold yellow and charcoal blocks, playful Chinese fitness team energy, clean composition.",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 1,
    tag: "像素",
    palette: ["#fde047", "#1f2937", "#f8fafc"],
  },
  {
    id: "theme-02",
    name: "工地减脂风",
    description: "安全帽、反光马甲、杠铃和水泥灰的硬核减脂照。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_020.png",
    promptTemplate:
      "construction-site fat-loss poster, hard hat, reflective vest, barbell, concrete gray, fluorescent yellow, bold brutalist typography feeling.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 2,
    tag: "硬核",
    palette: ["#facc15", "#525252", "#22c55e"],
  },
  {
    id: "theme-03",
    name: "低脂美食拟人",
    description: "鸡胸肉、西兰花和鸡蛋变成训练搭子。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coins_005.png",
    promptTemplate:
      "healthy low-fat food characters training together, chicken breast, broccoli, egg, humorous mascot style, bright editorial composition.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 3,
    tag: "食物",
    palette: ["#86efac", "#fef3c7", "#111827"],
  },
  {
    id: "theme-04",
    name: "复古港风健身达人",
    description: "90 年代港风海报质感的训练大片。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_task_reroll_coupon.png",
    promptTemplate:
      "1990s Hong Kong movie poster fitness portrait, warm film grain, dramatic gym lighting, retro Chinese poster mood.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 4,
    tag: "港风",
    palette: ["#f97316", "#0f172a", "#fef2f2"],
  },
  {
    id: "theme-05",
    name: "办公室减脂",
    description: "工位、电脑和偷偷训练的小动作。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_small_boost_coupon.png",
    promptTemplate:
      "office worker stealth fitness scene, desk, monitor, resistance band, humorous but polished, modern Chinese workplace energy.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 5,
    tag: "工位",
    palette: ["#38bdf8", "#f8fafc", "#334155"],
  },
  {
    id: "theme-06",
    name: "Brutalist 海报",
    description: "粗字体、强对比、几何图形的训练宣言。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_coin_rich_coupon.png",
    promptTemplate:
      "brutalist fitness poster, huge bold typography feeling, strict grid, chunky border, yellow black white red accents, no generic neon.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 6,
    tag: "海报",
    palette: ["#fde047", "#111827", "#ef4444"],
  },
  {
    id: "theme-07",
    name: "肌肉萌宠",
    description: "宠物拟人举铁，轻松搞笑但不幼稚。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_team_invite_card.png",
    promptTemplate:
      "cute muscular pet mascot lifting weights, funny gym energy, expressive character design, polished illustration, bold outlines.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 7,
    tag: "萌宠",
    palette: ["#f9a8d4", "#fef08a", "#374151"],
  },
  {
    id: "theme-08",
    name: "瑜伽仙人",
    description: "东方修仙和瑜伽动作结合的轻盈场景。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_team_spark.png",
    promptTemplate:
      "eastern immortal yoga master, elegant stretching pose, misty mountain training ground, refined Chinese fantasy fitness poster.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 8,
    tag: "瑜伽",
    palette: ["#a7f3d0", "#c4b5fd", "#1f2937"],
  },
  {
    id: "theme-09",
    name: "赛博健身海报",
    description: "未来训练房和机械感灯牌，避开泛霓虹廉价感。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_leave_shield.png",
    promptTemplate:
      "cyber fitness poster, disciplined futuristic gym, mechanical light signage, sharp composition, restrained neon, premium sports editorial.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 9,
    tag: "赛博",
    palette: ["#22d3ee", "#111827", "#eab308"],
  },
  {
    id: "theme-10",
    name: "暴汗训练场",
    description: "训练后暴汗、灯牌和团队口号的现场感。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_boss_ticket.png",
    promptTemplate:
      "sweaty training arena, team slogan lightbox, post-workout energy, cinematic sports scene, bold local fitness community.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 10,
    tag: "暴汗",
    palette: ["#fb7185", "#f97316", "#111827"],
  },
  {
    id: "theme-11",
    name: "牛马漫画格",
    description: "四格漫画感，把训练瞬间变成吐槽剧情。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_meal_coupon.png",
    promptTemplate:
      "comic panel fitness story, four-panel energy, expressive Chinese captions feeling without readable text, funny workout struggle.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 11,
    tag: "漫画",
    palette: ["#ffffff", "#111827", "#60a5fa"],
  },
  {
    id: "theme-12",
    name: "训练贴纸包",
    description: "把人或物做成可爱的健身贴纸资产。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_priority_badge.png",
    promptTemplate:
      "fitness sticker pack style, clean cutout, white sticker border, playful gym accessories, transparent-background feeling.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 12,
    tag: "贴纸",
    palette: ["#fef3c7", "#34d399", "#111827"],
  },
  {
    id: "theme-13",
    name: "团队战报封面",
    description: "生成一张适合晒到团队战报里的封面图。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_gamification_rewards_icons_luckin_coffee.png",
    promptTemplate:
      "team fitness report cover, editorial layout, bold title space without readable text, achievement atmosphere, yellow black accent colors.",
    defaultUnlocked: false,
    enabled: true,
    sortOrder: 13,
    tag: "战报",
    palette: ["#fde047", "#0f172a", "#f8fafc"],
  },
];

function cloneTheme(theme: AiImageThemeDefinition): AiImageThemeDefinition {
  return {
    ...theme,
    palette: [...theme.palette],
  };
}

export function getAiImageThemes() {
  return [...THEMES].sort((left, right) => left.sortOrder - right.sortOrder).map(cloneTheme);
}

export function getAiImageThemeById(themeId: string) {
  const theme = THEMES.find((entry) => entry.id === themeId);

  return theme ? cloneTheme(theme) : null;
}

export function getDefaultUnlockedAiImageThemeIds() {
  return THEMES
    .filter((theme) => theme.enabled && theme.defaultUnlocked)
    .map((theme) => theme.id);
}
