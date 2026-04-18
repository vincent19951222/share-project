"use client";

import { useRef, useEffect } from "react";
import { useBoard } from "@/lib/store";
import { PunchPopup } from "@/components/ui/PunchPopup";
import { getAvatarUrl } from "@/lib/avatars";

export function HeatmapGrid() {
  const { state, dispatch } = useBoard();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentUserIndex = state.members.findIndex((m) => m.id === state.currentUserId);

  useEffect(() => {
    if (containerRef.current) {
      const offset = (state.today - 2) * 60;
      containerRef.current.scrollLeft = offset;
    }
  }, [state.today]);

  return (
    <main className="flex-1 w-full soft-card flex relative overflow-hidden">
      <div className="w-28 border-r-2 border-slate-100 flex flex-col bg-white z-10 shrink-0 rounded-l-[1.25rem]">
        <div className="h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-center font-bold text-xs text-sub rounded-tl-[1.25rem]">
          MEMBERS
        </div>
        <div className="flex-1 flex flex-col py-2 justify-between items-center">
          {state.members.map((m, idx) => {
            const isMe = idx === currentUserIndex;
            return (
              <div key={m.id} className="flex flex-col items-center gap-1 relative">
                <div
                  className={`h-10 w-10 flex items-center justify-center rounded-full shadow-sm border overflow-hidden bg-slate-50 ${
                    isMe ? "border-2 border-slate-800 ring-2 ring-yellow-300" : "border-slate-200"
                  } relative`}
                >
                  <img src={getAvatarUrl(m.avatarKey)} alt={m.name} className="w-full h-full object-cover" />
                  {isMe && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border border-white rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-bold text-sub truncate max-w-[4rem] text-center">{m.name}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar relative flex flex-col scroll-smooth">
        <div className="h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center px-4 gap-3 shrink-0 w-max sticky top-0 z-0">
          {Array.from({ length: state.totalDays }, (_, i) => {
            const day = i + 1;
            const isToday = day === state.today;
            return (
              <div
                key={day}
                className={`w-12 flex justify-center items-center text-xs font-bold rounded-full h-6 ${
                  isToday
                    ? "bg-yellow-300 text-slate-900 border-2 border-slate-800 shadow-[0_2px_0_0_rgba(31,41,55,1)]"
                    : "text-slate-400"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
        <div className="flex-1 py-2 px-4 w-max relative">
          <div className="flex flex-col justify-between h-full relative z-10">
            {state.members.map((member, rIndex) => (
              <div key={member.id} className="flex gap-3 h-12 items-center">
                {Array.from({ length: state.totalDays }, (_, i) => {
                  const day = i + 1;
                  const status = state.gridData[rIndex][i];
                  const isMe = rIndex === currentUserIndex;

                  if (day < state.today) {
                    return (
                      <div key={day} className={`cell ${status ? "cell-punched" : "cell-missed"}`}>
                        {status ? "✓" : ""}
                      </div>
                    );
                  } else if (day === state.today) {
                    if (status) {
                      return (
                        <div key={day} className="cell cell-punched">✓</div>
                      );
                    } else if (isMe) {
                      return (
                        <PunchPopup
                          key={day}
                          onSelect={(punchType) => {
                            dispatch({
                              type: "PUNCH",
                              memberIndex: rIndex,
                              dayIndex: i,
                              punchType,
                            });
                          }}
                        />
                      );
                    } else {
                      return (
                        <div key={day} className="cell cell-future opacity-50" />
                      );
                    }
                  } else {
                    return (
                      <div key={day} className="cell cell-future" />
                    );
                  }
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
