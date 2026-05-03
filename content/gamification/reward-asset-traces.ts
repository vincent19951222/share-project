export interface RewardAssetGenerationTrace {
  assetId: string;
  promptVersion: "gm20-v1";
  prompt: string;
  sourceImagePath: string;
  processing: string;
}

const DEFAULT_PROCESSING =
  "remove_chroma_key.py --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill";

function buildPrompt(options: {
  name: string;
  primaryRequest: string;
  subject: string;
  colorPalette: string;
  chromaKey?: "#00ff00" | "#ff00ff";
}) {
  const chromaKey = options.chromaKey ?? "#00ff00";

  return [
    "Use case: background-extraction",
    "Asset type: transparent pixel-art inventory icon for 脱脂牛马 / 牛马补给站",
    `Primary request: ${options.primaryRequest}`,
    `Scene/backdrop: perfectly flat solid ${chromaKey} chroma-key background for background removal.`,
    options.subject,
    "Style/medium: crisp pixel-art UI asset, black pixel outline, simple highlights, readable at small inventory size.",
    "Composition/framing: icon centered, 1:1 canvas, subject uses 60-70% of the canvas, generous padding.",
    `${options.colorPalette} Do not use ${chromaKey} anywhere in the subject.`,
    "Text: no text.",
    "Constraints: no card frame, no rarity label, no quantity, no item name, no shadow, no watermark.",
    "Avoid: gradients, realistic paper texture, cinematic lighting, background objects, key color inside the icon.",
  ].join("\n");
}

const GENERATED_REWARD_ASSET_TRACES: RewardAssetGenerationTrace[] = [
  {
    assetId: "coins_005",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "摸鱼津贴",
      primaryRequest:
        "Create a square pixel-art icon for 摸鱼津贴. The object is a small stack of silver coins with a tiny receipt stub, designed for a web game backpack item grid.",
      subject: "Subject: one standalone coin reward icon only.",
      colorPalette:
        "Color palette: silver coin tones, off-white paper, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/coins_005-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "coins_010",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "工位补贴",
      primaryRequest:
        "Create a square pixel-art icon for 工位补贴. The object is a tidy pile of silver coins beside a small office desk token, designed for a web game backpack item grid.",
      subject: "Subject: one standalone coin reward icon only.",
      colorPalette:
        "Color palette: silver coin tones, muted desk blue, off-white paper, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/coins_010-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "coins_020",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "今日没白来",
      primaryRequest:
        "Create a square pixel-art icon for 今日没白来. The object is a larger stack of silver coins with a small checkmark token, designed for a web game backpack item grid.",
      subject: "Subject: one standalone coin reward icon only.",
      colorPalette:
        "Color palette: silver coin tones, off-white token, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/coins_020-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "coins_040",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "老板没发现",
      primaryRequest:
        "Create a square pixel-art icon for 老板没发现. The object is a silver coin stash partly covered by a tiny stealth cloth, designed for a web game backpack item grid.",
      subject: "Subject: one standalone coin reward icon only.",
      colorPalette:
        "Color palette: silver coin tones, charcoal cloth, off-white accents, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/coins_040-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "coins_080",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "小发一笔",
      primaryRequest:
        "Create a square pixel-art icon for 小发一笔. The object is a bursting pouch of silver coins, designed for a web game backpack item grid.",
      subject: "Subject: one standalone coin reward icon only.",
      colorPalette:
        "Color palette: silver coin tones, tan pouch, off-white accents, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/coins_080-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "coins_120",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "牛马暴富",
      primaryRequest:
        "Create a square pixel-art icon for 牛马暴富. The object is a big silver coin heap with a tiny crown token, designed for a web game backpack item grid.",
      subject: "Subject: one standalone coin reward icon only.",
      colorPalette:
        "Color palette: silver coin tones, gold crown accent, off-white shine, black outline.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/coins_120-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "small_boost_coupon",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "小暴击券",
      primaryRequest:
        "Create a square pixel-art icon for 小暴击券. The object is a blue utility coupon ticket with a small lightning burst badge, designed for a web game backpack item grid.",
      subject: "Subject: one standalone coupon ticket icon only.",
      colorPalette:
        "Color palette: blue utility accent, off-white ticket paper, black outline, small yellow lightning highlight.",
      chromaKey: "#ff00ff",
    }),
    sourceImagePath: "tmp/imagegen/gm20/small_boost_coupon-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "fitness_leave_coupon",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "健身请假券",
      primaryRequest:
        "Create a square pixel-art icon for 健身请假券. The object is a blue leave pass coupon with a tiny dumbbell and calendar corner, designed for a web game backpack item grid.",
      subject: "Subject: one standalone coupon ticket icon only.",
      colorPalette:
        "Color palette: blue utility accent, off-white ticket paper, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/fitness_leave_coupon-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "drink_water_ping",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "点名喝水令",
      primaryRequest:
        "Create a square pixel-art icon for 点名喝水令. The object is a purple social ping token with a water cup and notification mark, designed for a web game backpack item grid.",
      subject: "Subject: one standalone social ping token icon only.",
      colorPalette:
        "Color palette: purple social accent, cyan water, off-white token paper, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/drink_water_ping-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "walk_ping",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "出门溜达令",
      primaryRequest:
        "Create a square pixel-art icon for 出门溜达令. The object is a purple social ping token with a walking shoe and notification mark, designed for a web game backpack item grid.",
      subject: "Subject: one standalone social ping token icon only.",
      colorPalette:
        "Color palette: purple social accent, muted sneaker colors, off-white token paper, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/walk_ping-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "team_standup_ping",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "全员起立令",
      primaryRequest:
        "Create a square pixel-art icon for 全员起立令. The object is a purple social ping token with tiny standing figure silhouettes and a notification mark, designed for a web game backpack item grid.",
      subject: "Subject: one standalone social ping token icon only.",
      colorPalette:
        "Color palette: purple social accent, off-white token paper, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/team_standup_ping-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "chat_ping",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "今日闲聊令",
      primaryRequest:
        "Create a square pixel-art icon for 今日闲聊令. The object is a purple social ping token with two chat bubbles and a notification mark, designed for a web game backpack item grid.",
      subject: "Subject: one standalone social ping token icon only.",
      colorPalette:
        "Color palette: purple social accent, off-white chat bubbles, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/chat_ping-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "share_info_ping",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "红盘情报令",
      primaryRequest:
        "Create a square pixel-art icon for 红盘情报令. The object is a purple social ping token with a tiny info card and signal mark, designed for a web game backpack item grid.",
      subject: "Subject: one standalone social ping token icon only.",
      colorPalette:
        "Color palette: purple social accent, red info accent, off-white token paper, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/share_info_ping-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "team_broadcast_coupon",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "团队小喇叭",
      primaryRequest:
        "Create a square pixel-art icon for 团队小喇叭. The object is a purple social broadcast coupon with a tiny megaphone, designed for a web game backpack item grid.",
      subject: "Subject: one standalone social broadcast coupon icon only.",
      colorPalette:
        "Color palette: purple social accent, off-white ticket paper, black outline, small yellow highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/team_broadcast_coupon-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "double_niuma_coupon",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "双倍牛马券",
      primaryRequest:
        "Create a square pixel-art icon for 双倍牛马券. The object is a gold rare coupon with a doubled sparkle badge, designed for a web game backpack item grid.",
      subject: "Subject: one standalone rare coupon ticket icon only.",
      colorPalette:
        "Color palette: gold rare accent, off-white ticket paper, black outline, small red-orange highlight.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/double_niuma_coupon-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "season_sprint_coupon",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "赛季冲刺券",
      primaryRequest:
        "Create a square pixel-art icon for 赛季冲刺券. The object is a sporty season sprint coupon represented by a small red-orange sprint flag and a running shoe token, designed for a web game backpack item grid.",
      subject: "Subject: one standalone rare coupon ticket icon only.",
      colorPalette:
        "Color palette: warm rare accent colors, red-orange flag, off-white coupon paper, small gold highlight, black outline.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/season_sprint_coupon-source.png",
    processing: DEFAULT_PROCESSING,
  },
  {
    assetId: "luckin_coffee_coupon",
    promptVersion: "gm20-v1",
    prompt: buildPrompt({
      name: "瑞幸咖啡券",
      primaryRequest:
        "Create a square pixel-art icon for 瑞幸咖啡券 without using any real brand logo. The object is a generic takeaway coffee cup coupon with a small blue coupon tag, designed for a web game backpack item grid.",
      subject: "Subject: one standalone coffee redemption coupon icon only.",
      colorPalette:
        "Color palette: white coffee cup, cyan-blue coupon accent, small gold highlight, off-white paper, black outline.",
    }),
    sourceImagePath: "tmp/imagegen/gm20/luckin_coffee_coupon-source.png",
    processing: DEFAULT_PROCESSING,
  },
];

