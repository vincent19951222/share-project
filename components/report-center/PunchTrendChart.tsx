import type { TeamPunchTrendPoint } from "@/lib/types";
import { EmptyState } from "./EmptyState";

const BAR_W = 14;
const GAP = 4;
const HEIGHT = 140;
const FULL_COLOR = "#16a34a";
const NORMAL_COLOR = "#fde047";

export function PunchTrendChart({ points }: { points: TeamPunchTrendPoint[] }) {
  if (points.length === 0) {
    return <EmptyState message="暂无打卡数据" />;
  }

  const max = Math.max(...points.map((p) => p.count), 1);
  const peakCount = Math.max(...points.map((p) => p.count));
  const width = points.length * (BAR_W + GAP);

  return (
    <div className="soft-card p-4">
      <h3 className="mb-2 text-sm font-bold text-main">每日打卡趋势</h3>
      <svg width={width} height={HEIGHT} role="img" aria-label="每日打卡趋势">
        {points.map((p, i) => {
          const h = (p.count / max) * (HEIGHT - 20);
          const x = i * (BAR_W + GAP);
          const y = HEIGHT - h;
          return (
            <rect
              key={p.dayKey}
              data-bar
              x={x}
              y={y}
              width={BAR_W}
              height={Math.max(h, 2)}
              fill={p.isFullAttendance ? FULL_COLOR : NORMAL_COLOR}
              stroke="#1f2937"
              strokeWidth={1}
            >
              <title>{`${p.dayKey}: ${p.count} 人${p.isFullAttendance ? "（全勤）" : ""}`}</title>
            </rect>
          );
        })}
      </svg>
      {peakCount > 0 && (
        <p className="mt-2 text-xs text-sub">🔥峰值 {peakCount}人</p>
      )}
    </div>
  );
}
