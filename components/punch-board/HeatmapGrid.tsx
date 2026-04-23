"use client";

import { useEffect, useRef, useState } from "react";
import { reservePunchEpoch, useBoard } from "@/lib/store";
import { deleteTodayPunch, submitTodayPunch } from "@/lib/api";
import { PunchPopup } from "@/components/ui/PunchPopup";
import { getAvatarUrl } from "@/lib/avatars";

export function HeatmapGrid() {
  const { state, dispatch } = useBoard();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentUserIndex = state.members.findIndex((member) => member.id === state.currentUserId);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = (state.today - 2) * 60;
    }
  }, [state.today]);

  async function handlePunchConfirm() {
    setSubmitting(true);
    setError(null);
    const punchEpoch = reservePunchEpoch();
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });

    try {
      const snapshot = await submitTodayPunch();

      dispatch({
        type: "SYNC_REMOTE_STATE",
        snapshot,
        source: "punch",
        punchEpoch,
      });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `punch-${Date.now()}`,
          text: "<b>你</b> 已完成今日健身打卡，服务器状态已同步。",
          type: "success",
          timestamp: new Date(),
        },
      });
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "打卡失败";
      setError(message);
      dispatch({ type: "END_PUNCH_SYNC", punchEpoch });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `punch-error-${Date.now()}`,
          text: `打卡失败：${message}`,
          type: "alert",
          timestamp: new Date(),
        },
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePunchUndo() {
    setSubmitting(true);
    setError(null);
    const punchEpoch = reservePunchEpoch();
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });

    try {
      const snapshot = await deleteTodayPunch();

      dispatch({
        type: "SYNC_REMOTE_STATE",
        snapshot,
        source: "punch",
        punchEpoch,
      });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `undo-punch-${Date.now()}`,
          text: "<b>你</b> 已撤销今日健身打卡，服务器状态已同步。",
          type: "highlight",
          timestamp: new Date(),
        },
      });
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "撤销失败";
      setError(message);
      dispatch({ type: "END_PUNCH_SYNC", punchEpoch });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `undo-punch-error-${Date.now()}`,
          text: `撤销失败：${message}`,
          type: "alert",
          timestamp: new Date(),
        },
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 w-full soft-card flex relative overflow-hidden">
      <div className="w-28 border-r-2 border-slate-100 flex flex-col bg-white z-10 shrink-0 rounded-l-[1.25rem]">
        <div className="h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-center font-bold text-xs text-sub rounded-tl-[1.25rem]">
          MEMBERS
        </div>
        <div className="flex-1 flex flex-col py-2 justify-between items-center">
          {state.members.map((member, index) => (
            <div key={member.id} className="flex flex-col items-center gap-1 relative">
              <div
                className={`h-10 w-10 flex items-center justify-center rounded-full shadow-sm border overflow-hidden bg-slate-50 ${
                  index === currentUserIndex ? "border-2 border-slate-800 ring-2 ring-yellow-300" : "border-slate-200"
                } relative`}
              >
                <img src={getAvatarUrl(member.avatarKey)} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-[10px] font-bold text-sub truncate max-w-[4rem] text-center">{member.name}</span>
            </div>
          ))}
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-x-auto no-scrollbar relative flex flex-col scroll-smooth">
        <div className="h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center px-4 gap-3 shrink-0 w-max sticky top-0 z-0">
          {Array.from({ length: state.totalDays }, (_, index) => {
            const day = index + 1;
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
            {state.members.map((member, rowIndex) => (
              <div key={member.id} className="flex gap-3 h-12 items-center">
                {Array.from({ length: state.totalDays }, (_, index) => {
                  const day = index + 1;
                  const status = state.gridData[rowIndex][index];
                  const isCurrentUser = rowIndex === currentUserIndex;

                  if (day < state.today) {
                    return <div key={day} className={`cell ${status ? "cell-punched" : "cell-missed"}`}>{status ? "✓" : ""}</div>;
                  }

                  if (day === state.today && !status && isCurrentUser) {
                    return (
                      <PunchPopup
                        key={day}
                        busy={submitting}
                        error={error}
                        onConfirm={handlePunchConfirm}
                      />
                    );
                  }

                  if (day === state.today && status && isCurrentUser) {
                    return (
                      <PunchPopup
                        key={day}
                        busy={submitting}
                        error={error}
                        onConfirm={handlePunchUndo}
                        triggerContent="✓"
                        triggerClassName="cell cell-punched cursor-pointer disabled:opacity-50"
                        title="撤销今天打卡"
                        description="确认撤销今天的打卡吗？"
                        helperText="撤销后会回滚今天获得的银子、连签和赛季进度。"
                        confirmLabel="确认撤销"
                        busyLabel="撤销中..."
                      />
                    );
                  }

                  if (day === state.today && status) {
                    return <div key={day} className="cell cell-punched">✓</div>;
                  }

                  return <div key={day} className="cell cell-future opacity-50" />;
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
