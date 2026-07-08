import "server-only";

import { buildStructuredPromptTemplate } from "@/lib/gamification/ai-image/prompt-template";
import type {
  AiImagePromptSections,
  AiImageThemeDefinition,
} from "@/lib/gamification/ai-image/types";

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
        "保持原照片主体清晰，手绘涂鸦要与参考图中的主体产生直接互动，并围绕主体动作、轮廓或场景元素展开。手绘线条可以勾勒姿势、延伸动作、添加运动线、表情符号、箭头、小星星或与主体互动的小元素。涂鸦不能遮挡面部、关键物体或用户强调需要保留的细节。",
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
  createTheme({
    id: "theme-02",
    name: "冷感时装肖像",
    description: "基于单人人像参考图生成高级时尚杂志质感的冷色调棚拍肖像。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-02-cold-fashion-portrait.webp",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 2,
    tag: "时尚",
    palette: ["#f8fafc", "#111827", "#cbd5e1"],
    templateKind: "creative_poster",
    referencePolicy: "recommended",
    bestFor: ["单人人像", "主体清晰的半身或全身照片"],
    avoidFor: ["多人合照", "非人物照片", "面部遮挡严重的照片"],
    promptSections: {
      taskGoal: "基于用户上传的单人人像参考图片，生成一张冷色调高级时尚杂志棚拍肖像。",
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
  }),
  createTheme({
    id: "theme-03",
    name: "像素拼豆图纸",
    description: "把参考人像或主体转换成带编号色板和 45x45 网格的专业 2D 拼豆设计图纸。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-03-pixel-bead-blueprint.webp",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 3,
    tag: "拼豆",
    palette: ["#f8fafc", "#0f172a", "#60a5fa"],
    templateKind: "asset_generation",
    referencePolicy: "recommended",
    bestFor: ["单人人像", "主体轮廓明确的角色或物品"],
    avoidFor: ["复杂多人场景", "主体边界不清晰的照片"],
    promptSections: {
      taskGoal: "基于用户上传的参考图片，生成一个专业 2D 拼豆图案设计图纸。",
      inputFit:
        "本模板适合单人人像、主体轮廓明确的角色、宠物或物品。若参考图包含复杂多人场景，则只选择最清晰的主要主体进行拼豆图纸化。",
      referenceRules:
        "参考图已作为图像输入提供。请保留主体的发型、面部气质、服装方向、轮廓比例、代表性色块和整体辨识度。参考图用于提取主体特征，不需要保留真实照片背景和光影。",
      styleRules:
        "整体采用清爽的 2D 像素拼豆蓝图风格，白色或浅色背景，干净、平整、无写实阴影。画面应像可执行的拼豆设计稿，而不是像素艺术海报。",
      compositionRules:
        "主体显示在完美的 45x45 网格矩阵中。每个拼豆像素必须具有清晰、干净、不模糊的边界。画布左侧垂直色板/图例展示带准确编号的颜色方块，例如 #01、#02、#03。主体应完整居中，留出图纸边距。",
      userPromptRules:
        "用户额外需求主要用于指定保留的服装、表情、配色偏好、主体姿态或希望出现在色板中的关键颜色。",
      conflictRules:
        "如果用户额外需求要求写实照片效果，优先保持拼豆图纸输出。如果用户要求超出 45x45 的复杂细节，请简化为可读的拼豆像素块。",
      qualityRules:
        "网格清晰、像素边界锐利、色板编号可读、主体轮廓明确、色块数量合理、图纸布局专业整洁。",
      negativeRules:
        "输出必须是拼豆图纸，不是写实照片。不要模糊网格。不要生成复杂背景。不要生成乱码编号。不要添加无关人物、水印或 Logo。",
    },
  }),
  createTheme({
    id: "theme-04",
    name: "旅行手账拼贴",
    description: "保留旅行照片底图，叠加同一人物的 Q 版迷你分身、贴纸和手写旅行笔记。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-04-travel-journal-chibi-collage.webp",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 4,
    tag: "旅行",
    palette: ["#ffffff", "#f9a8d4", "#60a5fa"],
    templateKind: "reference_edit",
    referencePolicy: "required",
    bestFor: ["旅行照片", "街景或景点中的单人照片", "主体和背景都有记忆点的照片"],
    avoidFor: ["纯白背景证件照", "无场景信息的近距离自拍", "多人拥挤合照"],
    promptSections: {
      taskGoal: "基于用户上传的旅行参考照片，生成一张保留真实底图的旅行手账风格 Q 版拼贴画。",
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
  }),
  createTheme({
    id: "theme-05",
    name: "童趣蜡笔画",
    description: "把参考图重绘成 10 岁孩子手绘般的白纸蜡笔幻想插画。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-05-childlike-crayon-fantasy.webp",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 5,
    tag: "蜡笔",
    palette: ["#ffffff", "#fb7185", "#60a5fa"],
    templateKind: "reference_transform",
    referencePolicy: "recommended",
    bestFor: ["人物、宠物、物品或简单场景", "主体轮廓明确的照片"],
    avoidFor: ["文字截图", "复杂表格", "细节极密的群像照片"],
    promptSections: {
      taskGoal: "基于用户上传的参考图片，生成一张 10 岁孩子手绘般的白纸蜡笔幻想插画。",
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
  }),
  createTheme({
    id: "theme-06",
    name: "小红书体验封面",
    description: "基于参考图和文字内容生成第一人称体验感的小红书竖版封面。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-06-magazine-cover.webp",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 6,
    tag: "封面",
    palette: ["#fde047", "#111827", "#ffffff"],
    templateKind: "creative_poster",
    referencePolicy: "optional",
    bestFor: ["个人 IP 参考图", "工具、AI、效率、产品、方法或生活观察内容"],
    avoidFor: ["需要写实照片输出的任务", "多人合照或商业导师风形象"],
    promptSections: {
      taskGoal:
        "基于用户上传的参考图和文字内容，单轮生成一张适合小红书发布的 3:4 竖版体验封面。不要追问，不要确认，不要输出多个方案，直接基于已有信息自动补全并生成最终封面。",
      inputFit:
        "本模板适合分享 life experience 的个人 IP 账号，内容可以是工具、AI、效率、产品、方法、生活观察、创作过程或想表达的小结论。它不是传统知识付费封面，也不是纯生活 Vlog 封面，而是“我试过了”“我做出来了”“我想明白了”的真实体验分享。",
      referenceRules:
        "参考图已作为图像输入提供。若用户上传参考图，请保持参考图中的固定 IP 角色一致性：黑色短发、圆框眼镜、温和聪明且松弛的男生气质、轻漫画头像或半身人物风格、深色外套或简洁日常穿搭。不要改成写实照片，不要变成陌生角色，不要变成夸张萌系，不要变成商业导师风。若用户没有上传参考图，则自动生成一个符合上述气质的轻漫画男生 IP 博主形象。",
      styleRules:
        "整体采用小红书竖版封面风格、轻漫画 IP 贴纸风、高亮度低复杂度背景、商业插画海报质感。语气和视觉都要像朋友分享真实体验：轻松、真实、有一点吐槽感，不像老师上课。标题风格是第一人称体验感加轻吐槽趣味感。",
      compositionRules:
        "画面比例为 3:4。IP 人物以前景抠图贴纸形式出现，占画面 40% 到 60%，人物带粗白色描边，不要裁脸。中文主标题占画面 25% 到 40%，必须大、清晰、高对比，使用粗黑体、贴纸字或气泡字，并带白描边、轻微阴影或贴纸感。根据用户内容从“我试了型”“我做了型”“我懂了型”中自动选择 1 种标题方向，并生成一个 4 到 12 个字优先的第一人称中文主标题。根据内容选择 2 到 4 个标签短句，以小贴纸、小纸条或手写标签形式出现，不要全部堆上去。",
      userPromptRules:
        "用户额外需求主要用于提供主题、体验、工具、产品、方法、生活观察或想表达的内容，并驱动封面类型、标题、标签、背景和装饰元素。工具、AI、效率内容适合书桌、电脑前、工作台或简洁科技感背景；实践、流程、模板内容适合电脑屏幕、便签、流程卡片或清单背景；生活观察内容适合咖啡店、居家角落、街边、书桌或温暖生活场景。",
      conflictRules:
        "如果用户额外需求与参考图 IP 形象冲突，优先保持 IP 角色一致性。如果用户文字更像试用体验，从“我试了型”生成标题；如果更像完成结果，从“我做了型”生成标题；如果更像经验复盘或观察总结，从“我懂了型”生成标题。标题要有真实体验感、轻吐槽、轻反差或轻松感，避免过度营销、夸张鸡血、老师讲课感、虚浮成功学、月入百万或爆款秘籍等表达。",
      qualityRules:
        "所有中文必须清晰可读。画面明亮、干净、饱满但保留呼吸空间。背景低复杂度，可以轻微虚化。只选择 2 到 4 个相关装饰元素，例如手绘箭头、重点圈选、小纸条、对话气泡、星星、感叹号、工具界面小卡片、清单卡片或涂鸦下划线。根据主题自动选择一种高对比配色：黑白黄、蓝白黑、绿白黑、粉白黑或米白黑黄。柔和自然光、轻微轮廓光、真实生活感与轻微 AI 海报感结合。",
      negativeRules:
        "不要脸崩、手崩、五官变形、眼镜变形、角色偏离参考图、裁脸、裁标题、让文字压住人物五官。不要生成中文乱码、英文乱码、假中文、无意义文字、水印、Logo、二维码。不要画面过空、画面过乱、标题不可读、装饰元素过多。不要输出分析过程，不要输出多个方案，不要询问用户，不要解释设计原因。",
    },
  }),
  createTheme({
    id: "theme-07",
    name: "肌肉萌宠",
    description: "宠物拟人举铁，轻松搞笑但不幼稚。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-07-emoji-sticker-pack.webp",
    promptTemplate:
      "cute muscular pet mascot lifting weights, funny gym energy, expressive character design, polished illustration, bold outlines.",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 7,
    tag: "萌宠",
    palette: ["#f9a8d4", "#fef08a", "#374151"],
    templateKind: "scene_generation",
    referencePolicy: "optional",
    bestFor: ["文字描述明确的健身主题场景"],
    avoidFor: ["需要严格保留人物身份的参考图"],
  }),
  createTheme({
    id: "theme-08",
    name: "瑜伽仙人",
    description: "东方修仙和瑜伽动作结合的轻盈场景。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-08-pixel-avatar-collage.webp",
    promptTemplate:
      "eastern immortal yoga master, elegant stretching pose, misty mountain training ground, refined Chinese fantasy fitness poster.",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 8,
    tag: "瑜伽",
    palette: ["#a7f3d0", "#c4b5fd", "#1f2937"],
    templateKind: "scene_generation",
    referencePolicy: "optional",
    bestFor: ["文字描述明确的健身主题场景"],
    avoidFor: ["需要严格保留人物身份的参考图"],
  }),
  createTheme({
    id: "theme-09",
    name: "赛博健身海报",
    description: "未来训练房和机械感灯牌，避开泛霓虹廉价感。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-09-doodle-illustration.webp",
    promptTemplate:
      "cyber fitness poster, disciplined futuristic gym, mechanical light signage, sharp composition, restrained neon, premium sports editorial.",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 9,
    tag: "赛博",
    palette: ["#22d3ee", "#111827", "#eab308"],
    templateKind: "scene_generation",
    referencePolicy: "optional",
    bestFor: ["文字描述明确的健身主题场景"],
    avoidFor: ["需要严格保留人物身份的参考图"],
  }),
  createTheme({
    id: "theme-10",
    name: "暴汗训练场",
    description: "训练后暴汗、灯牌和团队口号的现场感。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-10-cinematic-still.webp",
    promptTemplate:
      "sweaty training arena, team slogan lightbox, post-workout energy, cinematic sports scene, bold local fitness community.",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 10,
    tag: "暴汗",
    palette: ["#fb7185", "#f97316", "#111827"],
    templateKind: "scene_generation",
    referencePolicy: "optional",
    bestFor: ["文字描述明确的健身主题场景"],
    avoidFor: ["需要严格保留人物身份的参考图"],
  }),
  createTheme({
    id: "theme-11",
    name: "牛马漫画格",
    description: "四格漫画感，把训练瞬间变成吐槽剧情。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-11-graffiti-revival.webp",
    promptTemplate:
      "comic panel fitness story, four-panel energy, expressive Chinese captions feeling without readable text, funny workout struggle.",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 11,
    tag: "漫画",
    palette: ["#ffffff", "#111827", "#60a5fa"],
    templateKind: "scene_generation",
    referencePolicy: "optional",
    bestFor: ["文字描述明确的健身主题场景"],
    avoidFor: ["需要严格保留人物身份的参考图"],
  }),
  createTheme({
    id: "theme-12",
    name: "训练贴纸包",
    description: "把人或物做成可爱的健身贴纸资产。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-12-contact-sheet.webp",
    promptTemplate:
      "fitness sticker pack style, clean cutout, white sticker border, playful gym accessories, transparent-background feeling.",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 12,
    tag: "贴纸",
    palette: ["#fef3c7", "#34d399", "#111827"],
    templateKind: "asset_generation",
    referencePolicy: "optional",
    bestFor: ["健身贴纸、头像、道具素材"],
    avoidFor: ["需要保留真实照片构图的任务"],
  }),
  createTheme({
    id: "theme-13",
    name: "团队战报封面",
    description: "生成一张适合晒到团队战报里的封面图。",
    previewImageUrl:
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/images/theme-13-editorial-grid.webp",
    promptTemplate:
      "team fitness report cover, editorial layout, bold title space without readable text, achievement atmosphere, yellow black accent colors.",
    defaultUnlocked: true,
    enabled: true,
    sortOrder: 13,
    tag: "战报",
    palette: ["#fde047", "#0f172a", "#f8fafc"],
    templateKind: "scene_generation",
    referencePolicy: "optional",
    bestFor: ["文字描述明确的健身主题场景"],
    avoidFor: ["需要严格保留人物身份的参考图"],
  }),
];

function cloneTheme(theme: AiImageThemeDefinition): AiImageThemeDefinition {
  return {
    ...theme,
    palette: [...theme.palette],
    bestFor: [...theme.bestFor],
    avoidFor: [...theme.avoidFor],
    promptSections: theme.promptSections ? { ...theme.promptSections } : undefined,
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
