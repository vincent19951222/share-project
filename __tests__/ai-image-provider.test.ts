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

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.boluopets.com/v1/images/generations",
      expect.objectContaining({ method: "POST" }),
    );
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

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.boluopets.com/v1/images/edits",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws a Chinese error when API key is missing", async () => {
    vi.stubEnv("BOLUOPETS_API_KEY", "");

    await expect(generateAiImage({ prompt: "x", referenceImages: [] })).rejects.toThrow(
      "缺少生图 API Key",
    );
  });
});
