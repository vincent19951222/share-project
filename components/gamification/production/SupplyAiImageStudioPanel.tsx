"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import type { SupplyAiImageSnapshot } from "@/lib/types";

export interface CreateAiImageGenerationTaskPayload {
  themeId: string;
  userPrompt: string;
  requestedCount: 1 | 2 | 4;
  referenceImages: Array<{ dataUrl: string; filename: string }>;
}

interface LocalReferenceImage {
  id: string;
  dataUrl: string;
  filename: string;
}

interface SupplyAiImageStudioPanelProps {
  snapshot: SupplyAiImageSnapshot;
  onCreateTask: (payload: CreateAiImageGenerationTaskPayload) => Promise<boolean | void> | boolean | void;
  onRetryTask: (taskId: string) => Promise<void> | void;
}

let localReferenceImageSeq = 0;

function createLocalReferenceImageId() {
  localReferenceImageSeq += 1;
  return `reference-image-${localReferenceImageSeq}`;
}

async function readFileAsDataUrl(file: File): Promise<LocalReferenceImage> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("读取参考图失败"));
        return;
      }

      resolve({
        id: createLocalReferenceImageId(),
        dataUrl: reader.result,
        filename: file.name,
      });
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("读取参考图失败"));
    };

    reader.readAsDataURL(file);
  });
}

const COUNT_OPTIONS: Array<1 | 2 | 4> = [1, 2, 4];

function formatTaskStatus(status: SupplyAiImageSnapshot["recentTasks"][number]["status"]) {
  switch (status) {
    case "queued":
      return "排队中";
    case "running":
      return "生成中";
    case "completed":
      return "已完成";
    case "partial":
      return "部分完成";
    case "failed":
      return "已失败";
    default:
      return status;
  }
}

function formatItemStatus(status: SupplyAiImageSnapshot["recentTasks"][number]["items"][number]["status"]) {
  switch (status) {
    case "queued":
      return "排队中";
    case "running":
      return "生成中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return status;
  }
}

function formatTaskErrorMessage(task: SupplyAiImageSnapshot["recentTasks"][number]) {
  if (!task.errorMessage) {
    return null;
  }

  if (task.retryAvailable || task.status === "partial" || task.status === "failed") {
    return "任务有未完成的图片，可直接重试。";
  }

  return "这次生成暂时没完成，可以稍后再试。";
}

function formatItemErrorMessage(item: SupplyAiImageSnapshot["recentTasks"][number]["items"][number]) {
  if (!item.errorMessage) {
    return null;
  }

  return "这张图片暂时没出图，重试后会重新排队。";
}

