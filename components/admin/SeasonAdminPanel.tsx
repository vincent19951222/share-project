"use client";

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

  return "Request failed";
}

export function SeasonAdminPanel({ initialSeasons }: SeasonAdminPanelProps) {
  const [seasons, setSeasons] = useState(() => sortNewestFirst(initialSeasons));
  const [form, setForm] = useState<SeasonFormState>({
    goalName: "",
    targetSlots: String(ALLOWED_TARGET_SLOTS[1] ?? ALLOWED_TARGET_SLOTS[0]),
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        setError(syncError instanceof Error ? syncError.message : "Request failed");
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
    setIsSubmitting(true);
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
      setMessage("Season created");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEndSeason() {
    setIsSubmitting(true);
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
      setMessage("Current season ended");
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : "Request failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="soft-card flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-800">赛季设置</h1>
        <p className="text-sm text-sub">Create and manage the team season schedule.</p>
      </div>

      <form
        className="flex flex-col gap-3 rounded-2xl border-2 border-slate-200 bg-white p-4"
        onSubmit={handleSubmit}
      >
        <label className="flex flex-col gap-1 text-sm font-bold text-slate-700">
          Goal name
          <input
            name="goalName"
            value={form.goalName}
            onChange={(event) =>
              setForm((current) => ({ ...current, goalName: event.target.value }))
            }
            placeholder="例如: 五月掉脂挑战"
            className="rounded-xl border-2 border-slate-200 px-3 py-2 text-base outline-none focus:border-slate-800"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold text-slate-700">
          Target slots
          <select
            name="targetSlots"
            value={form.targetSlots}
            onChange={(event) =>
              setForm((current) => ({ ...current, targetSlots: event.target.value }))
            }
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
          disabled={isSubmitting}
          className="rounded-xl border-2 border-slate-800 bg-yellow-300 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_0_#1f2937] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving..." : "Create season"}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm text-sub">
        <span>{isLoading ? "Syncing latest seasons..." : "Season data ready."}</span>
        <button
          type="button"
          onClick={() => void syncSeasons()}
          className="rounded-full border-2 border-slate-200 px-3 py-1 font-bold text-slate-700"
        >
          Refresh
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
          <h2 className="text-lg font-black text-slate-800">Active season</h2>
          {activeSeason ? (
            <button
              type="button"
              onClick={() => void handleEndSeason()}
              disabled={isSubmitting}
              className="rounded-full border-2 border-slate-800 bg-white px-3 py-1 text-xs font-black text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              End season
            </button>
          ) : null}
        </div>

        {activeSeason ? (
          <div className="space-y-1 text-sm text-slate-700">
            <div className="font-black text-slate-900">{activeSeason.goalName}</div>
            <div>Month: {activeSeason.monthKey}</div>
            <div>
              Target slots: {activeSeason.targetSlots} / Filled: {activeSeason.filledSlots}
            </div>
            <div>Status: {activeSeason.status}</div>
          </div>
        ) : (
          <p className="text-sm text-sub">No active season right now.</p>
        )}
      </div>

      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-black text-slate-800">Season history</h2>
        {historySeasons.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {historySeasons.map((season) => (
              <li key={season.id} className="rounded-xl border-2 border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-slate-900">{season.goalName}</span>
                  <span className="text-xs font-bold text-sub">{season.status}</span>
                </div>
                <div className="mt-1 text-xs text-sub">
                  <div>{season.monthKey}</div>
                  <div>
                    Target {season.targetSlots} | Filled {season.filledSlots}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-sub">No past seasons yet.</p>
        )}
      </div>
    </section>
  );
}
