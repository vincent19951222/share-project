"use client";

import type { DashboardPeriod } from "@/lib/types";
import { PeriodSwitcher } from "./PeriodSwitcher";

function periodLabel(period: DashboardPeriod): string {
  // 由 ReportCenter 传入当前日期派生的中文标题更准确；此处简化用副标题占位
  return period === "month" ? "本月战报" : "本年战报";
}

export function TeamHeader({
  period,
  onPeriodChange,
}: {
  period: DashboardPeriod;
  onPeriodChange: (p: DashboardPeriod) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-main">战报中心</h1>
        <p className="text-sub">{periodLabel(period)}</p>
      </div>
      <PeriodSwitcher period={period} onChange={onPeriodChange} />
    </div>
  );
}
