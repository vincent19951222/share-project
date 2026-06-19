"use client";

import { useEffect, useRef, useState } from "react";
import type { DashboardDayRecord, DashboardMonthSnapshot } from "@/lib/types";
import {
  buildDashboardCalendarGrid,
  formatDashboardMonthLabel,
  type DashboardCalendarGridCell,
} from "./dashboard-data";
import { DayTooltip } from "./DayTooltip";

interface MonthCalendarProps {
  snapshot: DashboardMonthSnapshot;
}

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function DashboardCalendarDayCell({
  cell,
  monthKey,
  activeDay,
  onActivate,
  onDeactivate,
}: {
  cell: DashboardCalendarGridCell;
  monthKey: string;
  activeDay: DashboardDayRecord | null;
  onActivate: (day: DashboardDayRecord) => void;
  onDeactivate: () => void;
}) {
  const cellRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  if (cell.kind === "neighbor") {
    return (
      <div
        className={`calendar-neighbor-cell calendar-neighbor-cell-${cell.monthRelation}`}
        aria-hidden="true"
      >
        {cell.day}
      </div>
    );
  }

  const totalDrinkCups = cell.drinkCups;
  const hasActivity = cell.workedOut || totalDrinkCups > 0;
  const isActive = activeDay?.day === cell.day;
  const showTooltip = isHovered || isActive;

  return (
    <button
      ref={cellRef}
      type="button"
      className={`calendar-day-cell ${cell.isToday ? "calendar-day-cell-today" : ""} ${
        hasActivity ? "calendar-day-cell-active" : "calendar-day-cell-empty"
      }`}
      onMouseEnter={() => {
        setIsHovered(true);
        onActivate(cell);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onDeactivate();
      }}
      onClick={() => {
        if (isActive) {
          onDeactivate();
        } else {
          onActivate(cell);
        }
      }}
      aria-label={`${cell.day}日${cell.workedOut ? "，已训练" : ""}${totalDrinkCups > 0 ? `，喝水${totalDrinkCups}杯` : ""}`}
    >
      <div className="calendar-day-top">
        <span className="calendar-day-number">{cell.day}</span>
        {cell.workedOut ? <span className="calendar-workout-chip">练</span> : null}
      </div>

      {cell.workedOut ? (
        <div className="dashboard-calendar-workout-detail">
          <span className="dashboard-calendar-duration">{cell.workoutMinutes}′</span>
        </div>
      ) : null}

      {totalDrinkCups > 0 ? (
        <div className="dashboard-calendar-workout-detail">
          <span className="dashboard-calendar-drink-dot" aria-hidden="true" />
          {totalDrinkCups > 1 ? <span className="dashboard-calendar-drink-count">{totalDrinkCups}</span> : null}
        </div>
      ) : null}

      {!hasActivity ? <span className="calendar-empty-mark" aria-hidden="true" /> : null}

      {showTooltip ? <DayTooltip monthKey={monthKey} day={cell} /> : null}
    </button>
  );
}

export function MonthCalendar({ snapshot }: MonthCalendarProps) {
  const cells = buildDashboardCalendarGrid(snapshot);
  const monthLabel = formatDashboardMonthLabel(snapshot.monthKey);
  const [activeDay, setActiveDay] = useState<DashboardDayRecord | null>(null);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveDay(null);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="dashboard-month-calendar"
      aria-label={`${monthLabel} 牛马记录`}
    >
      <div className="dashboard-chart-heading">
        <span className="dashboard-chart-chip">{monthLabel}</span>
        <h2 className="dashboard-chart-title">当月日历</h2>
      </div>

      <div className="calendar-month-table">
        <div className="calendar-weekday-row">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="calendar-weekday">
              <span className="calendar-week-prefix">周</span>
              {label}
            </div>
          ))}
        </div>
        <div className="calendar-month-grid">
          {cells.map((cell, index) => (
            <DashboardCalendarDayCell
              key={
                cell.kind === "neighbor"
                  ? `${cell.monthRelation}-${cell.day}-${index}`
                  : `${snapshot.monthKey}-${cell.day}`
              }
              cell={cell}
              monthKey={snapshot.monthKey}
              activeDay={activeDay}
              onActivate={cell.kind === "day" ? setActiveDay : () => {}}
              onDeactivate={() => setActiveDay(null)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
