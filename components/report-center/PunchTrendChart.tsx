import type { TeamPunchTrendPoint } from "@/lib/types";
import { ChartPanel } from "./ChartPanel";
import { EmptyState } from "./EmptyState";

/**
 * 每日打卡趋势（柱状图）。
 * 复用项目图表设计系统：dashboard-chart-panel 外壳 + chip 标题头。
 * 柱体为 div（非 SVG），密集横排，超出可横向滚动。
 * 全勤日 = 实心黄 + 厚边落影（项目「已打卡」语义色）；部分打卡 = 半透明黄。
 * 不引入绿色，保持黄/青/灰调色板。
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
            <div
              key={p.dayKey}
              className="flex h-full min-w-[5px] flex-1 flex-col justify-end"
              title={`${p.dayKey}：${p.count} 人${p.isFullAttendance ? "（全勤）" : ""}`}
            >
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
            </div>
          );
        })}
      </div>
    </ChartPanel>
  );
}
