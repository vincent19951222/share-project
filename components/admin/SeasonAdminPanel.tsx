"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ALLOWED_TARGET_SLOTS } from "@/lib/economy";

type SeasonStatus = "ACTIVE" | "ENDED" | string;

export interface SeasonListItem {
  id: string;
  teamId: string;
  monthKey: string;
  goalName: string;
  targetSlots: number;
  filledSlots: number;
  status: SeasonStatus;
  startedAt: string;
  endedAt: string | null;
}

interface SeasonAdminPanelProps {
  initialSeasons: SeasonListItem[];
}

type SeasonFormState = {
  goalName: string;
  targetSlots: string;
};

function sortNewestFirst(seasons: SeasonListItem[]): SeasonListItem[] {
  return [...seasons].sort((left, right) => {
    const startedDiff = new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime();
    if (startedDiff !== 0) {
      return startedDiff;
    }

    return right.id.localeCompare(left.id);
  });
}

function normalizeSeasonList(nextSeason: SeasonListItem, seasons: SeasonListItem[]) {
  const remaining = seasons.filter((season) => season.id !== nextSeason.id);
  return sortNewestFirst([nextSeason, ...remaining]);
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  } catch {
    // Fall through to the generic message below.
  }

  return "操作没成功，请稍后再试";
}

function getSeasonProgress(season: SeasonListItem) {
  const targetSlots = Math.max(season.targetSlots, 0);
  const filledSlots = Math.min(Math.max(season.filledSlots, 0), targetSlots);
  const remainingSlots = Math.max(targetSlots - filledSlots, 0);
  const percent = targetSlots > 0 ? Math.round((filledSlots / targetSlots) * 100) : 0;

  return {
    filledSlots,
    remainingSlots,
    percent,
    targetSlots,
  };
}