export function SupplyAiImageStudioPanel({
  snapshot,
  onCreateTask,
  onRetryTask,
}: SupplyAiImageStudioPanelProps) {
  const unlockedThemes = snapshot.themes.unlocked.filter((theme) => theme.enabled && theme.unlocked);
  const [selectedThemeId, setSelectedThemeId] = useState<string>(unlockedThemes[0]?.id ?? "");
  const [requestedCount, setRequestedCount] = useState<1 | 2 | 4>(1);
  const [userPrompt, setUserPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<LocalReferenceImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!unlockedThemes.some((theme) => theme.id === selectedThemeId)) {
      setSelectedThemeId(unlockedThemes[0]?.id ?? "");
    }
  }, [selectedThemeId, unlockedThemes]);

  const selectedTheme = useMemo(
    () => unlockedThemes.find((theme) => theme.id === selectedThemeId) ?? unlockedThemes[0] ?? null,
    [selectedThemeId, unlockedThemes],
  );

  const canGenerate =
    Boolean(selectedTheme) &&
    !isSubmitting &&
    snapshot.wallet.coins >= snapshot.wallet.generationCostPerImage * requestedCount;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 3 - referenceImages.length));

    if (files.length === 0) {
      return;
    }

    const uploaded = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
    setReferenceImages((current) => [...current, ...uploaded].slice(0, 3));
    event.target.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedTheme || !canGenerate) {
      return;
    }

    setIsSubmitting(true);

    try {
      const didSucceed = await onCreateTask({
        themeId: selectedTheme.id,
        requestedCount,
        userPrompt,
        referenceImages: referenceImages.map((image) => ({
          dataUrl: image.dataUrl,
          filename: image.filename,
        })),
      });
      if (didSucceed !== false) {
        setUserPrompt("");
        setReferenceImages([]);
      }
    } catch {
      // Keep the local draft intact when the create request fails.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async (taskId: string) => {
    setRetryingTaskId(taskId);

    try {
      await onRetryTask(taskId);
    } finally {
      setRetryingTaskId((current) => (current === taskId ? null : current));
    }
  };

  return (
    <section className="supply-ai-image-studio-panel flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
        <div className="soft-card flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">AI IMAGE STUDIO</p>
              <h2 className="mt-1 text-2xl font-black text-main">AI 生图工位</h2>
            </div>
            <div className="rounded-xl border-[3px] border-slate-900 bg-yellow-100 px-4 py-3 text-right shadow-[0_4px_0_0_#1f2937]">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">银子余额</p>
              <p className="mt-1 text-2xl font-black text-main">{snapshot.wallet.coins}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {unlockedThemes.map((theme) => {
              const isActive = theme.id === selectedTheme?.id;

              return (
                <button
                  key={theme.id}
                  className={`rounded-xl border-[3px] p-3 text-left shadow-[0_4px_0_0_#1f2937] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_0_#1f2937] ${
                    isActive ? "border-slate-900 bg-yellow-200" : "border-slate-300 bg-white"
                  }`}
                  onClick={() => setSelectedThemeId(theme.id)}
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-main">{theme.name}</p>
                      <p className="mt-1 text-xs font-bold text-sub">{theme.description}</p>
                    </div>
                    <span className="rounded-full border-2 border-slate-900 bg-white px-2 py-1 text-[10px] font-black text-main shadow-[0_2px_0_0_#1f2937]">
                      {theme.tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
            <label className="flex flex-col gap-2">
              <span className="pl-1 text-xs font-black uppercase tracking-[0.16em] text-sub">追加要求</span>
              <textarea
                className="min-h-[120px] rounded-xl border-[3px] border-slate-900 bg-white px-4 py-3 text-sm font-bold text-main shadow-[0_4px_0_0_#1f2937] outline-none placeholder:text-slate-400"
                onInput={(event) => setUserPrompt((event.target as HTMLTextAreaElement).value)}
                placeholder="想要海报感、赛博灯牌、像素战报..."
                value={userPrompt}
              />
            </label>

            <div className="flex flex-col gap-3 rounded-xl border-[3px] border-slate-900 bg-slate-50 p-4 shadow-[0_4px_0_0_#1f2937]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-sub">生成数量</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      className={`h-11 rounded-xl border-[3px] text-base font-black shadow-[0_3px_0_0_#1f2937] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_0_#1f2937] ${
                        requestedCount === count ? "border-slate-900 bg-yellow-300 text-main" : "border-slate-300 bg-white text-sub"
                      }`}
                      onClick={() => setRequestedCount(count)}
                      type="button"
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-sub">参考图</p>
                <label className="mt-2 flex cursor-pointer items-center justify-center rounded-xl border-[3px] border-dashed border-slate-400 bg-white px-3 py-4 text-center text-sm font-black text-main shadow-[0_3px_0_0_#1f2937]">
                  <input accept="image/*" className="sr-only" multiple onChange={handleFileChange} type="file" />
                  上传参考图
                </label>
                <div className="mt-2 flex flex-col gap-2">
                  {referenceImages.map((image) => (
                    <div
                      key={image.id}
                      data-reference-image-id={image.id}
                      className="flex items-center justify-between gap-2 rounded-lg border-2 border-slate-300 bg-white px-3 py-2 text-sm font-bold text-main"
                    >
                      <span className="truncate">{image.filename}</span>
                      <button
                        aria-label={`删除参考图 ${image.filename}`}
                        className="rounded-lg border-2 border-slate-900 bg-white px-2 py-1 text-xs font-black text-main shadow-[0_2px_0_0_#1f2937]"
                        onClick={() =>
                          setReferenceImages((current) =>
                            current.filter((candidate) => candidate.id !== image.id),
                          )
                        }
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                className="quest-btn mt-auto w-full px-4 py-3 text-sm disabled:opacity-50"
                data-action="create-ai-image-task"
                disabled={!canGenerate}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {isSubmitting ? "生成中..." : `生成 ${requestedCount} 张`}
              </button>
            </div>
          </div>
        </div>

        <aside className="soft-card flex flex-col gap-3 p-4">
          <div className="rounded-xl border-[3px] border-slate-900 bg-cyan-50 p-4 shadow-[0_4px_0_0_#1f2937]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sub">当前主题</p>
            <p className="mt-2 text-lg font-black text-main">{selectedTheme?.name ?? "暂无可用主题"}</p>
            <p className="mt-1 text-sm font-bold text-sub">{selectedTheme?.description ?? "先抽一个新主题再开工。"}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border-[3px] border-slate-900 bg-white p-3 shadow-[0_4px_0_0_#1f2937]">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sub">单张消耗</p>
              <p className="mt-2 text-xl font-black text-main">{snapshot.wallet.generationCostPerImage}</p>
            </div>
            <div className="rounded-xl border-[3px] border-slate-900 bg-white p-3 shadow-[0_4px_0_0_#1f2937]">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-sub">本次合计</p>
              <p className="mt-2 text-xl font-black text-main">
                {snapshot.wallet.generationCostPerImage * requestedCount}
              </p>
            </div>
          </div>

          <div className="rounded-xl border-[3px] border-slate-900 bg-white p-4 shadow-[0_4px_0_0_#1f2937]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sub">最近成图</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {snapshot.recentArtworks.slice(0, 4).map((artwork) => (
                <div
                  key={artwork.id}
                  className="overflow-hidden rounded-lg border-2 border-slate-900 bg-slate-100 shadow-[0_3px_0_0_#1f2937]"
                >
                  <img
                    alt="近期生成作品"
                    className="aspect-square w-full object-cover"
                    src={artwork.imageUrl}
                  />
                </div>
              ))}
              {snapshot.recentArtworks.length === 0 ? (
                <div className="col-span-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-center text-sm font-bold text-sub">
                  还没开图
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <div className="soft-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sub">最近任务</p>
            <h3 className="mt-1 text-lg font-black text-main">任务队列</h3>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {snapshot.recentTasks.map((task) => {
            const taskErrorMessage = formatTaskErrorMessage(task);

            return (
              <article
                key={task.id}
                className="rounded-xl border-[3px] border-slate-900 bg-white p-4 shadow-[0_4px_0_0_#1f2937]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-black text-main">{formatTaskStatus(task.status)}</p>
                      <span className="rounded-full border-2 border-slate-900 bg-yellow-100 px-2 py-1 text-[10px] font-black text-main shadow-[0_2px_0_0_#1f2937]">
                        {task.requestedCount} 张
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-sub">{task.userPrompt || "未追加文案要求"}</p>
                  </div>
                  {task.retryAvailable ? (
                    <button
                      className="rounded-xl border-[3px] border-slate-900 bg-white px-3 py-2 text-sm font-black text-main shadow-[0_3px_0_0_#1f2937] disabled:opacity-50"
                      data-action="retry-ai-image-task"
                      data-task-id={task.id}
                      disabled={retryingTaskId === task.id}
                      onClick={() => void handleRetry(task.id)}
                      type="button"
                    >
                      {retryingTaskId === task.id ? "重试中..." : "重新生成失败项"}
                    </button>
                  ) : null}
                </div>

                {taskErrorMessage ? <p className="mt-3 text-sm font-bold text-sub">{taskErrorMessage}</p> : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {task.items.map((item) => {
                    const itemErrorMessage = formatItemErrorMessage(item);

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border-2 border-slate-300 bg-slate-50 p-3 text-sm font-bold text-main"
                      >
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-sub">#{item.index + 1}</p>
                        <p className="mt-1">{formatItemStatus(item.status)}</p>
                        {itemErrorMessage ? <p className="mt-1 text-xs text-sub">{itemErrorMessage}</p> : null}
                        {item.imageUrl ? (
                          <img
                            alt={`任务 ${task.id} 结果 ${item.index + 1}`}
                            className="mt-2 aspect-square w-full rounded-md border-2 border-slate-900 object-cover"
                            src={item.imageUrl}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}

          {snapshot.recentTasks.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-sub">
              还没有新任务
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
