// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAiImage } from "@/lib/gamification/ai-image/provider";

describe("AI image provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("uses the generation endpoint when no reference images are provided", async () => {
    vi.stubEnv("BOLUOPETS_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: Buffer.from("ok").toString("base64") }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateAiImage({ prompt: "pixel poster", referenceImages: [] }),
    ).resolves.toMatchObject({
      mimeType: "image/png",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.boluopets.com/v1/images/generations");
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(options.body as string)).toEqual({
      model: "gpt-image-2",
      prompt: "pixel poster",
      response_format: "b64_json",
    });
  });

  it("uses the edit endpoint when reference images are provided", async () => {
    vi.stubEnv("BOLUOPETS_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: Buffer.from("ok").toString("base64") }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await generateAiImage({
      prompt: "with input",
      referenceImages: [{ dataUrl: "data:image/png;base64,aGVsbG8=", filename: "input.png" }],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.boluopets.com/v1/images/edits");
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-key",
      },
    });
    expect(options.body).toBeInstanceOf(FormData);

    const body = options.body as FormData;
    expect(body.get("model")).toBe("gpt-image-2");
    expect(body.get("prompt")).toBe("with input");
    expect(body.get("response_format")).toBe("b64_json");
    const imageEntry = body.get("image");
    expect(imageEntry).toBeInstanceOf(Blob);
    expect((imageEntry as File).name).toBe("input.png");
    await expect((imageEntry as Blob).text()).resolves.toBe("hello");
  });

  it("throws a Chinese error when API key is missing", async () => {
    vi.stubEnv("BOLUOPETS_API_KEY", "");

    await expect(generateAiImage({ prompt: "x", referenceImages: [] })).rejects.toThrow(
      "缺少生图 API Key",
    );
  });

  it("propagates provider error messages for non-ok responses", async () => {
    vi.stubEnv("BOLUOPETS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "provider exploded" } }),
      }),
    );

    await expect(generateAiImage({ prompt: "x", referenceImages: [] })).rejects.toThrow(
      "provider exploded",
    );
  });

  it("throws when provider returns no b64_json", async () => {
    vi.stubEnv("BOLUOPETS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{}] }),
      }),
    );

    await expect(generateAiImage({ prompt: "x", referenceImages: [] })).rejects.toThrow(
      "生图服务没有返回图片",
    );
  });
});
