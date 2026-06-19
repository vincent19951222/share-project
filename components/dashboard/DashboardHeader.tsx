"use client";

import type { DashboardPeriod } from "@/lib/types";

interface DashboardHeaderProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export function DashboardHeader({ period, onPeriodChange }: DashboardHeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="dashboard-header-title-group">
        <h1 className="dashboard-header-title">牛马日历</h1>
        <p className="dashboard-header-subtitle">个人看板</p>
      </div>
      <div className="shared-board-type-toggle" role="group" aria-label="统计周期">
        <button
          type="button"
          className={period === "month" ? "selected" : ""}
          onClick={() => onPeriodChange("month")}
          aria-pressed={period === "month"}
        >
          本月
        </button>
        <button
          type="button"
          className={period === "year" ? "selected" : ""}
          onClick={() => onPeriodChange("year")}
          aria-pressed={period === "year"}
        >
          本年
        </button>
      </div>
    </header>
  );
}
