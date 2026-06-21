"use client";

import {
  currentScope,
  formatScopeLabel,
  isCurrentScope,
  nextScope,
  prevScope,
} from "@/lib/dashboard-scope";
import type { DashboardScope } from "@/lib/types";

interface PeriodNavigatorProps {
  scope: DashboardScope;
  onScopeChange: (scope: DashboardScope) => void;
  now?: Date;
}

export function PeriodNavigator({ scope, onScopeChange, now = new Date() }: PeriodNavigatorProps) {
  const atCurrent = isCurrentScope(scope, now);

  const handleToggle = (type: "month" | "year") => {
    if (scope.type === type) return;
    onScopeChange(currentScope(now, type));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-lg border-2 border-[#1f2937] bg-white p-1">
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm font-black text-[#1f2937] hover:bg-[#fde047]/40 disabled:opacity-30"
          onClick={() => onScopeChange(prevScope(scope))}
          aria-label="上一个周期"
        >
          ‹
        </button>
        <button
          type="button"
          data-period-label
          className="rounded-md px-3 py-1 text-sm font-extrabold text-[#1f2937] hover:bg-[#fde047]/40"
          onClick={() => onScopeChange(currentScope(now, scope.type))}
          title="回到当前周期"
        >
          {formatScopeLabel(scope)}
        </button>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-sm font-black text-[#1f2937] hover:bg-[#fde047]/40 disabled:opacity-30"
          onClick={() => onScopeChange(nextScope(scope))}
          disabled={atCurrent}
          aria-label="下一个周期"
        >
          ›
        </button>
      </div>

      <div
        className="inline-flex gap-1 rounded-lg border-2 border-[#1f2937] bg-white p-1"
        role="group"
        aria-label="统计粒度"
      >
        <button
          type="button"
          data-granularity="month"
          className={`rounded-md px-3 py-1 text-sm font-bold transition-colors ${
            scope.type === "month" ? "bg-[#fde047] text-[#1f2937]" : "text-[#1f2937] hover:bg-[#fde047]/40"
          }`}
          onClick={() => handleToggle("month")}
          aria-pressed={scope.type === "month"}
        >
          按月
        </button>
        <button
          type="button"
          data-granularity="year"
          className={`rounded-md px-3 py-1 text-sm font-bold transition-colors ${
            scope.type === "year" ? "bg-[#fde047] text-[#1f2937]" : "text-[#1f2937] hover:bg-[#fde047]/40"
          }`}
          onClick={() => handleToggle("year")}
          aria-pressed={scope.type === "year"}
        >
          按年
        </button>
      </div>
    </div>
  );
}
