"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAvatarUrl } from "@/lib/avatars";
import type { ActivityEventDto } from "@/lib/activity-events";

type SyncState = "idle" | "syncing" | "error";

export function DrinkActivityFeed() {
  const streamRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<ActivityEventDto[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const fetchEvents = useCallback(async () => {
    setSyncState("syncing");

    try {
      const response = await fetch("/api/activity-events?kind=drink", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch drink activity events");
      }

      const body = (await response.json()) as { events?: ActivityEventDto[] };
      setEvents(body.events ?? []);
      setSyncState("idle");
    } catch {
      setSyncState("error");
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
    const timer = window.setInterval(() => {
      void fetchEvents();
    }, 5000);

    const handleRefresh = () => {
      void fetchEvents();
    };

    window.addEventListener("activity-events:refresh", handleRefresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("activity-events:refresh", handleRefresh);
    };
  }, [fetchEvents]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [events]);

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      ),
    [events],
  );

  return (
    <section className="rounded-[8px] border-4 border-slate-950 bg-white/90 p-4 shadow-[6px_6px_0_rgba(15,23,42,0.32)]">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm font-black">
        <span>水铺实时动态</span>
        <span className={syncState === "error" ? "text-orange-600" : "text-emerald-700"}>
          {syncState === "error" ? "同步失败" : syncState === "syncing" ? "同步中" : "已同步"}
        </span>
      </div>

      <div ref={streamRef} className="max-h-44 space-y-2 overflow-auto">
        {sortedEvents.length === 0 ? (
          <div className="rounded-[8px] border-2 border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-bold text-slate-500">
            今天还没有饮品动态
          </div>
        ) : null}

        {sortedEvents.map((event) => (
          <div key={event.id} className="flex items-start gap-2 text-xs font-bold text-slate-700">
            <time className="mt-1 shrink-0 font-mono text-[10px] text-slate-400">
              {new Date(event.createdAt).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </time>
            <img
              src={getAvatarUrl(event.user.avatarKey)}
              alt={event.user.name}
              className="h-6 w-6 shrink-0 rounded-full border border-slate-200 bg-slate-50 object-cover"
            />
            <span className="leading-relaxed">{event.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