function formatDateLabel(value: string | null) {
  if (!value) {
    return "未记录";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

function getStatusLabel(status: SeasonStatus) {
  if (status === "ACTIVE") {
    return "进行中";
  }

  if (status === "ENDED") {
    return "已结束";
  }

  return status;
}

export function SeasonAdminPanel({ initialSeasons }: SeasonAdminPanelProps) {
  const [seasons, setSeasons] = useState(() => sortNewestFirst(initialSeasons));
  const [form, setForm] = useState<SeasonFormState>({
    goalName: "",
    targetSlots: String(ALLOWED_TARGET_SLOTS[1] ?? ALLOWED_TARGET_SLOTS[0]),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingSeason, setIsCreatingSeason] = useState(false);
  const [isEndingSeason, setIsEndingSeason] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestListRequestRef = useRef(0);
  const latestMutationRef = useRef(0);

  const activeSeason = useMemo(
    () => seasons.find((season) => season.status === "ACTIVE") ?? null,
    [seasons],
  );
  const historySeasons = useMemo(
    () => seasons.filter((season) => season.id !== activeSeason?.id),
    [activeSeason?.id, seasons],
  );
  const canCreateSeason = !activeSeason;

  async function syncSeasons() {
    const requestId = latestListRequestRef.current + 1;
    latestListRequestRef.current = requestId;
    const mutationVersionAtStart = latestMutationRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/seasons");
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = (await response.json()) as { seasons?: SeasonListItem[] };
      if (
        requestId === latestListRequestRef.current &&
        mutationVersionAtStart === latestMutationRef.current
      ) {
        setSeasons(sortNewestFirst(data.seasons ?? []));
      }
    } catch (syncError) {
      if (requestId === latestListRequestRef.current) {
        setError(syncError instanceof Error ? syncError.message : "操作没成功，请稍后再试");
      }
    } finally {
      if (requestId === latestListRequestRef.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void syncSeasons();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreateSeason) {
      return;
    }

    setIsCreatingSeason(true);
    setMessage(null);
    setError(null);

    const goalName = form.goalName.trim();
    const targetSlots = Number(form.targetSlots);

    try {
      const response = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ goalName, targetSlots }),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = (await response.json()) as { season?: SeasonListItem };
      const season = data.season;
      if (!season) {
        throw new Error("Season response was empty");
      }

      latestMutationRef.current += 1;
      setSeasons((current) => normalizeSeasonList(season, current));
      setForm({
        goalName: "",
        targetSlots: String(ALLOWED_TARGET_SLOTS[1] ?? ALLOWED_TARGET_SLOTS[0]),
      });
      setMessage("新赛季已开启");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作没成功，请稍后再试");
    } finally {
      setIsCreatingSeason(false);
    }
  }

  async function handleEndSeason() {
    setIsEndingSeason(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/seasons/current", {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = (await response.json()) as { season?: SeasonListItem };
      const season = data.season;
      if (!season) {
        throw new Error("Season response was empty");
      }

      latestMutationRef.current += 1;
      setSeasons((current) => normalizeSeasonList(season, current));
      setMessage("当前赛季已结束");
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : "操作没成功，请稍后再试");
    } finally {
      setIsEndingSeason(false);
    }
  }

  return (
    <section className="soft-card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-black text-slate-800">赛季设置</h1>
          <p className="text-sm text-sub">给团队开新赛季，顺手看看这一期冲到哪了。</p>
        </div>
        <Link
          href="/"
          className="rounded-full border-2 border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
        >
          回到打卡页
        </Link>
      </div>

      <form
        className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black text-slate-800">开启新赛季</h2>
          <p className="text-sm text-sub">
            {canCreateSeason
              ? "现在没有进行中的赛季，可以直接开启下一期团队冲刺。"
              : "已有进行中的赛季，先结束当前赛季再开启新赛季。"}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold text-slate-700">
          冲刺目标
          <input
            name="goalName"
            value={form.goalName}
            onChange={(event) =>
              setForm((current) => ({ ...current, goalName: event.target.value }))
            }
            placeholder="例如: 五月掉脂挑战"
            disabled={!canCreateSeason || isCreatingSeason || isEndingSeason}
            className="rounded-xl border-2 border-slate-200 px-3 py-2 text-base outline-none focus:border-slate-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold text-slate-700">
          目标格数
          <select
            name="targetSlots"
            value={form.targetSlots}
            onChange={(event) =>
              setForm((current) => ({ ...current, targetSlots: event.target.value }))
            }
            disabled={!canCreateSeason || isCreatingSeason || isEndingSeason}
            className="rounded-xl border-2 border-slate-200 px-3 py-2 text-base outline-none focus:border-slate-800"
          >
            {ALLOWED_TARGET_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!canCreateSeason || isCreatingSeason || isEndingSeason}
          className="rounded-xl border-2 border-slate-800 bg-yellow-300 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isCreatingSeason ? "正在开赛季..." : canCreateSeason ? "开启新赛季" : "已有赛季进行中"}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm text-sub">
        <span>{isLoading ? "正在同步赛季状态..." : "赛季数据已就位。"}</span>
        <button
          type="button"
          onClick={() => void syncSeasons()}
          className="rounded-full border-2 border-slate-200 px-3 py-1 font-bold text-slate-700"
        >
          刷新一下
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-800">当前赛季</h2>
          {activeSeason ? (
            <button
              type="button"
              onClick={() => void handleEndSeason()}
              disabled={isCreatingSeason || isEndingSeason}
              className="rounded-full border-2 border-slate-800 bg-white px-3 py-1 text-xs font-black text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEndingSeason ? "正在结束..." : "结束当前赛季"}
            </button>
          ) : null}
        </div>

        {activeSeason ? (
          (() => {
            const progress = getSeasonProgress(activeSeason);

            return (
              <div className="space-y-3 rounded-2xl border-2 border-slate-800 bg-white p-4 text-sm text-slate-700 shadow-[0_4px_0_0_#1f2937]">
                <span className="inline-flex w-fit rounded-full border-2 border-slate-800 bg-yellow-300 px-3 py-1 text-xs font-black text-slate-900">
                  当前正在冲刺
                </span>
                <div className="font-black text-slate-900">{activeSeason.goalName}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>赛季月份 {activeSeason.monthKey}</span>
                  <span>状态 {getStatusLabel(activeSeason.status)}</span>
                  <span>
                    进度 {progress.filledSlots}/{progress.targetSlots}
                  </span>
                  <span>完成率 {progress.percent}%</span>
                  <span>还差 {progress.remainingSlots} 格</span>
                  <span>开始于 {formatDateLabel(activeSeason.startedAt)}</span>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-sub">
            现在没有进行中的赛季，可以直接开启下一期团队冲刺。
          </div>
        )}
      </div>

      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-black text-slate-800">赛季历史</h2>
        {historySeasons.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {historySeasons.map((season) => {
              const progress = getSeasonProgress(season);

              return (
                <li
                  key={season.id}
                  className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3"
                >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-900">{season.goalName}</span>
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-sub">
                    {getStatusLabel(season.status)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub">
                  <div>{season.monthKey}</div>
                  <div>
                    进度 {progress.filledSlots}/{progress.targetSlots}
                  </div>
                  <div>完成率 {progress.percent}%</div>
                  <div>开始于 {formatDateLabel(season.startedAt)}</div>
                  <div>结束于 {formatDateLabel(season.endedAt)}</div>
                </div>
              </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-sub">还没有历史赛季。</p>
        )}
      </div>
    </section>
  );
}
