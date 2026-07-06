// @vitest-environment node

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  uploadAiImageDataUrlMock,
  uploadAiImageBase64Mock,
  generateAiImageMock,
} = vi.hoisted(() => ({
  uploadAiImageDataUrlMock: vi.fn(),
  uploadAiImageBase64Mock: vi.fn(),
  generateAiImageMock: vi.fn(),
}));

vi.mock("@/lib/gamification/ai-image/cos-storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gamification/ai-image/cos-storage")>(
    "@/lib/gamification/ai-image/cos-storage",
  );

  return {
    ...actual,
    uploadAiImageDataUrl: uploadAiImageDataUrlMock,
    uploadAiImageBase64: uploadAiImageBase64Mock,
  };
});

vi.mock("@/lib/gamification/ai-image/provider", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gamification/ai-image/provider")>(
    "@/lib/gamification/ai-image/provider",
  );

  return {
    ...actual,
    generateAiImage: generateAiImageMock,
  };
});

import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";
import { drawAiImageTheme } from "@/lib/gamification/ai-image/theme-unlocks";
import {
  createAiImageTask,
  getAiImageTaskForUser,
  retryAiImageTask,
  settleTimedOutAiImageTask,
} from "@/lib/gamification/ai-image/tasks";
import { runAiImageTask } from "@/lib/gamification/ai-image/task-runner";

