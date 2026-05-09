"use client";

import { useEffect, useState } from "react";
import {
  fetchGamificationWeeklyReport,
  publishGamificationWeeklyReportRequest,
} from "@/lib/api";
import type {
  GamificationWeeklyReportPublishResult,
  GamificationWeeklyReportSnapshot,
} from "@/lib/types";

interface Props {
  isAdmin: boolean;
}

function statusText(snapshot: GamificationWeeklyReportSnapshot) {
  return snapshot.published ? "已发布到团队动态" : "未发布";
}

function publishNotice(result: GamificationWeeklyReportPublishResult, sendEnterpriseWechat: boolean) {
  if (!sendEnterpriseWechat) {
    return result.teamDynamic.status === "EXISTING"
      ? {
          tone: "warning" as const,
          text: "本周周报已存在团队动态，本次复用原记录。",
        }
      : {
          tone: "success" as const,
          text: "周报已发布到团队动态。",
        };
  }

  if (result.wechat.status === "SENT") {
    return {
      tone: "success" as const,
      text: "周报已发布，企业微信已发送。",
    };
  }

  if (result.wechat.status === "FAILED") {
    return {
      tone: "warning" as const,
      text: `周报已发布，但企业微信发送失败：${result.wechat.failureReason ?? "请稍后重试"}`,
    };
  }

  if (result.wechat.status === "SKIPPED") {
    return {
      tone: "warning" as const,
      text: "周报已发布，但企业微信本次未发送。",
    };
  }

  return {
    tone: "warning" as const,
    text: "周报已发布，企业微信状态待确认。",
  };
}

function renderShellMessage(message: string, tone: "default" | "error" = "default") {
  const toneClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-slate-200 bg-[rgba(255,255,255,0.92)] text-slate-700";

  return (
    <section
      className="game-weekly-report game-weekly-report-desk relative overflow-hidden rounded-[2rem] border-[2.5px] border-slate-900 bg-[#efe2bf] p-4 shadow-[0_10px_0_0_#1f2937] sm:p-5"
      aria-live="polite"
    >
      <div className="absolute inset-x-6 top-0 h-4 rounded-b-[1rem] border-x-[2.5px] border-b-[2.5px] border-slate-900 bg-[#f6d56d]" />
      <div className={`game-weekly-report-paper rounded-[1.6rem] border-2 border-slate-900 p-5 text-sm font-bold leading-relaxed shadow-[8px_8px_0_0_rgba(15,23,42,0.16)] ${toneClass}`}>
        {message}
      </div>
    </section>
  );
}

