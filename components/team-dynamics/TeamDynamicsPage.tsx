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

export function TeamDynamicsPage({
  initialItems,
  initialUnreadCount,
  initialNextCursor,
}: {
  initialItems: TeamDynamicListItem[];
  initialUnreadCount: number;
  initialNextCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [activeType, setActiveType] = useState<TeamDynamicFilterType>("ALL");
  const [_nextCursor] = useState(initialNextCursor);

  async function reload(nextUnreadOnly: boolean, nextType: TeamDynamicFilterType) {
    const query = new URLSearchParams({
      view: "page",
      ...(nextUnreadOnly ? { filter: "unread" } : {}),
      ...(nextType !== "ALL" ? { type: nextType } : {}),
    });

    const response = await fetch(`/api/team-dynamics?${query.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return;
    }

    const body = (await response.json()) as TeamDynamicListResponse;
    setItems(body.items);
    setUnreadCount(body.unreadCount);
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
              const response = await fetch("/api/team-dynamics/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "all" }),
              });

              if (!response.ok) {
                return;
              }

              await reload(unreadOnly, activeType);
              dispatchTeamDynamicsRefresh();
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
              setUnreadOnly(nextUnreadOnly);
              await reload(nextUnreadOnly, activeType);
            }}
            onTypeChange={async (nextType) => {
              setActiveType(nextType);
              await reload(unreadOnly, nextType);
            }}
          />
        </div>
      </div>

      <div className="mt-5">
        <TeamDynamicsTimeline items={items} mode="page" />
      </div>
    </section>
  );
}
