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
  mutationsDisabled?: boolean;
  onCreateTask: (payload: CreateAiImageGenerationTaskPayload) => Promise<boolean | void> | boolean | void;
  onOpenAssets?: () => void;
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
const MAX_REFERENCE_IMAGES = 3;
const TASK_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  month: "2-digit",
  day: "2-digit",
});
const TASK_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatTaskCreatedAt(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "时间未知";
  }

  const date = new Date(timestamp);
  return `${TASK_DATE_FORMATTER.format(date)} ${TASK_TIME_FORMATTER.format(date)}`;
}

function buildThemeOptions(snapshot: SupplyAiImageSnapshot) {
  const byId = new Map<string, SupplyAiImageSnapshot["themes"]["unlocked"][number]>();

  for (const theme of [...snapshot.themes.unlocked, ...snapshot.themes.locked]) {
    if (theme.enabled) {
      byId.set(theme.id, {
        ...theme,
        unlocked: true,
        defaultUnlocked: true,
      });
    }
  }

  return Array.from(byId.values()).sort((left, right) => left.sortOrder - right.sortOrder);
}

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
  mutationsDisabled = false,
  snapshot,
  onCreateTask,
  onOpenAssets,
  onRetryTask,
}: SupplyAiImageStudioPanelProps) {
  const themeOptions = useMemo(() => buildThemeOptions(snapshot), [snapshot]);
  const [selectedThemeId, setSelectedThemeId] = useState<string>(themeOptions[0]?.id ?? "");
  const [requestedCount, setRequestedCount] = useState<1 | 2 | 4>(1);
  const [userPrompt, setUserPrompt] = useState("");
  const [referenceImages, setReferenceImages] = useState<LocalReferenceImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  useEffect(() => {
    if (!themeOptions.some((theme) => theme.id === selectedThemeId)) {
      setSelectedThemeId(themeOptions[0]?.id ?? "");
    }
  }, [selectedThemeId, themeOptions]);

  const selectedTheme = useMemo(
    () => themeOptions.find((theme) => theme.id === selectedThemeId) ?? themeOptions[0] ?? null,
    [selectedThemeId, themeOptions],
  );
  const taskThemeNames = useMemo(
    () => new Map(themeOptions.map((theme) => [theme.id, theme.name])),
    [themeOptions],
  );
  const taskCoinCost = snapshot.wallet.generationCostPerImage * requestedCount;

  const canGenerate =
    Boolean(selectedTheme) &&
    !mutationsDisabled &&
    !isSubmitting &&
    snapshot.wallet.coins >= taskCoinCost;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, MAX_REFERENCE_IMAGES - referenceImages.length));

    if (files.length === 0) {
      event.target.value = "";
      return;
    }

    const uploaded = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
    setReferenceImages((current) => [...current, ...uploaded].slice(0, MAX_REFERENCE_IMAGES));
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
        setIsComposerExpanded(false);
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
    <section className="supply-ai-image-studio-panel xl:h-[calc(100dvh-8rem)] xl:min-h-[620px] xl:overflow-hidden">
      <div className="grid gap-5 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(360px,430px)] xl:items-start">
        <div className="min-w-0 space-y-4 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:gap-4 xl:space-y-0 xl:overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">AI IMAGE STUDIO</p>
              <h2 className="mt-1 text-2xl font-black text-main">选择主题</h2>
            </div>
            <span className="rounded-full border-2 border-slate-900 bg-yellow-200 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-main shadow-[0_2px_0_0_#1f2937]">
              {themeOptions.length} THEMES
            </span>
          </div>

          <div
            data-testid="supply-theme-masonry"
            className="xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain xl:pr-2"
          >
            <div data-testid="supply-theme-masonry-columns" className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {themeOptions.map((theme) => {
                const isActive = theme.id === selectedTheme?.id;

                return (
                  <button
                    key={theme.id}
                    aria-pressed={isActive}
                    className={`group mb-4 w-full break-inside-avoid overflow-hidden rounded-[1.25rem] border-[3px] bg-white text-left shadow-[5px_5px_0_0_#1f2937] transition-transform hover:-translate-y-0.5 active:translate-y-[2px] ${
                      isActive
                        ? "border-blue-500 shadow-[7px_7px_0_0_#3b82f6]"
                        : "border-slate-900 hover:shadow-[7px_7px_0_0_#fde047]"
                    }`}
                    data-testid="supply-theme-card"
                    onClick={() => setSelectedThemeId(theme.id)}
                    type="button"
                  >
                    <div className="relative overflow-hidden bg-slate-100">
                      <img
                        alt=""
                        aria-hidden="true"
                        className="block h-auto w-full"
                        loading="lazy"
                        src={theme.previewImageUrl}
                      />
                      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 bg-gradient-to-t from-slate-950/75 via-slate-950/35 to-transparent px-3 pb-3 pt-12">
                        <span className="rounded-full border border-white/70 bg-white px-2.5 py-1 text-[11px] font-black text-main shadow-[2px_2px_0_rgba(31,41,55,0.28)]">
                          {theme.tag}
                        </span>
                        <span className="rounded-full border border-white/70 bg-yellow-200 px-2.5 py-1 text-[11px] font-black text-main shadow-[2px_2px_0_rgba(31,41,55,0.28)]">
                          可用
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 px-3 py-3">
                      <p className="text-base font-black text-main">{theme.name}</p>
                      <p className="text-xs font-bold leading-5 text-sub">{theme.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside
          data-testid="supply-creation-control-deck"
          className="soft-card flex max-h-[820px] min-h-0 flex-col overflow-hidden p-4 xl:h-full xl:max-h-none"
        >
          <div className="mb-4 flex shrink-0 items-start justify-between gap-4 border-b-[3px] border-slate-200 pb-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">CONTROL DECK</p>
              <h2 className="mt-1 text-2xl font-black text-main">对话流</h2>
            </div>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {onOpenAssets ? (
                <button
                  className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-[11px] font-black text-main shadow-[0_2px_0_0_#1f2937]"
                  data-action="open-ai-image-assets"
                  onClick={onOpenAssets}
                  type="button"
                >
                  我的资产
                </button>
              ) : null}
              <span className="max-w-[150px] truncate rounded-full border-2 border-slate-900 bg-yellow-100 px-3 py-1 text-[11px] font-black text-main shadow-[0_2px_0_0_#1f2937]">
                {selectedTheme?.name ?? "暂无主题"}
              </span>
            </div>
          </div>

          <div
            data-testid="supply-creation-chat-flow"
            className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1"
            onClick={() => setIsComposerExpanded(false)}
          >
            <article className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                菠
              </span>
              <div className="min-w-0 flex-1 rounded-[1.15rem] rounded-tl-md border-2 border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(31,41,55,0.08)]">
                <p className="text-sm font-black leading-6 text-main">
                  选一个主题，上传参考图，我帮你生成一组训练作品。
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-sub">
                  也可以只写一句风格要求。13 个主题现在都已开放。
                </p>
              </div>
            </article>

            <section data-testid="supply-desktop-task-history" className="space-y-3">
              <div className="pl-[3.25rem] text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                任务队列
              </div>

              {snapshot.recentTasks.length === 0 ? (
                <div className="pl-[3.25rem] text-sm font-bold leading-6 text-sub">
                  生成结果会像聊天记录一样留在这里。
                </div>
              ) : null}

              {snapshot.recentTasks.map((task) => {
                const taskErrorMessage = formatTaskErrorMessage(task);
                const taskThemeName = taskThemeNames.get(task.themeId) ?? "AI 作品";

                return (
                  <article key={task.id} className="flex items-start gap-3" data-task-id={task.id}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                      AI
                    </span>
                    <div className="min-w-0 flex-1 rounded-[1.15rem] rounded-tl-md border-2 border-slate-200 bg-white p-3 shadow-[0_12px_28px_rgba(31,41,55,0.08)]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-black leading-6 text-main">{taskThemeName}</p>
                          <p className="mt-1 text-xs font-bold leading-5 text-sub">
                            {formatTaskCreatedAt(task.createdAt)} · AI 生图
                          </p>
                        </div>
                        <span className="inline-flex min-h-8 min-w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-xs font-black tabular-nums text-white">
                          {task.items.filter((item) => item.status === "completed").length} / {task.requestedCount}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="inline-flex min-h-7 items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {formatTaskStatus(task.status)}
                        </span>
                        {task.retryAvailable ? (
                          <button
                            className="inline-flex min-h-9 items-center justify-center rounded-full bg-slate-950 px-4 text-xs font-black text-white disabled:bg-slate-300"
                            data-action="retry-ai-image-task"
                            data-task-id={task.id}
                            disabled={retryingTaskId === task.id || mutationsDisabled}
                            onClick={() => void handleRetry(task.id)}
                            type="button"
                          >
                            {retryingTaskId === task.id ? "重试中..." : "重新生成失败项"}
                          </button>
                        ) : null}
                      </div>

                      {task.userPrompt ? <p className="mt-3 text-sm font-bold text-sub">{task.userPrompt}</p> : null}
                      {taskErrorMessage ? <p className="mt-2 text-sm font-bold text-sub">{taskErrorMessage}</p> : null}

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {task.items.map((item) => {
                          const itemErrorMessage = formatItemErrorMessage(item);

                          return (
                            <div
                              key={item.id}
                              className="rounded-xl border-2 border-slate-200 bg-slate-50 p-2 text-sm font-bold text-main"
                            >
                              {item.imageUrl ? (
                                <img
                                  alt={`任务 ${task.id} 结果 ${item.index + 1}`}
                                  className="aspect-square w-full rounded-lg border-2 border-slate-900 object-cover"
                                  src={item.imageUrl}
                                />
                              ) : (
                                <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-xs text-sub">
                                  {formatItemStatus(item.status)}
                                </div>
                              )}
                              {itemErrorMessage ? <p className="mt-2 text-xs text-sub">{itemErrorMessage}</p> : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          </div>

          <div data-testid="supply-creation-composer" className="mt-5 shrink-0 space-y-3 border-t-[3px] border-slate-200 pt-4">
            {!isComposerExpanded ? (
              <div className="space-y-2">
                <button
                  aria-pressed="true"
                  className="min-h-10 rounded-full border-2 border-slate-900 bg-white px-4 text-sm font-black text-main shadow-[0_2px_0_0_#1f2937]"
                  type="button"
                >
                  {selectedTheme?.name ?? "选择主题"}
                </button>

                <button
                  className="flex min-h-16 w-full items-center justify-between gap-3 rounded-[1.25rem] border-2 border-slate-200 bg-white px-5 text-left text-base font-black text-sub shadow-[0_14px_34px_rgba(31,41,55,0.08)] transition active:scale-[0.99]"
                  data-testid="supply-composer-collapsed-input"
                  onClick={() => setIsComposerExpanded(true)}
                  type="button"
                >
                  <span>上传参考图，描述想要的作品</span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xl font-black leading-none text-white">
                    +
                  </span>
                </button>
              </div>
            ) : (
              <div
                data-testid="supply-expanded-creation-panel"
                className="space-y-3 rounded-[1.35rem] border-2 border-slate-200 bg-white p-3 shadow-[0_18px_48px_rgba(31,41,55,0.12)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    aria-pressed="true"
                    className="min-h-10 max-w-[180px] truncate rounded-full bg-slate-100 px-4 text-sm font-black text-main"
                    type="button"
                  >
                    {selectedTheme?.name ?? "选择主题"}
                  </button>
                  <span className="text-xs font-bold text-sub">
                    {referenceImages.length > 0
                      ? `${referenceImages.length} / ${MAX_REFERENCE_IMAGES} 张参考图`
                      : "可上传参考图"}
                  </span>
                </div>

                <label
                  className="block cursor-pointer rounded-[1rem] border-2 border-dashed border-slate-300 bg-slate-50 p-1.5 transition active:scale-[0.99]"
                  data-testid="supply-reference-upload-zone"
                >
                  {referenceImages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {referenceImages.map((image) => (
                        <div key={image.id} data-reference-image-id={image.id} className="relative min-w-0">
                          <img
                            alt={image.filename}
                            className="aspect-square w-full rounded-xl border-2 border-slate-200 bg-white object-cover"
                            src={image.dataUrl}
                          />
                          <span className="mt-1 block truncate text-[11px] font-bold text-sub">{image.filename}</span>
                          <button
                            aria-label={`删除参考图 ${image.filename}`}
                            className="absolute -right-1 -top-1 rounded-full border-2 border-white bg-slate-950 px-2 py-1 text-[10px] font-black text-white shadow-[0_6px_14px_rgba(31,41,55,0.22)]"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setReferenceImages((current) => current.filter((candidate) => candidate.id !== image.id));
                            }}
                            type="button"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="flex min-h-[40px] items-center gap-3"
                      data-testid="supply-reference-upload-empty"
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-2xl font-black text-blue-500 shadow-[0_6px_14px_rgba(31,41,55,0.08)]"
                        data-testid="supply-reference-upload-plus"
                      >
                        +
                      </span>
                      <span className="text-sm font-black text-sub">添加参考图</span>
                    </div>
                  )}
                  <input accept="image/*" className="sr-only" multiple onChange={handleFileChange} type="file" />
                </label>

                <label className="block">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-black text-main">补充要求</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-sub">可选</span>
                  </div>
                  <textarea
                    className="min-h-[92px] w-full resize-none rounded-[1rem] border-2 border-slate-200 bg-slate-50 p-3 text-base font-bold leading-6 text-main outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400"
                    onInput={(event) => setUserPrompt((event.target as HTMLTextAreaElement).value)}
                    placeholder="海报感、像素一点、暴汗训练后..."
                    value={userPrompt}
                  />
                </label>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-grid grid-cols-3 rounded-full bg-slate-100 p-1">
                    {COUNT_OPTIONS.map((count) => (
                      <button
                        key={count}
                        aria-label={`生成 ${count} 张`}
                        aria-pressed={requestedCount === count}
                        className={`flex h-10 min-w-10 items-center justify-center rounded-full px-4 text-sm font-black transition ${
                          requestedCount === count ? "bg-slate-950 text-white" : "text-sub active:bg-white"
                        }`}
                        onClick={() => setRequestedCount(count)}
                        type="button"
                      >
                        {count}
                      </button>
                    ))}
                  </div>

                  <button
                    className="quest-btn min-h-12 shrink-0 px-6 py-3 text-sm disabled:opacity-50"
                    data-action="create-ai-image-task"
                    disabled={!canGenerate}
                    onClick={() => void handleSubmit()}
                    type="button"
                  >
                    {isSubmitting ? "生成中..." : `${taskCoinCost}银子 生成 ${requestedCount} 张`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
