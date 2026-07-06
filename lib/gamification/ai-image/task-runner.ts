import "server-only";

import { AI_IMAGE_GENERATION_COIN_COST } from "@/lib/gamification/ai-image/constants";
import { uploadAiImageBase64 } from "@/lib/gamification/ai-image/cos-storage";
import { generateAiImage, type GenerateAiImageInput, type GenerateAiImageResult } from "@/lib/gamification/ai-image/provider";
import { prisma } from "@/lib/prisma";

export interface AiImageTaskRunnerDependencies {
  fetchImpl: typeof fetch;
  provider: (input: GenerateAiImageInput) => Promise<GenerateAiImageResult>;
  upload: typeof uploadAiImageBase64;
}

function buildRunnerDependencies(
  overrides: Partial<AiImageTaskRunnerDependencies> = {},
): AiImageTaskRunnerDependencies {
  return {
    fetchImpl: fetch,
    provider: generateAiImage,
    upload: uploadAiImageBase64,
    ...overrides,
  };
}

function getMimeExtension(mimeType: string) {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
}

function toSafeErrorMessage(error: unknown, fallback = "生成失败，请稍后重试") {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (/[\u4e00-\u9fff]/.test(message)) {
      return message.slice(0, 120);
    }
  }

  return fallback;
}

function readProviderPrompt(promptSnapshotJson: string) {
  try {
    const parsed = JSON.parse(promptSnapshotJson) as { providerPrompt?: string };

    if (!parsed.providerPrompt) {
      throw new Error("missing-provider-prompt");
    }

    return parsed.providerPrompt;
  } catch {
    throw new Error("生成任务缺少可执行提示词");
  }
}

