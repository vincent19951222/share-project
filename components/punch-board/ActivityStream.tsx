"use client";

import { useEffect, useRef, useState } from "react";
import { useBoard } from "@/lib/store";
import { QuestBtn } from "@/components/ui/QuestBtn";
import { Toast } from "@/components/ui/Toast";
import { SvgIcons } from "@/components/ui/SvgIcons";

function getLogIcon(type: string) {
  switch (type) {
    case "success": return SvgIcons.msgSuccess;
    case "alert": return SvgIcons.msgAlert;
    case "highlight": return SvgIcons.msgHighlight;
    default: return SvgIcons.msgLog;
  }
}

function getLogColorClass(type: string) {
  switch (type) {
    case "success": return "text-main";
    case "alert": return "text-orange-500";
    case "highlight": return "text-yellow-600 bg-yellow-50 p-2 rounded-lg border border-yellow-200 shadow-sm";
    default: return "text-sub";
  }
}

interface ToastData {
  avatarSvg: string;
  text: string;
}

export function ActivityStream() {
  const { state, dispatch } = useBoard();
  const streamRef = useRef<HTMLDivElement>(null);
  const [pokedMembers, setPokedMembers] = useState<Set<string>>(new Set());
  const [toastData, setToastData] = useState<ToastData | null>(null);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [state.logs]);

  useEffect(() => {
    const lastLog = state.logs[state.logs.length - 1];
    if (lastLog?.type === "highlight" && state.logs.length > 2) {
      const memberMatch = lastLog.text.match(/<b>(\w+)<\/b>/);
      if (memberMatch) {
        const memberName = memberMatch[1];
        const member = state.members.find((m) => m.name === memberName);
        if (member) {
          setToastData({ avatarSvg: member.avatarSvg, text: `${member.name} 刚刚打卡了！` });
        }
      }
    }
  }, [state.logs.length, state.members]);

  const unpunchedMembers = state.members.filter(
    (m, idx) => idx !== 0 && state.gridData[idx][state.today - 1] === false
  );

  return (
    <footer className="h-[20vh] w-full soft-card flex flex-col shrink-0 overflow-hidden relative">
      <div className="bg-slate-50 text-sub text-[10px] px-6 py-2 font-bold border-b-2 border-slate-100 flex justify-between rounded-t-[1.25rem] tracking-wider">
        <span>ACTIVITY STREAM (LIVE)</span>
        <span className="text-green-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" /> SYNCING
        </span>
      </div>
      <div ref={streamRef} className="flex-1 p-3 px-6 text-sm overflow-y-auto flex flex-col gap-2">
        {state.logs.map((log) => {
          const timeStr = log.timestamp.toLocaleTimeString("zh-CN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          return (
            <div key={log.id} className={`w-full flex items-start gap-2 ${getLogColorClass(log.type)}`}>
              <span className="text-slate-300 font-mono text-[10px] mt-1 shrink-0">[{timeStr}]</span>
              <span className="flex items-center pt-0.5" dangerouslySetInnerHTML={{ __html: getLogIcon(log.type) }} />
              <span className="text-xs leading-relaxed flex-1" dangerouslySetInnerHTML={{ __html: log.text }} />
            </div>
          );
        })}
        {unpunchedMembers.length > 0 && (
          <div className="w-full flex flex-col gap-2 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div className="flex gap-2 flex-wrap">
              {unpunchedMembers.map((m) => {
                const isPoked = pokedMembers.has(m.id);
                return (
                  <button
                    key={m.id}
                    className={`quest-btn px-3 py-1 text-[10px] tracking-wide flex items-center gap-1 ${isPoked ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (isPoked) return;
                      setPokedMembers((prev) => new Set(prev).add(m.id));
                      dispatch({
                        type: "ADD_LOG",
                        log: {
                          id: `poke-${Date.now()}`,
                          text: `${SvgIcons.signal} <span class="align-middle">已向 ${m.name} 发送催促提示。</span>`,
                          type: "system",
                          timestamp: new Date(),
                        },
                      });
                    }}
                    disabled={isPoked}
                  >
                    <span dangerouslySetInnerHTML={{ __html: SvgIcons.poke }} />
                    <span>{isPoked ? "✓ Poked" : "Poke"}</span>
                    <b>{m.name}</b>
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
