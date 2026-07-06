import "server-only";

import type { AiImageGenerationTask } from "@/lib/generated/prisma/client";
import {
  AI_IMAGE_ALLOWED_REQUEST_COUNTS,
  AI_IMAGE_GENERATION_COIN_COST,
  AI_IMAGE_MAX_REFERENCE_IMAGES,
  AI_IMAGE_PROVIDER_MODEL,
  AI_IMAGE_RETRY_MAX_COUNT,
  AI_IMAGE_RETRY_MIN_COUNT,
  AI_IMAGE_TASK_TIMEOUT_MS,
} from "@/lib/gamification/ai-image/constants";
import { enqueueAiImageTask } from "@/lib/gamification/ai-image/task-runner";
import { uploadAiImageDataUrl } from "@/lib/gamification/ai-image/cos-storage";
import { buildPromptSnapshot, normalizeAiImageUserPrompt } from "@/lib/gamification/ai-image/prompt";
import { getAiImageThemeById, getDefaultUnlockedAiImageThemeIds } from "@/lib/gamification/ai-image/themes";
import { prisma } from "@/lib/prisma";
import type { AiImageGenerationTaskSnapshot } from "@/lib/types";

export class AiImageTaskError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "AiImageTaskError";
    this.status = status;
  }
}

export interface CreateAiImageTaskInput {
  userId: string;
  themeId: string;
  userPrompt?: string;
  requestedCount: 1 | 2 | 4;
  referenceImages: Array<{ dataUrl: string; filename: string }>;
  startRunner?: boolean;
}

interface CreatedTaskContext {
  task: AiImageGenerationTask;
  teamId: string;
}

function isAllowedRequestedCount(value: number): value is CreateAiImageTaskInput["requestedCount"] {
  return AI_IMAGE_ALLOWED_REQUEST_COUNTS.includes(value as (typeof AI_IMAGE_ALLOWED_REQUEST_COUNTS)[number]);
}

function isAllowedRetryCount(value: number) {
  return value >= AI_IMAGE_RETRY_MIN_COUNT && value <= AI_IMAGE_RETRY_MAX_COUNT;
}

function getTaskCoinCost(requestedCount: number) {
  return AI_IMAGE_GENERATION_COIN_COST * requestedCount;
}

function buildRetryAvailability(status: string) {
  return status === "failed" || status === "partial";
}

function toTaskSnapshot(task: {
  id: string;
  themeId: string;
  userPrompt: string | null;
  requestedCount: number;
  status: string;
  coinCost: number;
  refundedCoinAmount: number;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    index: number;
    status: string;
    imageUrl: string | null;
    errorMessage: string | null;
  }>;
}): AiImageGenerationTaskSnapshot {
  return {
    id: task.id,
    themeId: task.themeId,
    userPrompt: task.userPrompt ?? "",
    requestedCount: task.requestedCount,
    status: task.status as AiImageGenerationTaskSnapshot["status"],
    coinCost: task.coinCost,
    refundedCoinAmount: task.refundedCoinAmount,
    errorMessage: task.errorMessage,
    retryAvailable: buildRetryAvailability(task.status),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    items: task.items.map((item) => ({
      id: item.id,
      index: item.index,
      status: item.status as AiImageGenerationTaskSnapshot["items"][number]["status"],
      imageUrl: item.imageUrl,
      errorMessage: item.errorMessage,
    })),
  };
}

async function refundTaskAfterCreateFailure(input: {
  taskId: string;
  userId: string;
  coinCost: number;
  errorMessage: string;
}) {
  await prisma.$transaction(async (tx) => {
    const task = await tx.aiImageGenerationTask.findUnique({
      where: { id: input.taskId },
      select: { coinRefunded: true, refundedCoinAmount: true },
    });

    if (!task) {
      return;
    }

    const shouldRefund = !task.coinRefunded && task.refundedCoinAmount === 0;

    if (shouldRefund) {
      await tx.user.update({
        where: { id: input.userId },
        data: { coins: { increment: input.coinCost } },
      });
    }

    await tx.aiImageGenerationItem.updateMany({
      where: { taskId: input.taskId, status: "queued" },
      data: { status: "failed", errorMessage: input.errorMessage },
    });

    await tx.aiImageGenerationTask.update({
      where: { id: input.taskId },
      data: {
        status: "failed",
        errorMessage: input.errorMessage,
        coinRefunded: shouldRefund ? true : task.coinRefunded,
        refundedCoinAmount: shouldRefund ? input.coinCost : task.refundedCoinAmount,
      },
    });
  });
}

