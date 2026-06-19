"use client";

import { drinkCatalog } from "@/lib/drinks";
import type { DashboardDayRecord } from "@/lib/types";

interface DayTooltipProps {
  monthKey: string;
  day: DashboardDayRecord;
}

const PART_LABELS: Record<string, string> = {
  chest: "胸",
  back: "背",
  shoulder: "肩",
  arms: "手臂",
  glutes: "臀",
  legs: "腿",
  abs: "腹",
};

const CARDIO_LABELS: Record<string, string> = {
  treadmill: "跑步机",
  elliptical: "椭圆机",
  walk: "散步",
  swim: "游泳",
};

export function DayTooltip({ monthKey, day }: DayTooltipProps) {
  const [year, month] = monthKey.split("-").map(Number);
  const activeDrinks = (Object.entries(day.drinkCounts) as Array<[keyof typeof drinkCatalog, number]>).filter(
    ([, count]) => count > 0,
  );

  return (
    <div className="dashboard-day-tooltip">
      <div className="dashboard-day-tooltip-arrow" aria-hidden="true" />
      <div className="dashboard-day-tooltip-date">
        {year}年{month}月{day.day}日
      </div>

      {day.workedOut ? (
        <div className="dashboard-day-tooltip-section">
          <span className="dashboard-day-tooltip-badge dashboard-day-tooltip-badge-workout">
            {day.trainingType === "cardio"
              ? "有氧"
              : day.trainingType === "strength"
                ? "力量"
                : "有氧 + 力量"}
          </span>
          {day.cardioItem ? (
            <span className="dashboard-day-tooltip-badge dashboard-day-tooltip-badge-cardio">
              {CARDIO_LABELS[day.cardioItem] ?? day.cardioItem}
            </span>
          ) : null}
          {day.strengthParts.map((part) => (
            <span key={part} className="dashboard-day-tooltip-badge dashboard-day-tooltip-badge-workout">
              {PART_LABELS[part] ?? part}
            </span>
          ))}
          <span className="dashboard-day-tooltip-minutes">{day.workoutMinutes} 分钟</span>
        </div>
      ) : (
        <div className="dashboard-day-tooltip-empty">今日无训练</div>
      )}

      {activeDrinks.length > 0 ? (
        <div className="dashboard-day-tooltip-section">
          {activeDrinks.map(([type, count]) => {
            const catalog = drinkCatalog[type];
            return (
              <span key={type} className="dashboard-day-tooltip-drink-item">
                <span
                  className="dashboard-day-tooltip-drink-dot"
                  style={{ backgroundColor: catalog.color }}
                  aria-hidden="true"
                />
                {catalog.label}
                <span className="dashboard-day-tooltip-drink-count">{count} 杯</span>
              </span>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-day-tooltip-empty">今日无喝水记录</div>
      )}
    </div>
  );
}
