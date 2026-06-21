"use client";

import { useState } from "react";
import type {
  TeamDrinkBreakdownItem,
  TeamDrinkTrendPoint,
} from "@/lib/types";
import { ChartPanel } from "./ChartPanel";
import { EmptyState } from "./EmptyState";

/** dayKey → 标签日期文案 */
function formatDateText(dayKey: string): string {
  if (dayKey.length === 10) {
    return `${Number(dayKey.slice(5, 7))}月${Number(dayKey.slice(8, 10))}日`;
  }
  return `${dayKey.slice(0, 4)}年${Number(dayKey.slice(5, 7))}月`;
}

/**
 * 水铺饮品构成。
 * 去掉饼图（项目设计语言里无饼图），改用个人看板 DrinkBreakdownChart 同款水平柱：
 * dot + label + count + 占比%。下方「每日饮水」迷你青色柱 + 共享 hover 标签
 * （默认最近一天，hover 切换）。
 */
export function DrinkCompositionPanel({
  breakdown,
  trend,
}: {
  breakdown: TeamDrinkBreakdownItem[];
  trend: TeamDrinkTrendPoint[];
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = breakdown.reduce((sum, b) => sum + b.count, 0);

  if (total === 0) {
    return (
      <ChartPanel chip="水铺构成" title="喝些什么">
        <EmptyState message="暂无饮水数据" />
      </ChartPanel>
    );
  }

  const maxCount = Math.max(1, ...breakdown.map((b) => b.count));
  const trendMax = Math.max(...trend.map((t) => t.count), 1);
  const activeTrendIdx = hoverIdx ?? trend.length - 1;
  const activeTrend = trend[activeTrendIdx];

  return (
    <ChartPanel chip="水铺构成" title="喝些什么">

      <div className="dashboard-drink-breakdown">
        {breakdown.map((item) => {
          const pct = Math.round((item.count / total) * 100);
          const widthPct =
            item.count <= 0 ? 0 : `${Math.max(12, (item.count / maxCount) * 100)}%`;
          return (
            <div key={item.type} className="dashboard-drink-breakdown-item">
              <div className="dashboard-drink-breakdown-info">
                <span
                  className="dashboard-drink-breakdown-dot"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="dashboard-drink-breakdown-label">{item.label}</span>
                <span className="dashboard-drink-breakdown-count">{item.count}</span>
                <span className="ml-auto text-[0.65rem] font-bold text-[#94a3b8]">
                  {pct}%
                </span>
              </div>
              <div className="dashboard-drink-breakdown-track">
                <div
                  className="dashboard-drink-breakdown-bar"
                  style={{ width: widthPct, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {trend.length > 0 && (
        <>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[0.65rem] font-black uppercase tracking-wide text-[#64748b]">
              每日饮水
            </span>
            <span className="h-px flex-1 bg-[#e2e8f0]" />
          </div>

          <div className="inline-flex items-center gap-1.5 self-start rounded-full border-2 border-[#111827] bg-white px-2.5 py-[3px] text-[0.7rem] font-extrabold text-[#1f2937] shadow-[0_2px_0_0_#111827]">
            <span className="text-[#64748b]">{formatDateText(activeTrend.dayKey)}</span>
            <span className="text-[1rem] font-black leading-none text-[#1f2937]">{activeTrend.count}</span>
            <span className="text-[#64748b]">杯</span>
          </div>

          <div className="flex min-h-[3rem] flex-1 items-end gap-[2px] pb-1">
            {trend.map((t, i) => {
              const heightPct = t.count <= 0 ? 6 : Math.max(12, (t.count / trendMax) * 100);
              const isActive = i === activeTrendIdx;
              return (
                <div key={t.dayKey} className="flex h-full min-w-[4px] flex-1 items-end justify-center">
                  <div
                    data-drink-trend-bar
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    className={`w-full max-w-[0.9rem] rounded-[0.25rem] border-[1.5px] border-[#111827] bg-[#22d3ee] shadow-[0_2px_0_0_rgba(17,24,39,0.2)] ${
                      isActive ? "ring-2 ring-[#111827]/70 ring-offset-1" : ""
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </ChartPanel>
  );
}
