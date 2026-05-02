export interface RewardAssetGenerationTrace {
  assetId: string;
  promptVersion: "gm20-v1";
  prompt: string;
  sourceImagePath: string;
  processing: string;
}

const TASK_REROLL_COUPON_PROMPT = [
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
].join("\n");

export const REWARD_ASSET_GENERATION_TRACES: RewardAssetGenerationTrace[] = [
  {
    assetId: "task_reroll_coupon",
    promptVersion: "gm20-v1",
    prompt: TASK_REROLL_COUPON_PROMPT,
    sourceImagePath:
      "/Users/vincent/.codex/generated_images/019de83d-dacf-73e3-af09-44cf6a33be05/ig_09b2caf270bbf26c0169f63531728481919789d4fd3a98e6fb.png",
    processing:
      "remove_chroma_key.py --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill",
  },
];

const traceByAssetId = new Map(REWARD_ASSET_GENERATION_TRACES.map((trace) => [trace.assetId, trace]));

export function getRewardAssetGenerationTrace(assetId: string) {
  return traceByAssetId.get(assetId) ?? null;
}