const TASK_REROLL_COUPON_TRACE: RewardAssetGenerationTrace = {
  assetId: "task_reroll_coupon",
  promptVersion: "gm20-v1",
  prompt: [
  "Use case: background-extraction",
  "Asset type: transparent pixel-art inventory icon for 脱脂牛马 / 牛马补给站",
  "Primary request: Create a square pixel-art icon for 任务换班券. The object is a blue utility coupon ticket with a reroll arrow and tiny checklist marks, designed for a web game backpack item grid.",
  "Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for background removal.",
  "Subject: one standalone coupon ticket icon only.",
  "Style/medium: crisp pixel-art UI asset, black pixel outline, simple highlights, readable at small inventory size.",
  "Composition/framing: icon centered, 1:1 canvas, subject uses 60-70% of the canvas, generous padding.",
  "Color palette: blue utility accent, off-white ticket paper, black outline, small yellow highlight. Do not use #00ff00 anywhere in the subject.",
  "Text: no text.",
  "Constraints: no card frame, no rarity label, no quantity, no item name, no shadow, no watermark.",
  "Avoid: gradients, realistic paper texture, cinematic lighting, background objects, green inside the icon.",
  ].join("\n"),
  sourceImagePath:
    "/Users/vincent/.codex/generated_images/019de83d-dacf-73e3-af09-44cf6a33be05/ig_09b2caf270bbf26c0169f63531728481919789d4fd3a98e6fb.png",
  processing: DEFAULT_PROCESSING,
};

export const REWARD_ASSET_GENERATION_TRACES: RewardAssetGenerationTrace[] = [
  ...GENERATED_REWARD_ASSET_TRACES,
  TASK_REROLL_COUPON_TRACE,
];

const traceByAssetId = new Map(REWARD_ASSET_GENERATION_TRACES.map((trace) => [trace.assetId, trace]));

export function getRewardAssetGenerationTrace(assetId: string) {
  return traceByAssetId.get(assetId) ?? null;
}
