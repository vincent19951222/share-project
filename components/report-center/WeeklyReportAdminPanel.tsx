"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchCurrentWeeklyReportDraft,
  generateCurrentWeeklyReportDraft,
  publishCurrentWeeklyReportDraft,
  type WeeklyReportDraftRecord,
  type WeeklyReportPublishResult,
} from "@/lib/api";
import { QuestBtn } from "@/components/ui/QuestBtn";

function formatDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-");
  if (!year || !month || !day) {
    return dayKey;
  }

  return `${year}.${month}.${day}`;
}

function formatWeekRange(draft: WeeklyReportDraftRecord | null) {
  if (!draft) {
    return "本周一到今天";
  }

  return `${formatDayKey(draft.snapshot.weekStartDayKey)} - ${formatDayKey(draft.snapshot.weekEndDayKey)}`;
}

function getPublishMessage(result: WeeklyReportPublishResult) {
  if (!result.id) {
    return "周报已发布到团队动态。";
  }

  return `周报已发布到团队动态，团队动态记录号 ${result.id}。`;
}

function getDraftStatusLabel({
  hasDraft,
  published,
  isLoading,
  hasError,
}: {
  hasDraft: boolean;
  published: boolean;
  isLoading: boolean;
  hasError: boolean;
}) {
  if (isLoading) {
    return "正在同步草稿状态";
  }

  if (hasError) {
    return "草稿状态待确认";
  }

  if (published) {
    return "已发布到团队动态";
  }

  if (hasDraft) {
    return "已生成草稿";
  }

  return "还没生成本周草稿";
}

export function WeeklyReportAdminPanel() {
  const [draft, setDraft] = useState<WeeklyReportDraftRecord | null>(null);
  const [published, setPublished] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      setIsLoadingDraft(true);
      setError(null);

      try {
        const nextDraft = await fetchCurrentWeeklyReportDraft();
        if (!cancelled) {
          setDraft(nextDraft);
        }
      } catch (loadError) {
        if (cancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "获取本周周报草稿失败");
      } finally {
        if (!cancelled) {
          setIsLoadingDraft(false);
        }
      }
    }

    void loadDraft();

    return () => {
      cancelled = true;
    };
  }, []);

  const draftStatus = useMemo(
    () =>
      getDraftStatusLabel({
        hasDraft: Boolean(draft),
        published,
        isLoading: isLoadingDraft,
        hasError: Boolean(error),
      }),
    [draft, error, isLoadingDraft, published],
  );

  async function handleGenerateDraft() {
    setIsGenerating(true);
    setError(null);
    setMessage(null);

    try {
      const nextDraft = await generateCurrentWeeklyReportDraft();
      setDraft(nextDraft);
      setPublished(false);
      setMessage("本周周报草稿已更新；如果之前发过，请重新确认是否需要再次发布。");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "生成本周周报失败");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handlePublishDraft() {
    if (!draft) {
      return;
    }

    setIsPublishing(true);
    setError(null);
    setMessage(null);

    try {
      const result = await publishCurrentWeeklyReportDraft();
      setPublished(true);
      setMessage(getPublishMessage(result));
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "发布本周周报失败");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <section className="weekly-report-admin-sheet relative overflow-hidden rounded-[1.9rem] border-[2.5px] border-slate-900 bg-[#efe3c4] p-4 shadow-[0_12px_0_0_#1f2937] sm:p-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.28),_transparent_58%)]" />
      <div className="absolute right-8 top-0 h-5 w-24 rounded-b-[1rem] border-x-[2.5px] border-b-[2.5px] border-slate-900 bg-[#f6d56d]" />

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex flex-col gap-1 rounded-[1.5rem] border-[2.5px] border-slate-900 bg-[rgba(255,255,255,0.94)] p-5 shadow-[8px_8px_0_0_rgba(15,23,42,0.14)] sm:flex-row sm:items-start sm:justify-between">
        <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Proof Desk</p>
            <h2 className="mt-1 text-[1.9rem] font-black tracking-[-0.04em] text-slate-900">本周周报</h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-slate-600">
              管理员先生成草稿，再决定什么时候公开到团队动态。
            </p>
        </div>
          <div className="rounded-full border-2 border-slate-900 bg-[#fde68a] px-3 py-1 text-xs font-black text-slate-900">
            {draftStatus}
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.25rem] border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-[1.25rem] border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="rounded-[1.5rem] border-[2.5px] border-slate-900 bg-[rgba(255,255,255,0.94)] p-4 shadow-[8px_8px_0_0_rgba(15,23,42,0.14)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-slate-300 pb-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Current Window</p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {error && !draft ? "状态待确认" : formatWeekRange(draft)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <QuestBtn
                  type="button"
                  className="px-4 py-2 text-sm disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-[0_4px_0_0_#1f2937]"
                  onClick={() => void handleGenerateDraft()}
                  disabled={isGenerating || isPublishing}
                >
                  {isGenerating ? "正在生成..." : "生成本周周报"}
                </QuestBtn>
                <button
                  type="button"
                  className="rounded-xl border-2 border-slate-800 bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#1f2937] transition-transform active:translate-y-[2px] active:shadow-[0_1px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => void handlePublishDraft()}
                  disabled={!draft || isGenerating || isPublishing}
                >
                  {isPublishing ? "正在发布..." : "发布到团队动态"}
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm font-bold leading-relaxed text-slate-600">
              生成会覆盖你本周最新草稿；发布只推送当前草稿，不会改动打卡、咖啡或赛季数据。
            </p>
          </div>

          <div className="weekly-report-admin-proof-sheet rounded-[1.55rem] border-[2.5px] border-slate-900 bg-[#fff8e8] p-4 shadow-[8px_8px_0_0_rgba(15,23,42,0.14)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Proof Sheet</p>
            {draft ? (
              <div className="mt-2 space-y-2">
                <p className="text-base font-black leading-relaxed text-slate-900">{draft.summary}</p>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-1">
                    总打卡 {draft.snapshot.metrics.totalPunches} 次
                  </span>
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-1">
                    全勤 {draft.snapshot.metrics.fullAttendanceDays} 天
                  </span>
                  {draft.snapshot.metrics.seasonProgress ? (
                    <span className="rounded-full border border-slate-300 bg-white px-2 py-1">
                      赛季 {draft.snapshot.metrics.seasonProgress.filledSlots}/
                      {draft.snapshot.metrics.seasonProgress.targetSlots}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">
                {error
                  ? "草稿拉取失败，请先重试或重新生成后再发布。"
                  : "还没生成本周草稿。先跑一次生成，再决定要不要公开给团队。"}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