async function persistUploadedInputImages(input: {
  taskId: string;
  userId: string;
  teamId: string;
  referenceImages: Array<{ dataUrl: string; filename: string }>;
}) {
  const uploads = await Promise.all(
    input.referenceImages.map(async (referenceImage, index) => {
      const stored = await uploadAiImageDataUrl({
        dataUrl: referenceImage.dataUrl,
        kind: "input",
        userId: input.userId,
        id: `${input.taskId}-input-${index}`,
      });

      return {
        taskId: input.taskId,
        userId: input.userId,
        teamId: input.teamId,
        imageUrl: stored.imageUrl,
        cosKey: stored.cosKey,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
        sortOrder: index,
      };
    }),
  );

  if (uploads.length > 0) {
    await prisma.aiImageTaskInputImage.createMany({ data: uploads });
  }
}

export async function createAiImageTask(input: CreateAiImageTaskInput): Promise<AiImageGenerationTask> {
  if (!isAllowedRequestedCount(input.requestedCount)) {
    throw new AiImageTaskError(400, "生成数量只支持 1、2、4");
  }

  if (input.referenceImages.length > AI_IMAGE_MAX_REFERENCE_IMAGES) {
    throw new AiImageTaskError(400, `参考图最多 ${AI_IMAGE_MAX_REFERENCE_IMAGES} 张`);
  }

  const theme = getAiImageThemeById(input.themeId);

  if (!theme || !theme.enabled) {
    throw new AiImageTaskError(404, "主题不存在");
  }

  const normalizedUserPrompt = normalizeAiImageUserPrompt(input.userPrompt);
  const promptSnapshotJson = JSON.stringify(
    buildPromptSnapshot({
      theme,
      userPrompt: normalizedUserPrompt,
    }),
  );
  const coinCost = getTaskCoinCost(input.requestedCount);

  const created = await prisma.$transaction(async (tx): Promise<CreatedTaskContext> => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, teamId: true, coins: true },
    });

    if (!user) {
      throw new AiImageTaskError(401, "用户不存在");
    }

    if (!getDefaultUnlockedAiImageThemeIds().includes(input.themeId)) {
      const unlock = await tx.aiImageThemeUnlock.findUnique({
        where: { userId_themeId: { userId: input.userId, themeId: input.themeId } },
        select: { id: true },
      });

      if (!unlock) {
        throw new AiImageTaskError(403, "主题未解锁");
      }
    }

    if (user.coins < coinCost) {
      throw new AiImageTaskError(409, "银子不足");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { coins: { decrement: coinCost } },
    });

    const task = await tx.aiImageGenerationTask.create({
      data: {
        userId: input.userId,
        teamId: user.teamId,
        themeId: input.themeId,
        userPrompt: normalizedUserPrompt || null,
        requestedCount: input.requestedCount,
        status: "queued",
        coinCost,
        coinRefunded: false,
        refundedCoinAmount: 0,
        providerModel: AI_IMAGE_PROVIDER_MODEL,
        promptSnapshotJson,
      },
    });

    await tx.aiImageGenerationItem.createMany({
      data: Array.from({ length: input.requestedCount }, (_, index) => ({
        taskId: task.id,
        userId: input.userId,
        teamId: user.teamId,
        themeId: input.themeId,
        index,
        status: "queued",
      })),
    });

    return { task, teamId: user.teamId };
  });

  if (input.referenceImages.length > 0) {
    try {
      await persistUploadedInputImages({
        taskId: created.task.id,
        userId: input.userId,
        teamId: created.teamId,
        referenceImages: input.referenceImages,
      });
    } catch (error) {
      const errorMessage = "参考图上传失败，已退回金币";
      await refundTaskAfterCreateFailure({
        taskId: created.task.id,
        userId: input.userId,
        coinCost,
        errorMessage,
      });
      throw new AiImageTaskError(502, errorMessage);
    }
  }

  if (input.startRunner !== false) {
    enqueueAiImageTask(created.task.id);
  }

  return created.task;
}

export async function getAiImageTaskForUser(input: {
  userId: string;
  taskId: string;
}): Promise<AiImageGenerationTaskSnapshot> {
  const task = await prisma.aiImageGenerationTask.findFirst({
    where: {
      id: input.taskId,
      userId: input.userId,
    },
    include: {
      items: {
        orderBy: { index: "asc" },
      },
    },
  });

  if (!task) {
    throw new AiImageTaskError(404, "任务不存在");
  }

  return toTaskSnapshot(task);
}

