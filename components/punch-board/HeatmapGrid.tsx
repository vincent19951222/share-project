"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { reservePunchEpoch, useBoard } from "@/lib/store";
import {
  deleteTodayPunch,
  submitAdminMakeupPunch,
  submitTodayPunch,
  submitYesterdayMakeupPunch,
  updateTodayWorkout,
} from "@/lib/api";
import { dispatchCalendarRefresh } from "@/lib/calendar-refresh";
import { PunchPopup } from "@/components/ui/PunchPopup";
import { getAvatarUrl } from "@/lib/avatars";
import type { WorkoutTicketPayload } from "@/lib/workouts";

type PunchActionErrors = {
  punch?: string | null;
  edit?: string | null;
  undo?: string | null;
  makeup?: string | null;
  adminMakeup?: string | null;
};

function getCurrentShanghaiMonthKey() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? String(now.getFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? "01";

  return `${year}-${month}`;
}

function buildDayKey(monthKey: string | undefined, day: number) {
  return `${monthKey ?? getCurrentShanghaiMonthKey()}-${String(day).padStart(2, "0")}`;
}

export function HeatmapGrid() {
  const { state, dispatch } = useBoard();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<PunchActionErrors>({});
  const submittingRef = useRef(false);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const currentUserIndex = state.members.findIndex((member) => member.id === state.currentUserId);
  const desktopHeatmapStyle = {
    "--heatmap-desktop-body-height": `${state.members.length * 3.75}rem`,
  } as CSSProperties;

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

  async function handlePunchConfirm(payload?: WorkoutTicketPayload) {
    if (submittingRef.current) {
      return false;
    }

    if (!payload) {
      setErrors((current) => ({ ...current, punch: "训练小票信息缺失" }));
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors((current) => ({ ...current, punch: null }));
    const punchEpoch = reservePunchEpoch();
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });

    try {
      const snapshot = await submitTodayPunch(payload);

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
      setErrors((current) => ({ ...current, punch: message }));
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
      submittingRef.current = false;
    }
  }

  async function handleWorkoutUpdate(payload?: WorkoutTicketPayload) {
    if (submittingRef.current) {
      return false;
    }

    if (!payload) {
      setErrors((current) => ({ ...current, edit: "训练小票信息缺失" }));
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors((current) => ({ ...current, edit: null }));
    const punchEpoch = reservePunchEpoch();
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });

    try {
      const snapshot = await updateTodayWorkout(payload);

      dispatch({
        type: "SYNC_REMOTE_STATE",
        snapshot,
        source: "punch",
        punchEpoch,
      });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `workout-update-${Date.now()}`,
          text: "<b>你</b> 已更新今日训练小票，服务器状态已同步。",
          type: "highlight",
          timestamp: new Date(),
        },
      });
      window.dispatchEvent(new Event("activity-events:refresh"));
      dispatchCalendarRefresh();
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "保存失败";
      setErrors((current) => ({ ...current, edit: message }));
      dispatch({ type: "END_PUNCH_SYNC", punchEpoch });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `workout-update-error-${Date.now()}`,
          text: `保存训练小票失败：${message}`,
          type: "alert",
          timestamp: new Date(),
        },
      });
      return false;
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  async function handlePunchUndo() {
    if (submittingRef.current) {
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors((current) => ({ ...current, undo: null }));
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
      setErrors((current) => ({ ...current, undo: message }));
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
      submittingRef.current = false;
    }
  }

  async function handleMakeupYesterday() {
    if (submittingRef.current) {
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors((current) => ({ ...current, makeup: null }));
    const punchEpoch = reservePunchEpoch();
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });

    try {
      const snapshot = await submitYesterdayMakeupPunch();

      dispatch({
        type: "SYNC_REMOTE_STATE",
        snapshot,
        source: "punch",
        punchEpoch,
      });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `makeup-punch-${Date.now()}`,
          text: "<b>你</b> 已补签昨天健身打卡，服务器状态已同步。",
          type: "success",
          timestamp: new Date(),
        },
      });
      window.dispatchEvent(new Event("activity-events:refresh"));
      dispatchCalendarRefresh();
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "补签失败";
      setErrors((current) => ({ ...current, makeup: message }));
      dispatch({ type: "END_PUNCH_SYNC", punchEpoch });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `makeup-punch-error-${Date.now()}`,
          text: `补签失败：${message}`,
          type: "alert",
          timestamp: new Date(),
        },
      });
      return false;
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  async function handleAdminMakeup(targetUserId: string, targetName: string, dayKey: string) {
    if (submittingRef.current) {
      return false;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setErrors((current) => ({ ...current, adminMakeup: null }));
    const punchEpoch = reservePunchEpoch();
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });

    try {
      const snapshot = await submitAdminMakeupPunch({ targetUserId, dayKey });

      dispatch({
        type: "SYNC_REMOTE_STATE",
        snapshot,
        source: "punch",
        punchEpoch,
      });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `admin-makeup-punch-${Date.now()}`,
          text: `已给 <b>${targetName}</b> 补 ${dayKey} 的健身打卡，固定 +10 银子。`,
          type: "success",
          timestamp: new Date(),
        },
      });
      window.dispatchEvent(new Event("activity-events:refresh"));
      dispatchCalendarRefresh();
      return true;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "补卡失败";
      setErrors((current) => ({ ...current, adminMakeup: message }));
      dispatch({ type: "END_PUNCH_SYNC", punchEpoch });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `admin-makeup-punch-error-${Date.now()}`,
          text: `补卡失败：${message}`,
          type: "alert",
          timestamp: new Date(),
        },
      });
      return false;
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  }

  function renderPunchCell(rowIndex: number, index: number) {
    const day = index + 1;
    const status = state.gridData[rowIndex][index];
    const member = state.members[rowIndex];
    const isCurrentUser = rowIndex === currentUserIndex;
    const isAdmin = state.currentUser?.isAdmin === true;
    const dayKey = buildDayKey(state.monthKey, day);
    const cellClassName = [
      "cell",
      "heatmap-cell-day",
      day === state.today ? "heatmap-cell-today" : "",
    ].filter(Boolean).join(" ");

    if (day < state.today) {
      const isYesterday = day === state.today - 1;

      if (status === false && isAdmin && member) {
        return (
          <PunchPopup
            key={day}
            busy={submitting}
            error={errors.adminMakeup ?? null}
            onConfirm={() => handleAdminMakeup(member.id, member.name, dayKey)}
            triggerContent="补"
            triggerClassName={`${cellClassName} cell-missed cursor-pointer text-xs font-black text-slate-800 disabled:opacity-50`}
            title="管理员补卡"
            description={`给 ${member.name} 补 ${dayKey} 的健身打卡吗？`}
            helperText="固定补发 +10 银子，不补健身券、EXP、boost 或连签阶梯奖励。"
            confirmLabel="确认补卡"
            busyLabel="补卡中..."
          />
        );
      }

      if (isYesterday && status === false && isCurrentUser) {
        return (
          <PunchPopup
            key={day}
            busy={submitting}
            error={errors.makeup ?? null}
            onConfirm={handleMakeupYesterday}
            triggerContent="补"
            triggerClassName={`${cellClassName} cell-missed cursor-pointer text-xs font-black text-slate-800 disabled:opacity-50`}
            title="补昨天打卡"
            description="确认补签昨天的健身打卡吗？"
            helperText="补签会补发银子，并修正连续打卡和赛季进度。"
            confirmLabel="确认补签"
            busyLabel="补签中..."
          />
        );
      }

      return (
        <div
          key={day}
          data-day={day}
          className={`${cellClassName} ${status ? "cell-punched" : "cell-missed"}`}
        >
          {status ? "✓" : ""}
        </div>
      );
    }

    if (day === state.today && !status && isCurrentUser) {
      return (
        <PunchPopup
          key={day}
          variant="fitness-ticket"
          busy={submitting}
          error={errors.punch ?? null}
          onConfirm={handlePunchConfirm}
          triggerClassName={`${cellClassName} my-punch-btn text-xl cursor-pointer disabled:opacity-50`}
          helperText="确认后会记为今日健身打卡，并获得 1 张健身券。"
        />
      );
    }

    if (day === state.today && status && isCurrentUser) {
      return (
        <PunchPopup
          key={day}
          variant="fitness-ticket"
          busy={submitting}
          error={errors.edit ?? errors.undo ?? null}
          onConfirm={handleWorkoutUpdate}
          onDangerAction={handlePunchUndo}
          dangerLabel="撤销打卡"
          dangerBusyLabel="撤销中..."
          triggerContent="✓"
          triggerClassName={`${cellClassName} cell-punched cursor-pointer disabled:opacity-50`}
          initialWorkoutPayload={state.currentUserTodayWorkout ?? null}
          helperText="保存后只更新今天的训练明细，不重复发健身券。"
          confirmLabel="保存修改"
          busyLabel="保存中..."
        />
      );
    }

    if (day === state.today && status) {
      return <div key={day} data-day={day} className={`${cellClassName} cell-punched`}>✓</div>;
    }

    return <div key={day} data-day={day} className={`${cellClassName} cell-future opacity-50`} />;
  }

  return (
    <>
      <main
        className="heatmap-shell heatmap-training-panel heatmap-desktop-shell flex-1 w-full soft-card flex relative overflow-hidden"
        style={desktopHeatmapStyle}
      >
        <div className="heatmap-members-column heatmap-member-rail w-28 border-r-2 border-slate-100 flex flex-col bg-white z-10 shrink-0 rounded-l-[1.25rem]">
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
          <div className="heatmap-days-header heatmap-day-ruler h-10 border-b-2 border-slate-100 bg-slate-50 flex items-center px-4 gap-3 shrink-0 w-max sticky top-0 z-0">
            {Array.from({ length: state.totalDays }, (_, index) => {
              const day = index + 1;
              const isToday = day === state.today;

              return (
                <div
                  key={day}
                  className={`heatmap-day-label ${isToday ? "heatmap-day-today" : ""} w-12 flex justify-center items-center text-xs font-bold rounded-full h-6 ${
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
          <div className="heatmap-grid-body heatmap-grid-track flex-1 py-2 px-4 w-max relative">
            <div className="heatmap-grid-rows flex flex-col justify-between h-full relative z-10">
              {state.members.map((member, rowIndex) => (
                <div key={member.id} className="heatmap-grid-row flex gap-3 h-12 items-center">
                  {Array.from({ length: state.totalDays }, (_, index) => renderPunchCell(rowIndex, index))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <main className="heatmap-mobile-shell heatmap-training-panel flex-1 w-full soft-card relative overflow-hidden">
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
                    className={`heatmap-mobile-day ${isToday ? "heatmap-day-today" : ""} flex items-center justify-center text-xs font-bold rounded-full ${
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
