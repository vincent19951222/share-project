import type { TeamPunchTrendPoint } from "@/lib/types";
import { BarTooltip } from "./BarTooltip";
import { ChartPanel } from "./ChartPanel";
import { EmptyState } from "./EmptyState";

/** 月视图 dayKey=YYYY-MM-DD → "6/10"；年视图 dayKey=YYYY-MM → "6月" */
function formatAxisLabel(dayKey: string): string {
  if (dayKey.length === 7) {
    return `${Number(dayKey.slice(5, 7))}月`;
  }
  return `${Number(dayKey.slice(5, 7))}/${Number(dayKey.slice(8, 10))}`;
}

/** tooltip 用完整文案 */
function formatTooltipLabel(point: TeamPunchTrendPoint): string {
  const isMonth = point.dayKey.length === 10;
  const dateText = isMonth
    ? `${Number(point.dayKey.slice(5, 7))}月${Number(point.dayKey.slice(8, 10))}日`
    : `${point.dayKey.slice(0, 4)}年${Number(point.dayKey.slice(5, 7))}月`;
  return `${dateText} · ${point.count} 人${point.isFullAttendance ? " · 全勤" : ""}`;
}

/**
 * 每日打卡趋势（柱状图）。
 * 复用项目图表设计系统：dashboard-chart-panel 外壳 + chip 标题头。
 * 柱体为 div（非 SVG），hover 浮出日期+人数标签；底部 x 轴标首/中/末关键日期。
 * 全勤日 = 实心黄；部分打卡 = 半透明黄。不引入绿色。
 */
export function PunchTrendChart({ points }: { points: TeamPunchTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <ChartPanel chip="打卡活跃" title="每日趋势">
        <EmptyState message="暂无打卡数据" />
      </ChartPanel>
    );
  }

  const max = Math.max(...points.map((p) => p.count), 1);
  const peakCount = Math.max(...points.map((p) => p.count));
  const fullDays = points.filter((p) => p.isFullAttendance).length;

  // x 轴只标关键位置（首、1/4、中、3/4、末），避免密集时挤
  const tickIndices = pickTickIndices(points.length);

  return (
    <ChartPanel chip="打卡活跃" title="每日趋势">

      <div className="flex items-center gap-3 text-[0.65rem] font-bold text-[#64748b]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-[#111827] bg-[#fde047]" />
          全勤 {fullDays}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-[#111827] bg-[#fde047]/45" />
          部分打卡
        </span>
        {peakCount > 0 && (
          <span className="ml-auto inline-flex items-center rounded-full border-2 border-[#111827] bg-[#fde047] px-2 py-[1px] text-[0.6rem] font-black text-[#1f2937]">
            🔥 峰值 {peakCount}人
          </span>
        )}
      </div>

      <div className="flex min-h-[6rem] flex-1 items-end gap-[3px] overflow-x-auto pb-1">
        {points.map((p) => {
          const heightPct = p.count <= 0 ? 6 : Math.max(12, (p.count / max) * 100);
          return (
            <div key={p.dayKey} className="flex h-full min-w-[5px] flex-1 flex-col justify-end">
              <BarTooltip label={formatTooltipLabel(p)}>
                <div
                  data-punch-bar
                  data-full={p.isFullAttendance ? "true" : "false"}
                  className={`mx-auto w-full max-w-[1rem] rounded-[0.3rem] border-[1.5px] border-[#111827] ${
                    p.isFullAttendance
                      ? "bg-[#fde047] shadow-[0_2px_0_0_rgba(17,24,39,0.25)]"
                      : "bg-[#fde047]/45"
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </BarTooltip>
            </div>
          );
        })}
      </div>

      <div className="flex gap-[3px] text-[0.55rem] font-bold text-[#94a3b8]">
        {points.map((p, i) => (
          <span
            key={p.dayKey}
            className="min-w-[5px] flex-1 text-center"
          >
            {tickIndices.has(i) ? formatAxisLabel(p.dayKey) : ""}
          </span>
        ))}
      </div>
    </ChartPanel>
  );
}

/** 选最多 5 个刻度位置，柱子少时全标 */
function pickTickIndices(length: number): Set<number> {
  if (length <= 5) {
    return new Set(length > 0 ? Array.from({ length }, (_, i) => i) : []);
  }
  const positions = [0, Math.round(length * 0.25), Math.round(length * 0.5), Math.round(length * 0.75), length - 1];
  return new Set(positions);
}
