import "server-only";

import {
  AI_IMAGE_EDIT_URL,
  AI_IMAGE_GENERATION_URL,
  AI_IMAGE_MAX_REFERENCE_IMAGES,
  AI_IMAGE_PROVIDER_MODEL,
} from "@/lib/gamification/ai-image/constants";
import { parseImageDataUrl } from "@/lib/gamification/ai-image/cos-storage";

export interface AiImageReferenceInput {
  dataUrl: string;
  filename: string;
}

export interface GenerateAiImageInput {
  prompt: string;
  referenceImages: AiImageReferenceInput[];
}

export interface GenerateAiImageResult {
  b64Json: string;
  mimeType: "image/png";
}

function getProviderApiKey() {
  return process.env.BOLUOPETS_API_KEY?.trim() || "";
}

async function readProviderB64(response: Response): Promise<GenerateAiImageResult> {
  const payload = (await response.json().catch(() => null)) as
    | {
        data?: Array<{ b64_json?: string }>;
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "生图服务请求失败");
  }

  const b64Json = payload?.data?.[0]?.b64_json;

  if (!b64Json) {
    throw new Error("生图服务没有返回图片");
  }

  return { b64Json, mimeType: "image/png" };
}

export async function generateAiImage(input: GenerateAiImageInput): Promise<GenerateAiImageResult> {
  const apiKey = getProviderApiKey();

  if (!apiKey) {
    throw new Error("缺少生图 API Key");
  }

  if (input.referenceImages.length > AI_IMAGE_MAX_REFERENCE_IMAGES) {
    throw new Error(`参考图最多 ${AI_IMAGE_MAX_REFERENCE_IMAGES} 张`);
  }

  if (input.referenceImages.length === 0) {
    const response = await fetch(AI_IMAGE_GENERATION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_IMAGE_PROVIDER_MODEL,
        prompt: input.prompt,
        response_format: "b64_json",
      }),
    });

    return readProviderB64(response);
  }

  const form = new FormData();
  form.set("model", AI_IMAGE_PROVIDER_MODEL);
  form.set("prompt", input.prompt);
  form.set("response_format", "b64_json");

  for (const reference of input.referenceImages) {
    const parsed = parseImageDataUrl(reference.dataUrl);
    form.append("image", new Blob([Uint8Array.from(parsed.buffer)], { type: parsed.mimeType }), reference.filename);
  }

  const response = await fetch(AI_IMAGE_EDIT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  return readProviderB64(response);
}
