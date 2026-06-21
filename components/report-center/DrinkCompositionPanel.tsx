import type {
  TeamDrinkBreakdownItem,
  TeamDrinkTrendPoint,
} from "@/lib/types";
import { BarTooltip } from "./BarTooltip";
import { ChartPanel } from "./ChartPanel";
import { EmptyState } from "./EmptyState";

/**
 * 水铺饮品构成。
 * 去掉饼图（项目设计语言里无饼图），改用个人看板 DrinkBreakdownChart 同款水平柱：
 * dot + label + count + 占比%。下方保留「每日饮水」迷你青色柱条。
 */
export function DrinkCompositionPanel({
  breakdown,
  trend,
}: {
  breakdown: TeamDrinkBreakdownItem[];
  trend: TeamDrinkTrendPoint[];
}) {
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
          <div className="flex min-h-[3rem] flex-1 items-end gap-[2px] overflow-x-auto pb-1">
            {trend.map((t) => {
              const heightPct = t.count <= 0 ? 6 : Math.max(12, (t.count / trendMax) * 100);
              return (
                <div key={t.dayKey} className="flex h-full min-w-[4px] flex-1 flex-col justify-end">
                  <BarTooltip label={formatDrinkTrendLabel(t)}>
                    <div
                      data-drink-trend-bar
                      className="mx-auto w-full max-w-[0.9rem] rounded-[0.25rem] border-[1.5px] border-[#111827] bg-[#22d3ee] shadow-[0_2px_0_0_rgba(17,24,39,0.2)]"
                      style={{ height: `${heightPct}%` }}
                    />
                  </BarTooltip>
                </div>
              );
            })}
          </div>
        </>
      )}
    </ChartPanel>
  );
}

/** 饮水趋势 tooltip 文案 */
function formatDrinkTrendLabel(point: TeamDrinkTrendPoint): string {
  const isMonth = point.dayKey.length === 10;
  const dateText = isMonth
    ? `${Number(point.dayKey.slice(5, 7))}月${Number(point.dayKey.slice(8, 10))}日`
    : `${point.dayKey.slice(0, 4)}年${Number(point.dayKey.slice(5, 7))}月`;
  return `${dateText} · ${point.count} 杯`;
}
