// @vitest-environment node

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { enqueueAiImageTaskMock } = vi.hoisted(() => ({
  enqueueAiImageTaskMock: vi.fn(),
}));

vi.mock("@/lib/gamification/ai-image/task-runner", () => ({
  enqueueAiImageTask: enqueueAiImageTaskMock,
}));

const { uploadAiImageDataUrlMock } = vi.hoisted(() => ({
  uploadAiImageDataUrlMock: vi.fn(),
}));

vi.mock("@/lib/gamification/ai-image/cos-storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gamification/ai-image/cos-storage")>(
    "@/lib/gamification/ai-image/cos-storage",
  );

  return {
    ...actual,
    uploadAiImageDataUrl: uploadAiImageDataUrlMock,
  };
});

import { POST as CREATE } from "@/app/api/gamification/ai-image/tasks/route";
import { GET as DETAIL } from "@/app/api/gamification/ai-image/tasks/[taskId]/route";
import { POST as RETRY } from "@/app/api/gamification/ai-image/tasks/[taskId]/retry/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import { prisma } from "@/lib/prisma";
import { createAiImageTask } from "@/lib/gamification/ai-image/tasks";

function request(url: string, userId?: string, body?: unknown) {
  return new NextRequest(url, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(userId ? { cookie: `userId=${createCookieValue(userId)}` } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("AI image task API", () => {
  let userId: string;
  let otherUserId: string;

  beforeEach(async () => {
    await seedDatabase();
    const [user, otherUser] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { username: "li" } }),
      prisma.user.findUniqueOrThrow({ where: { username: "luo" } }),
    ]);
    userId = user.id;
    otherUserId = otherUser.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
    enqueueAiImageTaskMock.mockReset();
    uploadAiImageDataUrlMock.mockReset();
    uploadAiImageDataUrlMock.mockResolvedValue({
      imageUrl: "https://cdn.example.com/input.png",
      cosKey: "share-project/ai-image-inputs/test/input.png",
      sizeBytes: 5,
      mimeType: "image/png",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requires login to create a task", async () => {
    const response = await CREATE(
      request("http://localhost/api/gamification/ai-image/tasks", undefined, {}),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "未登录" });
  });

  it("creates a task and only returns its id", async () => {
    const response = await CREATE(
      request("http://localhost/api/gamification/ai-image/tasks", userId, {
        themeId: "theme-01",
        userPrompt: "训练后",
        requestedCount: 1,
        referenceImages: [],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ taskId: expect.any(String) });
    expect(Object.keys(body)).toEqual(["taskId"]);
  });

  it("maps task validation errors to status plus Chinese message", async () => {
    const response = await CREATE(
      request("http://localhost/api/gamification/ai-image/tasks", userId, {
        themeId: "theme-02",
        requestedCount: 1,
        referenceImages: [],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: "主题未解锁" });
  });

  it("returns task detail only to the owner and keeps the snapshot client-safe", async () => {
    const createResponse = await CREATE(
      request("http://localhost/api/gamification/ai-image/tasks", userId, {
        themeId: "theme-01",
        userPrompt: "加一点海报感",
        requestedCount: 1,
        referenceImages: [{ dataUrl: "data:image/png;base64,aGVsbG8=", filename: "input.png" }],
      }),
    );
    const { taskId } = await createResponse.json();

    const detail = await DETAIL(
      request(`http://localhost/api/gamification/ai-image/tasks/${taskId}`, userId),
      { params: Promise.resolve({ taskId }) },
    );
    const body = await detail.json();

    expect(detail.status).toBe(200);
    expect(body.task).toMatchObject({
      id: taskId,
      themeId: "theme-01",
      userPrompt: "加一点海报感",
      requestedCount: 1,
    });
    expect(JSON.stringify(body)).not.toContain("promptSnapshotJson");
    expect(JSON.stringify(body)).not.toContain("providerPrompt");
    expect(JSON.stringify(body)).not.toContain("promptTemplate");
    expect(JSON.stringify(body)).not.toContain("data:image/png;base64");
    expect(JSON.stringify(body)).not.toContain("cosKey");

    const otherDetail = await DETAIL(
      request(`http://localhost/api/gamification/ai-image/tasks/${taskId}`, otherUserId),
      { params: Promise.resolve({ taskId }) },
    );

    expect(otherDetail.status).toBe(404);
    await expect(otherDetail.json()).resolves.toEqual({ error: "任务不存在" });
  });

  it("settles timed out running tasks before returning detail", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:30:00+08:00"));

    const task = await createAiImageTask({
      userId,
      themeId: "theme-01",
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

    const response = await DETAIL(
      request(`http://localhost/api/gamification/ai-image/tasks/${task.id}`, userId),
      { params: Promise.resolve({ taskId: task.id }) },
    );
    const body = await response.json();
    const reloadedUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(response.status).toBe(200);
    expect(body.task).toMatchObject({
      id: task.id,
      status: "failed",
      refundedCoinAmount: 60,
      errorMessage: "任务处理超时",
    });
    expect(body.task.items[0]).toMatchObject({
      status: "failed",
      errorMessage: "任务处理超时",
    });
    expect(reloadedUser.coins).toBe(1000);
  });

  it("does not settle another user's stale running task when detail access is denied", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T12:30:00+08:00"));

    const task = await createAiImageTask({
      userId,
      themeId: "theme-01",
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

    const response = await DETAIL(
      request(`http://localhost/api/gamification/ai-image/tasks/${task.id}`, otherUserId),
      { params: Promise.resolve({ taskId: task.id }) },
    );
    const body = await response.json();
    const reloadedTask = await prisma.aiImageGenerationTask.findUniqueOrThrow({
      where: { id: task.id },
      include: { items: { orderBy: { index: "asc" } } },
    });
    const reloadedUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "任务不存在" });
    expect(reloadedTask).toMatchObject({
      status: "running",
      coinRefunded: false,
      refundedCoinAmount: 0,
      errorMessage: null,
    });
    expect(reloadedTask.items[0]).toMatchObject({
      status: "running",
      errorMessage: null,
    });
    expect(reloadedUser.coins).toBe(940);
  });

  it("retries failed tasks and only returns the new id", async () => {
    const original = await createAiImageTask({
      userId,
      themeId: "theme-01",
      userPrompt: "retry me",
      requestedCount: 1,
      referenceImages: [],
      startRunner: false,
    });

    await prisma.aiImageGenerationTask.update({
      where: { id: original.id },
      data: { status: "failed", coinRefunded: true, refundedCoinAmount: 60 },
    });
    await prisma.aiImageGenerationItem.updateMany({
      where: { taskId: original.id },
      data: { status: "failed", errorMessage: "mock" },
    });
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });

    const response = await RETRY(
      request(`http://localhost/api/gamification/ai-image/tasks/${original.id}/retry`, userId, {}),
      { params: Promise.resolve({ taskId: original.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ taskId: expect.any(String) });
    expect(Object.keys(body)).toEqual(["taskId"]);
    expect(body.taskId).not.toBe(original.id);
  });
});
