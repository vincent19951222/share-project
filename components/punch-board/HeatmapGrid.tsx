"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { reservePunchEpoch, useBoard } from "@/lib/store";
import { deleteTodayPunch, submitTodayPunch } from "@/lib/api";
import { dispatchCalendarRefresh } from "@/lib/calendar-refresh";
import { PunchPopup } from "@/components/ui/PunchPopup";
import { getAvatarUrl } from "@/lib/avatars";

export function HeatmapGrid() {
  const { state, dispatch } = useBoard();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const currentUserIndex = state.members.findIndex((member) => member.id === state.currentUserId);

  useLayoutEffect(() => {
    const scrollLeft = (state.today - 2) * 60;
    if (desktopScrollRef.current) {
      desktopScrollRef.current.scrollLeft = scrollLeft;
    }
    if (mobileScrollRef.current) {
      const scrollPane = mobileScrollRef.current;

      const alignWithMobileFormula = () => {
        const rootFontSize = Number.parseFloat(
          window.getComputedStyle(document.documentElement).fontSize,
        ) || 16;
        const memberWidth = 5.3 * rootFontSize;
        const cellWidth = 2.1 * rootFontSize;
        const columnGap = 0.45 * rootFontSize;
        const visibleGridWidth = (scrollPane.clientWidth || window.innerWidth) - memberWidth;

        scrollPane.scrollLeft = Math.max(
          0,
          (state.today - 1) * (cellWidth + columnGap) -
            visibleGridWidth / 2 +
            cellWidth / 2,
        );
      };

      const alignWithMeasuredColumn = () => {
        const todayColumn = scrollPane.querySelector<HTMLElement>(
          `.heatmap-mobile-day[data-day="${state.today}"]`,
        );
        const stickyWidth =
          scrollPane.querySelector<HTMLElement>(".heatmap-mobile-member-head")?.offsetWidth ?? 0;

        if (!todayColumn || todayColumn.offsetWidth <= 0 || stickyWidth <= 0) {
          alignWithMobileFormula();
          return;
        }

        const visibleGridWidth = scrollPane.clientWidth - stickyWidth;
        scrollPane.scrollLeft = Math.max(
          0,
          todayColumn.offsetLeft -
            stickyWidth -
            visibleGridWidth / 2 +
            todayColumn.offsetWidth / 2,
        );
      };

      alignWithMobileFormula();
      const frameId = window.requestAnimationFrame(alignWithMeasuredColumn);
      return () => window.cancelAnimationFrame(frameId);
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
          text: "<b>你</b> 已完成今日健身打卡，健身券 +1，服务器状态已同步。",
          type: "success",
          timestamp: new Date(),
        },
      });
      window.dispatchEvent(new Event("activity-events:refresh"));
      dispatchCalendarRefresh();
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
      window.dispatchEvent(new Event("activity-events:refresh"));
      dispatchCalendarRefresh();
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

  function renderPunchCell(rowIndex: number, index: number) {
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
          helperText="确认后会记为今日健身打卡，并获得 1 张健身券。"
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
          helperText="撤销后会回滚今天获得的银子、连签、赛季进度和未使用的健身券。"
          confirmLabel="确认撤销"
          busyLabel="撤销中..."
        />
      );
    }

    if (day === state.today && status) {
      return <div key={day} className="cell cell-punched">✓</div>;
    }

    return <div key={day} className="cell cell-future opacity-50" />;
  }

  return (
    <>
      <main className="heatmap-shell heatmap-desktop-shell flex-1 w-full soft-card flex relative overflow-hidden">
        <div className="heatmap-members-column w-28 border-r-2 border-slate-100 flex flex-col bg-white z-10 shrink-0 rounded-l-[1.25rem]">
          <div className="heatmap-members-heading h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center justify-center font-bold text-xs text-sub rounded-tl-[1.25rem]">
            MEMBERS
          </div>
          <div className="heatmap-members-list flex-1 flex flex-col py-2 justify-between items-center">
            {state.members.map((member, index) => (
              <div key={member.id} className="heatmap-member-item flex flex-col items-center gap-1 relative">
                <div
                  className={`heatmap-member-avatar h-10 w-10 flex items-center justify-center rounded-full shadow-sm border overflow-hidden bg-slate-50 ${
                    index === currentUserIndex ? "border-2 border-slate-800 ring-2 ring-yellow-300" : "border-slate-200"
                  } relative`}
                >
                  <img src={getAvatarUrl(member.avatarKey)} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <span className="heatmap-member-name text-[10px] font-bold text-sub truncate max-w-[4rem] text-center">
                  {member.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          ref={desktopScrollRef}
          className="heatmap-scroll-pane flex-1 overflow-x-auto no-scrollbar relative flex flex-col scroll-smooth"
        >
          <div className="heatmap-days-header h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center px-4 gap-3 shrink-0 w-max sticky top-0 z-0">
            {Array.from({ length: state.totalDays }, (_, index) => {
              const day = index + 1;
              const isToday = day === state.today;

              return (
                <div
                  key={day}
                  className={`heatmap-day-label w-12 flex justify-center items-center text-xs font-bold rounded-full h-6 ${
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
          <div className="heatmap-grid-body flex-1 py-2 px-4 w-max relative">
            <div className="flex flex-col justify-between h-full relative z-10">
              {state.members.map((member, rowIndex) => (
                <div key={member.id} className="heatmap-grid-row flex gap-3 h-12 items-center">
                  {Array.from({ length: state.totalDays }, (_, index) => renderPunchCell(rowIndex, index))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <main className="heatmap-mobile-shell flex-1 w-full soft-card relative overflow-hidden">
        <div ref={mobileScrollRef} className="heatmap-mobile-scroll no-scrollbar overflow-auto scroll-smooth">
          <div className="heatmap-mobile-table w-max">
            <div className="heatmap-mobile-header flex items-center">
              <div className="heatmap-mobile-member-head sticky left-0 z-20 flex items-center justify-center border-r-2 border-slate-100 bg-slate-50 font-bold text-sub">
                MEMBERS
              </div>
              {Array.from({ length: state.totalDays }, (_, index) => {
                const day = index + 1;
                const isToday = day === state.today;

                return (
                  <div
                    key={day}
                    data-day={day}
                    className={`heatmap-mobile-day flex items-center justify-center text-xs font-bold rounded-full ${
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
            {state.members.map((member, rowIndex) => (
              <div key={member.id} className="heatmap-mobile-row flex items-center">
                <div className="heatmap-mobile-member sticky left-0 z-10 flex items-center gap-2 bg-white border-r-2 border-slate-100">
                  <div
                    className={`heatmap-mobile-avatar flex items-center justify-center rounded-full shadow-sm border overflow-hidden bg-slate-50 ${
                      rowIndex === currentUserIndex ? "border-2 border-slate-800 ring-2 ring-yellow-300" : "border-slate-200"
                    } relative`}
                  >
                    <img src={getAvatarUrl(member.avatarKey)} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                  <span className="heatmap-mobile-name min-w-0 truncate font-bold text-sub">{member.name}</span>
                </div>
                {Array.from({ length: state.totalDays }, (_, index) => renderPunchCell(rowIndex, index))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
