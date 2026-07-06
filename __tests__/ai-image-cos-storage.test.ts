// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

const putObjectMock = vi.fn();

vi.mock("cos-nodejs-sdk-v5", () => ({
  default: class MockCosClient {
    putObject = putObjectMock;
  },
}));

import {
  buildAiImageCosKey,
  parseImageDataUrl,
  uploadAiImageBase64,
  uploadAiImageDataUrl,
} from "@/lib/gamification/ai-image/cos-storage";

describe("AI image COS storage helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    putObjectMock.mockReset();
  });

  it("parses png data URLs", () => {
    const parsed = parseImageDataUrl("data:image/png;base64,aGVsbG8=");

    expect(parsed.mimeType).toBe("image/png");
    expect(parsed.buffer.toString()).toBe("hello");
    expect(parsed.extension).toBe("png");
  });

  it("parses jpeg and webp data URLs", () => {
    const jpeg = parseImageDataUrl("data:image/jpeg;base64,aGVsbG8=");
    const webp = parseImageDataUrl("data:image/webp;base64,d29ybGQ=");

    expect(jpeg.mimeType).toBe("image/jpeg");
    expect(jpeg.extension).toBe("jpg");
    expect(jpeg.buffer.toString()).toBe("hello");
    expect(webp.mimeType).toBe("image/webp");
    expect(webp.extension).toBe("webp");
    expect(webp.buffer.toString()).toBe("world");
  });

  it("rejects non-data-url inputs", () => {
    expect(() => parseImageDataUrl("https://example.com/image.png")).toThrow(
      "参考图格式不是 data URL",
    );
  });

  it("rejects malformed base64 payloads", () => {
    expect(() => parseImageDataUrl("data:image/png;base64,====")).toThrow(
      "参考图格式不是 data URL",
    );
    expect(() => parseImageDataUrl("data:image/png;base64,a")).toThrow("参考图格式不是 data URL");
  });

  it("builds stable output and input COS keys", () => {
    expect(
      buildAiImageCosKey({
        kind: "output",
        userId: "u1",
        id: "item1",
        extension: "png",
        now: new Date("2026-07-06T12:00:00+08:00"),
      }),
    ).toBe("share-project/ai-images/u1/2026/07/06/item1/original.png");

    expect(
      buildAiImageCosKey({
        kind: "input",
        userId: "u1",
        id: "input1",
        extension: "jpg",
        now: new Date("2026-07-06T12:00:00+08:00"),
      }),
    ).toBe("share-project/ai-image-inputs/u1/2026/07/06/input1/original.jpg");
  });

  it("uploads output data URLs to COS with public URL metadata", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00+08:00"));
    vi.stubEnv("COS_SECRET_ID", "sid");
    vi.stubEnv("COS_SECRET_KEY", "skey");
    vi.stubEnv("COS_BUCKET", "bucket");
    vi.stubEnv("COS_REGION", "ap-shanghai");
    vi.stubEnv("COS_PUBLIC_BASE_URL", "https://cdn.example.com/");
    putObjectMock.mockResolvedValue(undefined);

    await expect(
      uploadAiImageDataUrl({
        dataUrl: "data:image/png;base64,aGVsbG8=",
        kind: "output",
        userId: "u1",
        id: "item1",
      }),
    ).resolves.toEqual({
      imageUrl: "https://cdn.example.com/share-project/ai-images/u1/2026/07/06/item1/original.png",
      cosKey: "share-project/ai-images/u1/2026/07/06/item1/original.png",
      sizeBytes: 5,
      mimeType: "image/png",
    });

    expect(putObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "bucket",
        Region: "ap-shanghai",
        Key: "share-project/ai-images/u1/2026/07/06/item1/original.png",
        Body: expect.any(Buffer),
        ContentType: "image/png",
      }),
    );
  });

  it("throws when COS secrets are missing", async () => {
    vi.stubEnv("COS_BUCKET", "bucket");
    vi.stubEnv("COS_REGION", "ap-shanghai");
    vi.stubEnv("COS_PUBLIC_BASE_URL", "https://cdn.example.com");

    await expect(
      uploadAiImageDataUrl({
        dataUrl: "data:image/png;base64,aGVsbG8=",
        kind: "output",
        userId: "u1",
        id: "item1",
      }),
    ).rejects.toThrow("缺少 COS 密钥配置");
  });

  it("throws when COS public config is missing", async () => {
    vi.stubEnv("COS_SECRET_ID", "sid");
    vi.stubEnv("COS_SECRET_KEY", "skey");

    await expect(
      uploadAiImageBase64({
        b64Json: Buffer.from("provider").toString("base64"),
        mimeType: "image/png",
        userId: "u1",
        id: "item2",
      }),
    ).rejects.toThrow("缺少 COS 存储配置");
  });

  it("uploads provider base64 output as an output image", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:00:00+08:00"));
    vi.stubEnv("COS_SECRET_ID", "sid");
    vi.stubEnv("COS_SECRET_KEY", "skey");
    vi.stubEnv("COS_BUCKET", "bucket");
    vi.stubEnv("COS_REGION", "ap-shanghai");
    vi.stubEnv("COS_PUBLIC_BASE_URL", "https://cdn.example.com");
    putObjectMock.mockResolvedValue(undefined);

    const result = await uploadAiImageBase64({
      b64Json: Buffer.from("provider").toString("base64"),
      mimeType: "image/png",
      userId: "u1",
      id: "item2",
    });

    expect(result).toEqual({
      imageUrl: "https://cdn.example.com/share-project/ai-images/u1/2026/07/06/item2/original.png",
      cosKey: "share-project/ai-images/u1/2026/07/06/item2/original.png",
      sizeBytes: 8,
      mimeType: "image/png",
    });
    expect(putObjectMock).toHaveBeenCalledTimes(1);
    expect(putObjectMock).toHaveBeenCalledWith({
      Bucket: "bucket",
      Region: "ap-shanghai",
      Key: "share-project/ai-images/u1/2026/07/06/item2/original.png",
      Body: Buffer.from("provider"),
      ContentType: "image/png",
    });

    await expect(
      uploadAiImageBase64({
        b64Json: Buffer.from("provider").toString("base64"),
        mimeType: "image/png",
        userId: "u1",
        id: "item2",
      }),
    ).resolves.toEqual(result);
  });
});