export function GamificationWeeklyReportPanel({ isAdmin }: Props) {
  const [snapshot, setSnapshot] = useState<GamificationWeeklyReportSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "warning"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const nextSnapshot = await fetchGamificationWeeklyReport();
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "牛马补给周报加载失败",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function publish(sendEnterpriseWechat: boolean) {
    if (!snapshot) {
      return;
    }

    setPublishing(true);
    setError(null);
    setNotice(null);

    try {
      const result = await publishGamificationWeeklyReportRequest({
        weekStartDayKey: snapshot.weekStartDayKey,
        sendEnterpriseWechat,
      });
      setSnapshot(result.snapshot);
      setNotice(publishNotice(result, sendEnterpriseWechat));
    } catch (publishError) {
      setError(
        publishError instanceof Error ? publishError.message : "发布牛马补给周报失败",
      );
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return renderShellMessage("牛马补给周报加载中...");
  }

  if (error && !snapshot) {
    return renderShellMessage(`牛马补给周报加载失败：${error}`, "error");
  }

  if (!snapshot) {
    return renderShellMessage("本周还没有牛马补给数据。");
  }

  return (
    <section
      className="game-weekly-report game-weekly-report-desk game-weekly-prototype-strip relative overflow-hidden rounded-[1.55rem] border-[3px] border-slate-900 bg-[#fffdf7] p-3 shadow-[0_8px_0_0_#1f2937] sm:p-4"
      aria-labelledby="game-weekly-report-title"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(248,250,252,0.34)_1px,transparent_1px),linear-gradient(180deg,rgba(248,250,252,0.26)_1px,transparent_1px)] bg-[length:48px_48px]" />

      <div className="relative z-10 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(21rem,0.82fr)]">
        <div className="game-weekly-report-paper game-weekly-report-main-paper relative overflow-hidden rounded-[1rem] border-2 border-slate-300 bg-[rgba(255,255,255,0.82)] p-4 sm:p-5">
          <div className="game-weekly-report__header flex flex-col gap-3 border-b-2 border-dashed border-slate-300 pb-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="game-weekly-report-title-block flex-row flex-wrap items-center gap-3">
              <h2 id="game-weekly-report-title" className="text-[1.9rem] font-black tracking-[-0.02em] text-slate-900">
                牛马补给周报
              </h2>
              <p className="game-weekly-report__eyebrow text-sm font-black text-slate-700">
                Weekly Supply
              </p>
              <span className="game-weekly-report__status inline-flex rounded-full border-2 border-emerald-700 bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-900">
                ✓ {statusText(snapshot)}
              </span>
            </div>
            <div className="text-left text-xs font-black text-slate-500 lg:text-right">
              <p>
                {snapshot.weekStartDayKey} 至 {snapshot.weekEndDayKey}
              </p>
              <p className="mt-1">SUPPLY DIGEST</p>
            </div>
          </div>

          <div className="game-weekly-report__metrics game-weekly-report-metric-strip mt-4 grid overflow-hidden rounded-[0.9rem] border-2 border-slate-300 bg-white sm:grid-cols-2 xl:grid-cols-4">
            {snapshot.metricCards.map((metric, index) => (
              <article
                key={metric.key}
                className={`game-weekly-card game-weekly-prototype-metric game-weekly-card--${metric.tone} min-h-24 rounded-none border-0 border-slate-300 bg-white p-4 shadow-none ${
                  index < snapshot.metricCards.length - 1 ? "xl:border-r-2" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-slate-900 text-lg ${
                      metric.tone === "highlight"
                        ? "bg-yellow-100"
                        : metric.tone === "success"
                          ? "bg-emerald-100"
                          : "bg-blue-50"
                    }`}
                    aria-hidden="true"
                  >
                    {index === 0 ? "包" : index === 1 ? "人" : index === 2 ? "杯" : "火"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-700">{metric.label}</p>
                    <strong className="mt-1 block text-2xl font-black tracking-[-0.02em] text-slate-900">
                      {metric.value}
                    </strong>
                    <span className="mt-1 block text-xs font-bold leading-relaxed text-slate-600">
                      {metric.helper}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="game-weekly-report__summaries mt-4 grid gap-3 lg:grid-cols-3">
            {snapshot.summaryCards.slice(0, 3).map((card, index) => (
              <article
                key={card.key}
                className={`game-weekly-summary game-weekly-summary--${card.tone} rounded-[0.9rem] border-2 border-slate-200 p-3 shadow-none ${
                  index % 2 === 0 ? "bg-[#fff8db]" : "bg-[#fff1f2]"
                }`}
              >
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Report Note
                </p>
                <h3 className="mt-2 text-lg font-black text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">{card.body}</p>
              </article>
            ))}
          </div>

          {error ? (
            <p className="game-weekly-report__error mt-5 rounded-[1.25rem] border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          {notice ? (
            <p
              className={`game-weekly-report__notice mt-5 rounded-[1.25rem] border-2 px-4 py-3 text-sm font-bold ${
                notice.tone === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {notice.text}
            </p>
          ) : null}

          {isAdmin ? (
            <div className="game-weekly-report-admin-actions mt-4 rounded-[1rem] border-[2.5px] border-slate-900 bg-[#f8fafc] p-4 shadow-[4px_4px_0_0_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Publish Desk
                  </p>
                  <p className="mt-1 text-sm font-bold leading-relaxed text-slate-700">
                    校对过这张补给纸后，再决定只发团队动态，还是连企业微信一起推。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-xl border-2 border-slate-900 bg-[#fde047] px-4 py-2 text-sm font-black text-slate-900 shadow-[0_4px_0_0_#1f2937] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={publishing}
                    onClick={() => void publish(false)}
                  >
                    发布到团队动态
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border-2 border-slate-900 bg-white px-4 py-2 text-sm font-black text-slate-900 shadow-[0_4px_0_0_#1f2937] transition-transform active:translate-y-[2px] active:shadow-[0_2px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={publishing}
                    onClick={() => void publish(true)}
                  >
                    发布并发送企业微信
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="game-weekly-report-highlights-rail relative grid content-start gap-3 border-0 bg-transparent p-0 shadow-none sm:p-0">
          <div className="game-weekly-report-highlights-label w-fit rotate-[-1deg] rounded-sm bg-red-500 px-4 py-2 text-lg font-black text-white shadow-[0_3px_0_0_rgba(127,29,29,0.22)]">
            本周高光
          </div>

          {snapshot.highlights.length > 0 ? (
            snapshot.highlights.slice(0, 3).map((highlight, index) => (
              <article
                key={highlight.id}
                className={`game-weekly-report-highlight-note relative min-h-28 rounded-sm border-2 border-slate-300 p-4 shadow-[5px_6px_0_0_rgba(15,23,42,0.12)] ${
                  index === 0 ? "bg-[#fff4c2]" : index === 1 ? "bg-[#ffe4e6]" : "bg-[#dbeafe]"
                }`}
              >
                <span
                  className={`absolute left-1/2 top-[-0.55rem] h-4 w-4 -translate-x-1/2 rounded-full border-2 border-slate-700 shadow-[0_2px_0_0_rgba(15,23,42,0.18)] ${
                    index === 0 ? "bg-slate-300" : index === 1 ? "bg-red-400" : "bg-blue-400"
                  }`}
                  aria-hidden="true"
                />
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                  Clip {index + 1}
                </p>
                <strong className="mt-2 block text-base font-black leading-snug text-slate-900">
                  {highlight.title}
                </strong>
                <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">
                  {highlight.summary}
                </p>
              </article>
            ))
          ) : (
            <article className="game-weekly-report-highlight-note rounded-sm border-2 border-slate-300 bg-[#fff4c2] p-4 shadow-[5px_6px_0_0_rgba(15,23,42,0.12)]">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                Clip Pending
              </p>
              <p className="mt-2 text-sm font-bold leading-relaxed text-slate-600">
                本周还没有稀有奖励、暴击高光或多人响应。先攒一点素材。
              </p>
            </article>
          )}
        </aside>
      </div>
    </section>
  );
}