export async function retryAiImageTask(input: {
  userId: string;
  taskId: string;
  startRunner?: boolean;
}): Promise<AiImageGenerationTask> {
  const original = await prisma.aiImageGenerationTask.findFirst({
    where: {
      id: input.taskId,
      userId: input.userId,
    },
    include: {
      items: {
        orderBy: { index: "asc" },
      },
      inputImages: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!original) {
    throw new AiImageTaskError(404, "任务不存在");
  }

  if (original.status !== "failed" && original.status !== "partial") {
    throw new AiImageTaskError(409, "当前任务不能重试");
  }

  const theme = getAiImageThemeById(original.themeId);

  if (!theme || !theme.enabled) {
    throw new AiImageTaskError(404, "主题不存在");
  }

  const failedItemCount = original.items.filter((item) => item.status === "failed").length;
  const retryCount = original.status === "partial" ? failedItemCount : original.requestedCount;

  if (!isAllowedRetryCount(retryCount)) {
    throw new AiImageTaskError(409, "当前任务不能重试");
  }

  const coinCost = getTaskCoinCost(retryCount);

  const task = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { id: true, teamId: true, coins: true },
    });

    if (!user) {
      throw new AiImageTaskError(401, "用户不存在");
    }

    if (user.coins < coinCost) {
      throw new AiImageTaskError(409, "银子不足");
    }

    await tx.user.update({
      where: { id: input.userId },
      data: { coins: { decrement: coinCost } },
    });

    const createdTask = await tx.aiImageGenerationTask.create({
      data: {
        userId: input.userId,
        teamId: user.teamId,
        themeId: original.themeId,
        userPrompt: original.userPrompt,
        requestedCount: retryCount,
        status: "queued",
        coinCost,
        coinRefunded: false,
        refundedCoinAmount: 0,
        providerModel: original.providerModel,
        promptSnapshotJson: original.promptSnapshotJson,
        retryOfTaskId: original.id,
      },
    });

    await tx.aiImageGenerationItem.createMany({
      data: Array.from({ length: retryCount }, (_, index) => ({
        taskId: createdTask.id,
        userId: input.userId,
        teamId: user.teamId,
        themeId: original.themeId,
        index,
        status: "queued",
      })),
    });

    if (original.inputImages.length > 0) {
      await tx.aiImageTaskInputImage.createMany({
        data: original.inputImages.map((image) => ({
          taskId: createdTask.id,
          userId: input.userId,
          teamId: user.teamId,
          imageUrl: image.imageUrl,
          cosKey: image.cosKey,
          mimeType: image.mimeType,
          sizeBytes: image.sizeBytes,
          sortOrder: image.sortOrder,
        })),
      });
    }

    return createdTask;
  });

  if (input.startRunner !== false) {
    enqueueAiImageTask(task.id);
  }

  return task;
}

export async function settleTimedOutAiImageTask(input: {
  taskId: string;
  now?: Date;
}): Promise<void> {
  const now = input.now ?? new Date();
  const task = await prisma.aiImageGenerationTask.findUnique({
    where: { id: input.taskId },
    select: {
      id: true,
      userId: true,
      status: true,
      coinCost: true,
      coinRefunded: true,
      refundedCoinAmount: true,
      updatedAt: true,
    },
  });

  if (!task || task.status !== "running") {
    return;
  }

  if (now.getTime() - task.updatedAt.getTime() < AI_IMAGE_TASK_TIMEOUT_MS) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.aiImageGenerationTask.findUnique({
      where: { id: input.taskId },
      select: {
        id: true,
        userId: true,
        status: true,
        coinCost: true,
        coinRefunded: true,
        refundedCoinAmount: true,
        updatedAt: true,
      },
    });

    if (!current || current.status !== "running") {
      return;
    }

    const shouldRefund = !current.coinRefunded && current.refundedCoinAmount === 0;

    if (shouldRefund) {
      await tx.user.update({
        where: { id: current.userId },
        data: { coins: { increment: current.coinCost } },
      });
    }

    await tx.aiImageGenerationItem.updateMany({
      where: {
        taskId: current.id,
        status: { in: ["queued", "running"] },
      },
      data: {
        status: "failed",
        errorMessage: "任务处理超时",
      },
    });

    await tx.aiImageGenerationTask.update({
      where: { id: current.id },
      data: {
        status: "failed",
        errorMessage: "任务处理超时",
        coinRefunded: shouldRefund ? true : current.coinRefunded,
        refundedCoinAmount: shouldRefund ? current.coinCost : current.refundedCoinAmount,
      },
    });
  });
}
