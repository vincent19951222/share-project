"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type {
  TrainingPlanDaySnapshot,
  TrainingPlanSnapshot,
} from "@/lib/types";
import { TrainingSessionView } from "./TrainingSessionView";

interface TrainingPlanDetailDialogProps {
  plan: TrainingPlanSnapshot;
  open: boolean;
  onClose: () => void;
}

const STATUS_LABELS: Record<TrainingPlanDaySnapshot["status"], string> = {
  completed: "已完成",
  missed: "已错过",
  today: "今天",
  upcoming: "尚未开始",
};

function compactDate(dayKey: string) {
  const [, month, day] = dayKey.split("-").map(Number);
  return `${month}.${String(day).padStart(2, "0")}`;
}

function weekdayLabel(weekday: number) {
  return ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"][weekday];
}

function ReadOnlyDay({ day }: { day: TrainingPlanDaySnapshot }) {
  return (
    <article className={`training-plan-day training-plan-day-${day.status}`}>
      <div className="training-plan-day-date">
        <strong>{compactDate(day.dayKey)}</strong>
        <span>{weekdayLabel(day.weekday)}</span>
      </div>
      <div className="training-plan-day-copy">
        <h3>{day.title}</h3>
        <p>{day.estimatedMinutes} 分钟 · {day.exercises.length} 个动作</p>
      </div>
      <span className="training-plan-day-status">{STATUS_LABELS[day.status]}</span>
    </article>
  );
}

export function TrainingPlanDetailDialog({
  plan,
  open,
  onClose,
}: TrainingPlanDetailDialogProps) {
  const [selectedWeek, setSelectedWeek] = useState(plan.currentWeekIndex);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedWeek(plan.currentWeekIndex);
  }, [open, plan.currentWeekIndex]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose, open]);

  if (!open) return null;

  const weekDays = plan.days.filter((day) => day.weekIndex === selectedWeek);

  return createPortal(
    <div className="training-plan-dialog-layer">
      <button
        type="button"
        className="training-plan-dialog-backdrop"
        aria-label="关闭四周训练计划"
        disabled={busy}
        onClick={onClose}
      />
      <section
        className="training-plan-dialog training-plan-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-plan-detail-title"
      >
        <header className="training-plan-dialog-header">
          <div>
            <span>{compactDate(plan.startDayKey)} — {compactDate(plan.endDayKey)}</span>
            <h2 id="training-plan-detail-title">新手四周训练计划</h2>
          </div>
          <button type="button" className="training-plan-dialog-close" onClick={onClose} disabled={busy}>
            关闭
          </button>
        </header>

        <nav className="training-plan-week-tabs" aria-label="选择计划周">
          {[1, 2, 3, 4].map((week) => (
            <button
              key={week}
              type="button"
              aria-pressed={selectedWeek === week}
              onClick={() => setSelectedWeek(week)}
            >
              第 {week} 周
            </button>
          ))}
        </nav>

        <div className="training-plan-week-summary">
          <strong>第 {selectedWeek} 周</strong>
          <span>{weekDays.length} 次训练</span>
        </div>

        <div className="training-plan-days">
          {weekDays.length === 0 ? (
            <p className="training-plan-week-empty">这一周没有安排训练。</p>
          ) : (
            weekDays.map((day) =>
              day.status === "today" ? (
                <article key={day.id} className="training-plan-today-session">
                  <ReadOnlyDay day={day} />
                  <TrainingSessionView day={day} onBusyChange={setBusy} />
                </article>
              ) : (
                <ReadOnlyDay key={day.id} day={day} />
              ),
            )
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
