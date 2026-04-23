"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAvatarUrl } from "@/lib/avatars";
import { useBoard } from "@/lib/store";
import { Toast } from "@/components/ui/Toast";
import { SvgIcons } from "@/components/ui/SvgIcons";

interface ToastData {
  avatarKey: string;
  text: string;
}

interface ActivityEventDto {
  id: string;
  type: string;
  text: string;
  assetAwarded: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatarKey: string;
  };
}

type SyncState = "idle" | "syncing" | "error";

function getLogIcon(type: string) {
  switch (type) {
    case "success":
      return SvgIcons.msgSuccess;
    case "alert":
      return SvgIcons.msgAlert;
    case "highlight":
      return SvgIcons.msgHighlight;
    default:
      return SvgIcons.msgLog;
  }
}

function getLogColorClass(type: string) {
  switch (type) {
    case "success":
      return "text-main";
    case "alert":
      return "text-orange-500";
    case "highlight":
      return "rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-yellow-600 shadow-sm";
    default:
      return "text-sub";
  }
}

function formatTime(timestamp: Date) {
  return timestamp.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function ActivityStream() {
  const { state, dispatch } = useBoard();
  const streamRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<ActivityEventDto[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [pokedMembers, setPokedMembers] = useState<Set<string>>(new Set());
  const [toastData, setToastData] = useState<ToastData | null>(null);

  const fetchEvents = useCallback(async () => {
    setSyncState("syncing");

    try {
      const response = await fetch("/api/activity-events", { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Failed to fetch activity events");
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
  }, [events, state.logs]);

  useEffect(() => {
    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog?.type === "highlight" && state.logs.length > 2) {
      const memberMatch = lastLog.text.match(/<b>(\w+)<\/b>/);
      if (memberMatch) {
        const memberName = memberMatch[1];
        const member = state.members.find((item) => item.name === memberName);
        if (member) {
          setToastData({ avatarKey: member.avatarKey, text: `${member.name} 刚刚打卡了！` });
        }
      }
    }
  }, [state.logs, state.members]);

  const unpunchedMembers = state.members.filter(
    (_member, index) => index !== 0 && state.gridData[index][state.today - 1] === false,
  );

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (left, right) =>
          new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
      ),
    [events],
  );
  const hasActivity = sortedEvents.length > 0 || state.logs.length > 0;

  return (
    <footer className="soft-card relative flex h-[20vh] w-full shrink-0 flex-col overflow-hidden">
      <div className="flex justify-between rounded-t-[1.25rem] border-b-2 border-slate-100 bg-slate-50 px-6 py-2 text-[10px] font-bold tracking-wider text-sub">
        <span>活动动态（实时）</span>
        <span
          className={`flex items-center gap-1 ${
            syncState === "error" ? "text-orange-500" : "text-green-500"
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

      <div ref={streamRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 px-6 text-sm">
        {!hasActivity ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-sub">
            最近 24 小时还没有新动态
          </div>
        ) : null}

        {sortedEvents.map((event) => {
          const timestamp = new Date(event.createdAt);

          return (
            <div key={event.id} className="flex w-full items-start gap-2 text-main">
              <span className="mt-1 shrink-0 font-mono text-[10px] text-slate-300">
                [{formatTime(timestamp)}]
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

        {state.logs.map((log) => (
          <div key={log.id} className={`flex w-full items-start gap-2 ${getLogColorClass(log.type)}`}>
            <span className="mt-1 shrink-0 font-mono text-[10px] text-slate-300">
              [{formatTime(log.timestamp)}]
            </span>
            <span className="flex items-center pt-0.5" dangerouslySetInnerHTML={{ __html: getLogIcon(log.type) }} />
            <span className="flex-1 text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: log.text }} />
          </div>
        ))}

        {unpunchedMembers.length > 0 && (
          <div className="mt-2 flex w-full flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
            <div className="flex flex-wrap gap-2">
              {unpunchedMembers.map((member) => {
                const isPoked = pokedMembers.has(member.id);

                return (
                  <button
                    key={member.id}
                    className={`quest-btn flex items-center gap-1 px-3 py-1 text-[10px] tracking-wide ${
                      isPoked ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    onClick={() => {
                      if (isPoked) return;
                      setPokedMembers((current) => new Set(current).add(member.id));
                      dispatch({
                        type: "ADD_LOG",
                        log: {
                          id: `poke-${Date.now()}`,
                          text: `${SvgIcons.signal} <span class="align-middle">已向 ${member.name} 发送催促提示。</span>`,
                          type: "system",
                          timestamp: new Date(),
                        },
                      });
                    }}
                    disabled={isPoked}
                  >
                    <span dangerouslySetInnerHTML={{ __html: SvgIcons.poke }} />
                    <span>{isPoked ? "已催促" : "催促"}</span>
                    <b>{member.name}</b>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Toast data={toastData} />
    </footer>
  );
}