describe("AI image task service", () => {
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });

    uploadAiImageDataUrlMock.mockReset();
    uploadAiImageBase64Mock.mockReset();
    generateAiImageMock.mockReset();
    uploadAiImageDataUrlMock.mockResolvedValue({
      imageUrl: "https://cdn.example.com/input.png",
      cosKey: "share-project/ai-image-inputs/test/input.png",
      sizeBytes: 5,
      mimeType: "image/png",
    });
    uploadAiImageBase64Mock.mockResolvedValue({
      imageUrl: "https://cdn.example.com/output.png",
      cosKey: "share-project/ai-images/test/output.png",
      sizeBytes: 8,
      mimeType: "image/png",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a charged 1/2/4 task with queued items", async () => {
    const task = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "暴汗训练后",
      requestedCount: 4,
      referenceImages: [],
      startRunner: false,
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const items = await prisma.aiImageGenerationItem.findMany({ where: { taskId: task.id } });

    expect(task.status).toBe("queued");
    expect(task.coinCost).toBe(240);
    expect(user.coins).toBe(760);
    expect(items).toHaveLength(4);
    expect(items.every((item) => item.status === "queued")).toBe(true);
  });

  it("rejects locked themes", async () => {
    await expect(
      createAiImageTask({
        userId,
        themeId: "theme-02",
        userPrompt: "",
        requestedCount: 1,
        referenceImages: [],
        startRunner: false,
      }),
    ).rejects.toThrow("主题未解锁");
  });

  it("draws an unowned theme and charges coins", async () => {
    const result = await drawAiImageTheme({ userId, rng: () => 0 });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const unlock = await prisma.aiImageThemeUnlock.findUnique({
      where: { userId_themeId: { userId, themeId: result.theme.id } },
    });

    expect(result.theme.unlocked).toBe(true);
    expect(result.theme.defaultUnlocked).toBe(false);
    expect(user.coins).toBe(800);
    expect(unlock).toMatchObject({
      userId,
      teamId,
      themeId: result.theme.id,
      source: "draw",
    });
  });

  it("stores reference inputs without persisting data URLs and hides provider prompts from snapshots", async () => {
    const task = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "加一点海报感",
      requestedCount: 1,
      referenceImages: [{ dataUrl: "data:image/png;base64,aGVsbG8=", filename: "input.png" }],
      startRunner: false,
    });
    const inputImages = await prisma.aiImageTaskInputImage.findMany({
      where: { taskId: task.id },
      orderBy: { sortOrder: "asc" },
    });
    const snapshot = await getAiImageTaskForUser({ userId, taskId: task.id });

    expect(uploadAiImageDataUrlMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dataUrl: "data:image/png;base64,aGVsbG8=",
        kind: "input",
        userId,
      }),
    );
    expect(inputImages).toHaveLength(1);
    expect(inputImages[0]).toMatchObject({
      userId,
      teamId,
      imageUrl: "https://cdn.example.com/input.png",
      cosKey: "share-project/ai-image-inputs/test/input.png",
      mimeType: "image/png",
      sizeBytes: 5,
      sortOrder: 0,
    });
    expect(JSON.stringify(inputImages)).not.toContain("data:image/png;base64");
    expect(JSON.stringify(snapshot)).not.toContain("providerPrompt");
    expect(JSON.stringify(snapshot)).not.toContain("8-bit pixel art fitness poster");
  });

  it("retries failed tasks with original prompt, failed count, and copied input metadata", async () => {
    const original = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "retry me",
      requestedCount: 2,
      referenceImages: [{ dataUrl: "data:image/png;base64,aGVsbG8=", filename: "retry.png" }],
      startRunner: false,
    });
    const originalInputImages = await prisma.aiImageTaskInputImage.findMany({
      where: { taskId: original.id },
      orderBy: { sortOrder: "asc" },
    });

    await prisma.aiImageGenerationItem.updateMany({
      where: { taskId: original.id },
      data: { status: "failed", errorMessage: "mock" },
    });
    await prisma.aiImageGenerationTask.update({
      where: { id: original.id },
      data: { status: "failed", coinRefunded: true, refundedCoinAmount: 120 },
    });
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });

    const retry = await retryAiImageTask({ userId, taskId: original.id, startRunner: false });
    const retryItems = await prisma.aiImageGenerationItem.findMany({ where: { taskId: retry.id } });
    const retryInputImages = await prisma.aiImageTaskInputImage.findMany({
      where: { taskId: retry.id },
      orderBy: { sortOrder: "asc" },
    });

    expect(retry.retryOfTaskId).toBe(original.id);
    expect(retry.requestedCount).toBe(2);
    expect(retry.userPrompt).toBe("retry me");
    expect(retry.promptSnapshotJson).toBe(original.promptSnapshotJson);
    expect(retryItems).toHaveLength(2);
    expect(retryInputImages).toHaveLength(1);
    expect(retryInputImages[0]).toMatchObject({
      imageUrl: originalInputImages[0].imageUrl,
      cosKey: originalInputImages[0].cosKey,
      mimeType: originalInputImages[0].mimeType,
      sizeBytes: originalInputImages[0].sizeBytes,
      sortOrder: 0,
    });
  });

  it("does not expose another user's task", async () => {
    const other = await prisma.user.findUniqueOrThrow({ where: { username: "luo" } });
    const task = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "",
      requestedCount: 1,
      referenceImages: [],
      startRunner: false,
    });

    await expect(getAiImageTaskForUser({ userId: other.id, taskId: task.id })).rejects.toThrow(
      "任务不存在",
    );
  });

  it("marks partial runner results, stores artworks, and refunds only failed item cost", async () => {
    const task = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "runner test",
      requestedCount: 2,
      referenceImages: [],
      startRunner: false,
    });

    generateAiImageMock
      .mockResolvedValueOnce({
        b64Json: Buffer.from("first-output").toString("base64"),
        mimeType: "image/png",
      })
      .mockRejectedValueOnce(new Error("provider boom"));

    await runAiImageTask(task.id);

    const settledTask = await prisma.aiImageGenerationTask.findUniqueOrThrow({
      where: { id: task.id },
      include: { items: { orderBy: { index: "asc" } }, artworks: true },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(settledTask.status).toBe("partial");
    expect(settledTask.coinRefunded).toBe(true);
    expect(settledTask.refundedCoinAmount).toBe(60);
    expect(settledTask.items).toHaveLength(2);
    expect(settledTask.items[0]).toMatchObject({
      status: "completed",
      imageUrl: "https://cdn.example.com/output.png",
      cosKey: "share-project/ai-images/test/output.png",
    });
    expect(settledTask.items[1]?.status).toBe("failed");
    expect(settledTask.items[1]?.errorMessage).toBeTruthy();
    expect(settledTask.artworks).toHaveLength(1);
    expect(user.coins).toBe(940);
  });

  it("settles timed out running tasks as failed and refunds coins", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:30:00+08:00"));

    const task = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "timeout me",
      requestedCount: 1,
      referenceImages: [],
      startRunner: false,
    });

    await prisma.aiImageGenerationTask.update({
      where: { id: task.id },
      data: {
        status: "running",
        updatedAt: new Date("2026-07-06T12:00:00+08:00"),
      },
    });
    await prisma.aiImageGenerationItem.updateMany({
      where: { taskId: task.id },
      data: {
        status: "running",
        updatedAt: new Date("2026-07-06T12:00:00+08:00"),
      },
    });

    await settleTimedOutAiImageTask({ taskId: task.id, now: new Date("2026-07-06T12:30:00+08:00") });

    const settledTask = await prisma.aiImageGenerationTask.findUniqueOrThrow({
      where: { id: task.id },
      include: { items: true },
    });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(settledTask.status).toBe("failed");
    expect(settledTask.coinRefunded).toBe(true);
    expect(settledTask.refundedCoinAmount).toBe(60);
    expect(settledTask.errorMessage).toBe("任务处理超时");
    expect(settledTask.items[0]?.status).toBe("failed");
    expect(user.coins).toBe(1000);
  });
});
