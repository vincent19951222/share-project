"use client";

import { useState } from "react";
import {
  dispatchTeamDynamicsRefresh,
} from "@/lib/team-dynamics-refresh";
import type {
  TeamDynamicFilterType,
  TeamDynamicListItem,
  TeamDynamicListResponse,
} from "@/lib/team-dynamics";
import { TeamDynamicsFilters } from "./TeamDynamicsFilters";
import { TeamDynamicsTimeline } from "./TeamDynamicsTimeline";

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown };

    if (typeof body.error === "string" && body.error.trim() !== "") {
      return body.error;
    }
  } catch {
    // Keep the fallback when the server did not send a JSON error payload.
  }

  return fallback;
}

export function TeamDynamicsPage({
  initialItems,
  initialUnreadCount,
}: {
  initialItems: TeamDynamicListItem[];
  initialUnreadCount: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [activeType, setActiveType] = useState<TeamDynamicFilterType>("ALL");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function reload(nextUnreadOnly: boolean, nextType: TeamDynamicFilterType) {
    try {
      setErrorMessage(null);

      const query = new URLSearchParams({
        view: "page",
        ...(nextUnreadOnly ? { filter: "unread" } : {}),
        ...(nextType !== "ALL" ? { type: nextType } : {}),
      });

      const response = await fetch(`/api/team-dynamics?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        setErrorMessage(await readErrorMessage(response, "团队动态加载失败"));
        return false;
      }

      const body = (await response.json()) as TeamDynamicListResponse;
      setItems(body.items);
      setUnreadCount(body.unreadCount);
      return true;
    } catch {
      setErrorMessage("团队动态加载失败");
      return false;
    }
  }

  return (
    <section className="team-dynamics-page soft-card p-5">
      <div className="flex flex-col gap-4 border-b-2 border-slate-100 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-sub">TEAM DYNAMICS</p>
            <h1 className="mt-1 text-3xl font-black text-main">团队动态</h1>
            <p className="mt-2 text-sm font-bold text-sub">
              最近发生了什么，以及哪些内容值得团队回看。
            </p>
          </div>
          <button
            type="button"
            className="quest-btn px-4 py-2 text-sm"
            onClick={async () => {
              try {
                setErrorMessage(null);

                const response = await fetch("/api/team-dynamics/read", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mode: "all" }),
                });

                if (!response.ok) {
                  setErrorMessage(await readErrorMessage(response, "全部标为已读失败"));
                  return;
                }

                const reloaded = await reload(unreadOnly, activeType);

                if (reloaded) {
                  dispatchTeamDynamicsRefresh();
                }
              } catch {
                setErrorMessage("全部标为已读失败");
              }
            }}
          >
            全部标为已读
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="team-dynamic-stat">未读 {unreadCount} 条</span>
          <TeamDynamicsFilters
            unreadOnly={unreadOnly}
            activeType={activeType}
            onToggleUnread={async () => {
              const nextUnreadOnly = !unreadOnly;
              const reloaded = await reload(nextUnreadOnly, activeType);

              if (reloaded) {
                setUnreadOnly(nextUnreadOnly);
              }
            }}
            onTypeChange={async (nextType) => {
              const reloaded = await reload(unreadOnly, nextType);

              if (reloaded) {
                setActiveType(nextType);
              }
            }}
          />
        </div>

        {errorMessage ? (
          <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <TeamDynamicsTimeline items={items} mode="page" />
      </div>
    </section>
  );
}