async function loadReferenceImages(
  inputImages: Array<{ imageUrl: string; mimeType: string; sortOrder: number }>,
  fetchImpl: typeof fetch,
) {
  return Promise.all(
    inputImages.map(async (image) => {
      const response = await fetchImpl(image.imageUrl);

      if (!response.ok) {
        throw new Error("参考图读取失败");
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const extension = getMimeExtension(image.mimeType);

      return {
        dataUrl: `data:${image.mimeType};base64,${buffer.toString("base64")}`,
        filename: `reference-${image.sortOrder + 1}.${extension}`,
      };
    }),
  );
}

async function settleRefundForOutcome(input: {
  taskId: string;
  userId: string;
  targetStatus: "completed" | "partial" | "failed";
  targetRefundAmount: number;
  errorMessage: string | null;
}) {
  await prisma.$transaction(async (tx) => {
    const task = await tx.aiImageGenerationTask.findUniqueOrThrow({
      where: { id: input.taskId },
      select: {
        refundedCoinAmount: true,
        coinRefunded: true,
      },
    });
    const refundDelta = Math.max(0, input.targetRefundAmount - task.refundedCoinAmount);

    if (refundDelta > 0) {
      await tx.user.update({
        where: { id: input.userId },
        data: { coins: { increment: refundDelta } },
      });
    }

    await tx.aiImageGenerationTask.update({
      where: { id: input.taskId },
      data: {
        status: input.targetStatus,
        errorMessage: input.errorMessage,
        coinRefunded: input.targetRefundAmount > 0 || task.coinRefunded,
        refundedCoinAmount: Math.max(task.refundedCoinAmount, input.targetRefundAmount),
      },
    });
  });
}

async function finalizeTask(taskId: string, userId: string) {
  const task = await prisma.aiImageGenerationTask.findUnique({
    where: { id: taskId },
    include: {
      items: {
        orderBy: { index: "asc" },
      },
    },
  });

  if (!task) {
    return;
  }

  const completedCount = task.items.filter((item) => item.status === "completed").length;
  const failedItems = task.items.filter((item) => item.status === "failed");
  const failedCount = failedItems.length;

  if (failedCount === 0) {
    await settleRefundForOutcome({
      taskId,
      userId,
      targetStatus: "completed",
      targetRefundAmount: 0,
      errorMessage: null,
    });
    return;
  }

  if (completedCount === 0) {
    await settleRefundForOutcome({
      taskId,
      userId,
      targetStatus: "failed",
      targetRefundAmount: task.coinCost,
      errorMessage: failedItems[0]?.errorMessage ?? "本次生成失败，已退回金币",
    });
    return;
  }

  await settleRefundForOutcome({
    taskId,
    userId,
    targetStatus: "partial",
    targetRefundAmount: failedCount * AI_IMAGE_GENERATION_COIN_COST,
    errorMessage: "部分图片生成失败",
  });
}

export async function runAiImageTaskWithDependencies(
  taskId: string,
  overrides: Partial<AiImageTaskRunnerDependencies> = {},
): Promise<void> {
  const dependencies = buildRunnerDependencies(overrides);
  const task = await prisma.aiImageGenerationTask.findUnique({
    where: { id: taskId },
    include: {
      items: {
        orderBy: { index: "asc" },
      },
      inputImages: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!task || (task.status !== "queued" && task.status !== "running")) {
    return;
  }

  const runnableItems = task.items.filter((item) => item.status === "queued" || item.status === "failed");

  if (runnableItems.length === 0) {
    return;
  }

  await prisma.aiImageGenerationTask.update({
    where: { id: taskId },
    data: {
      status: "running",
      errorMessage: null,
    },
  });

  let referenceImages: GenerateAiImageInput["referenceImages"] = [];

  try {
    referenceImages = await loadReferenceImages(task.inputImages, dependencies.fetchImpl);
  } catch (error) {
    const safeMessage = toSafeErrorMessage(error, "参考图读取失败");
    await prisma.aiImageGenerationItem.updateMany({
      where: {
        taskId,
        status: { in: ["queued", "running", "failed"] },
      },
      data: {
        status: "failed",
        errorMessage: safeMessage,
      },
    });
    await finalizeTask(taskId, task.userId);
    return;
  }

  const providerPrompt = readProviderPrompt(task.promptSnapshotJson);

  for (const item of runnableItems) {
    await prisma.aiImageGenerationItem.update({
      where: { id: item.id },
      data: {
        status: "running",
        errorMessage: null,
      },
    });

    try {
      const result = await dependencies.provider({
        prompt: providerPrompt,
        referenceImages,
      });
      const stored = await dependencies.upload({
        b64Json: result.b64Json,
        mimeType: result.mimeType,
        userId: task.userId,
        id: item.id,
      });

      await prisma.$transaction(async (tx) => {
        await tx.aiImageGenerationItem.update({
          where: { id: item.id },
          data: {
            status: "completed",
            imageUrl: stored.imageUrl,
            cosKey: stored.cosKey,
            errorMessage: null,
          },
        });

        await tx.aiImageArtwork.upsert({
          where: { itemId: item.id },
          create: {
            taskId: task.id,
            itemId: item.id,
            userId: task.userId,
            teamId: task.teamId,
            themeId: task.themeId,
            imageUrl: stored.imageUrl,
            cosKey: stored.cosKey,
            promptSnapshotJson: task.promptSnapshotJson,
          },
          update: {
            imageUrl: stored.imageUrl,
            cosKey: stored.cosKey,
            promptSnapshotJson: task.promptSnapshotJson,
          },
        });
      });
    } catch (error) {
      await prisma.aiImageGenerationItem.update({
        where: { id: item.id },
        data: {
          status: "failed",
          errorMessage: toSafeErrorMessage(error),
        },
      });
    }
  }

  await finalizeTask(taskId, task.userId);
}

export async function runAiImageTask(taskId: string): Promise<void> {
  await runAiImageTaskWithDependencies(taskId);
}

export function enqueueAiImageTask(taskId: string): void {
  void runAiImageTask(taskId);
}
