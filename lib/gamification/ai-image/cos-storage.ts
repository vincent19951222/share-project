import "server-only";

import COS from "cos-nodejs-sdk-v5";
import {
  AI_IMAGE_INPUT_COS_PREFIX,
  AI_IMAGE_OUTPUT_COS_PREFIX,
} from "@/lib/gamification/ai-image/constants";

type AiImageMimeType = "image/png" | "image/jpeg" | "image/webp";
type AiImageExtension = "png" | "jpg" | "webp";

export interface ParsedImageDataUrl {
  buffer: Buffer;
  mimeType: AiImageMimeType;
  extension: AiImageExtension;
  sizeBytes: number;
}

function getImageExtension(mimeType: AiImageMimeType): AiImageExtension {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  return mimeType.replace("image/", "") as "png" | "webp";
}

export function parseImageDataUrl(dataUrl: string): ParsedImageDataUrl {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);

  if (!match) {
    throw new Error("参考图格式不是 data URL");
  }

  const mimeType = match[1] as AiImageMimeType;
  const buffer = Buffer.from(match[2], "base64");

  return {
    buffer,
    mimeType,
    extension: getImageExtension(mimeType),
    sizeBytes: buffer.byteLength,
  };
}

export function buildAiImageCosKey({
  extension,
  id,
  kind,
  now = new Date(),
  userId,
}: {
  kind: "input" | "output";
  userId: string;
  id: string;
  extension: string;
  now?: Date;
}) {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const prefix = kind === "input" ? AI_IMAGE_INPUT_COS_PREFIX : AI_IMAGE_OUTPUT_COS_PREFIX;

  return `${prefix}/${userId}/${year}/${month}/${day}/${id}/original.${extension}`;
}

function getCosClient() {
  const SecretId = process.env.COS_SECRET_ID;
  const SecretKey = process.env.COS_SECRET_KEY;

  if (!SecretId || !SecretKey) {
    throw new Error("缺少 COS 密钥配置");
  }

  return new COS({ SecretId, SecretKey });
}

function getCosConfig() {
  const Bucket = process.env.COS_BUCKET;
  const Region = process.env.COS_REGION;
  const publicBaseUrl = process.env.COS_PUBLIC_BASE_URL;

  if (!Bucket || !Region || !publicBaseUrl) {
    throw new Error("缺少 COS 存储配置");
  }

  return {
    Bucket,
    Region,
    publicBaseUrl: publicBaseUrl.replace(/\/$/, ""),
  };
}

async function uploadAiImageBuffer({
  buffer,
  cosKey,
  mimeType,
}: {
  buffer: Buffer;
  cosKey: string;
  mimeType: string;
}) {
  const cos = getCosClient();
  const config = getCosConfig();

  await cos.putObject({
    Bucket: config.Bucket,
    Region: config.Region,
    Key: cosKey,
    Body: buffer,
    ContentType: mimeType,
  });

  return {
    imageUrl: `${config.publicBaseUrl}/${cosKey}`,
    cosKey,
  };
}

export async function uploadAiImageDataUrl({
  dataUrl,
  id,
  kind,
  userId,
}: {
  dataUrl: string;
  kind: "input" | "output";
  userId: string;
  id: string;
}) {
  const parsed = parseImageDataUrl(dataUrl);
  const cosKey = buildAiImageCosKey({
    kind,
    userId,
    id,
    extension: parsed.extension,
  });
  const stored = await uploadAiImageBuffer({
    buffer: parsed.buffer,
    cosKey,
    mimeType: parsed.mimeType,
  });

  return {
    ...stored,
    mimeType: parsed.mimeType,
    sizeBytes: parsed.sizeBytes,
  };
}

export async function uploadAiImageBase64({
  b64Json,
  id,
  mimeType,
  userId,
}: {
  b64Json: string;
  mimeType: AiImageMimeType;
  userId: string;
  id: string;
}) {
  const buffer = Buffer.from(b64Json, "base64");
  const cosKey = buildAiImageCosKey({
    kind: "output",
    userId,
    id,
    extension: getImageExtension(mimeType),
  });
  const stored = await uploadAiImageBuffer({
    buffer,
    cosKey,
    mimeType,
  });

  return {
    ...stored,
    mimeType,
    sizeBytes: buffer.byteLength,
  };
}
