"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAvatarUrl } from "@/lib/avatars";
import type { ActivityEventDto } from "@/lib/activity-events";

type SyncState = "idle" | "syncing" | "error";

export function CoffeeActivityFeed() {
  const streamRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<ActivityEventDto[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const fetchEvents = useCallback(async () => {
    setSyncState("syncing");

    try {
      const response = await fetch("/api/activity-events?kind=coffee", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch coffee activity events");
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
    <section aria-label="咖啡实时动态" className="coffee-activity-ticket">
      <div className="coffee-activity-header">
        <span>实时动态</span>
        <span
          className={`flex items-center gap-1 ${
            syncState === "error" ? "text-orange-500" : "text-green-600"
          }`}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              syncState === "error" ? "bg-orange-500" : "animate-pulse bg-green-500"
            }`}
          />
          {syncState === "error" ? "同步失败" : syncState === "syncing" ? "同步中" : "已同步"}
        </span>
      </div>

      <div ref={streamRef} className="coffee-activity-list">
        {sortedEvents.length === 0 ? (
          <div className="coffee-activity-empty">
            今天还没有咖啡打卡
          </div>
        ) : null}

        {sortedEvents.map((event) => {
          const timestamp = new Date(event.createdAt).toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          return (
            <div key={event.id} className="coffee-activity-row text-main">
              <span className="mt-1 shrink-0 font-mono text-[10px] text-slate-300">
                [{timestamp}]
              </span>
              <img
                src={getAvatarUrl(event.user.avatarKey)}
                alt={event.user.name}
                className="h-6 w-6 shrink-0 rounded-full border border-slate-200 bg-slate-50 object-cover"
              />
              <span className="flex-1 text-xs font-bold leading-relaxed text-slate-700">
                {event.text}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
