import "server-only";

import { uploadAiImageBase64 } from "@/lib/gamification/ai-image/cos-storage";
import { generateAiImage, type GenerateAiImageInput, type GenerateAiImageResult } from "@/lib/gamification/ai-image/provider";
import { settleAiImageTaskByItems } from "@/lib/gamification/ai-image/tasks";
import { prisma } from "@/lib/prisma";

export interface AiImageTaskRunnerDependencies {
  fetchImpl: typeof fetch;
  heartbeatIntervalMs: number;
  provider: (input: GenerateAiImageInput) => Promise<GenerateAiImageResult>;
  upload: typeof uploadAiImageBase64;
}

function buildRunnerDependencies(
  overrides: Partial<AiImageTaskRunnerDependencies> = {},
): AiImageTaskRunnerDependencies {
  return {
    fetchImpl: fetch,
    heartbeatIntervalMs: 5_000,
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

async function finalizeTask(taskId: string) {
  await settleAiImageTaskByItems({ taskId });
}

function startRunnerHeartbeat(input: {
  taskId: string;
  itemId: string;
  intervalMs: number;
}) {
  let stopped = false;
  let inFlight = false;

  const tick = async () => {
    if (stopped || inFlight) {
      return;
    }

    inFlight = true;

    try {
      const now = new Date();
      await Promise.all([
        prisma.aiImageGenerationTask.updateMany({
          where: {
            id: input.taskId,
            status: "running",
          },
          data: { updatedAt: now },
        }),
        prisma.aiImageGenerationItem.updateMany({
          where: {
            id: input.itemId,
            status: "running",
          },
          data: { updatedAt: now },
        }),
      ]);
    } catch {
      // Best-effort heartbeat only.
    } finally {
      inFlight = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, input.intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  void tick();

  return () => {
    stopped = true;
    clearInterval(timer);
  };
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

  try {
    const providerPrompt = readProviderPrompt(task.promptSnapshotJson);
    const referenceImages = await loadReferenceImages(task.inputImages, dependencies.fetchImpl);

    await prisma.aiImageGenerationTask.update({
      where: { id: taskId },
      data: {
        status: "running",
        errorMessage: null,
      },
    });

    for (const item of runnableItems) {
      await prisma.aiImageGenerationItem.update({
        where: { id: item.id },
        data: {
          status: "running",
          errorMessage: null,
        },
      });
      const stopHeartbeat = startRunnerHeartbeat({
        taskId,
        itemId: item.id,
        intervalMs: dependencies.heartbeatIntervalMs,
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
      } finally {
        stopHeartbeat();
      }
    }
  } catch (error) {
    const safeMessage = toSafeErrorMessage(error, "生成失败，请稍后重试");
    await settleAiImageTaskByItems({
      taskId,
      markUnfinishedAsFailedMessage: safeMessage,
      taskErrorMessage: safeMessage,
    });
    return;
  }

  await finalizeTask(taskId);
}

export async function runAiImageTask(taskId: string): Promise<void> {
  await runAiImageTaskWithDependencies(taskId);
}

export function enqueueAiImageTask(taskId: string): void {
  void runAiImageTask(taskId);
}
