"use client";

import type { DailyTrendPoint, ReportDaySummary } from "./report-data";

interface TrendChartProps {
  dailyPoints: DailyTrendPoint[];
  peakDay: ReportDaySummary | null;
  lowDay: ReportDaySummary | null;
}

const chartWidth = 1000;
const chartHeight = 160;
const paddingX = 40;
const topY = 26;
const bottomY = 124;

function getPointCoordinates(points: DailyTrendPoint[]) {
  const maxCount = Math.max(1, ...points.map((point) => point.count));
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = bottomY - topY;

  return points.map((point, index) => {
    const x = points.length === 1 ? chartWidth / 2 : paddingX + (index / (points.length - 1)) * usableWidth;
    const y = topY + ((maxCount - point.count) / maxCount) * usableHeight;

    return { ...point, x, y };
  });
}

function getTickDays(points: DailyTrendPoint[]) {
  if (points.length <= 3) {
    return points.map((point) => point.day);
  }

  const middle = points[Math.floor(points.length / 2)].day;
  return Array.from(new Set([points[0].day, middle, points[points.length - 1].day]));
}

export function TrendChart({ dailyPoints, peakDay, lowDay }: TrendChartProps) {
  const coordinates = getPointCoordinates(dailyPoints);
  const polylinePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const tickDays = getTickDays(dailyPoints);

  return (
    <section className="flex flex-col rounded-[1.5rem] border-4 border-slate-100 bg-white p-5 xl:col-span-2 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black">ACTIVITY TREND / 活跃趋势</h2>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-sub">每日打卡人数</span>
      </div>

      <div className="relative mt-2 w-full overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50">
        {dailyPoints.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm font-bold text-sub">暂无趋势数据</div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              preserveAspectRatio="none"
              className="h-48 w-full drop-shadow-md"
              role="img"
              aria-label="团队每日打卡人数趋势"
            >
              <line x1="0" y1="36" x2={chartWidth} y2="36" stroke="#e2e8f0" strokeDasharray="6,6" strokeWidth="2" />
              <line x1="0" y1="78" x2={chartWidth} y2="78" stroke="#e2e8f0" strokeDasharray="6,6" strokeWidth="2" />
              <line x1="0" y1="120" x2={chartWidth} y2="120" stroke="#e2e8f0" strokeDasharray="6,6" strokeWidth="2" />
              <polyline
                fill="none"
                stroke="#fde047"
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
              {coordinates.map((point) => (
                <circle
                  key={point.day}
                  cx={point.x}
                  cy={point.y}
                  r={point.isFullAttendance ? 9 : 5}
                  fill={point.isFullAttendance ? "#1f2937" : "#f59e0b"}
                />
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-between px-6 text-[10px] font-bold text-slate-400">
              {tickDays.map((day) => (
                <span key={day}>{day} 日</span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-xs font-bold sm:grid-cols-2">
        <div className="rounded-xl border-2 border-yellow-100 bg-yellow-50 px-3 py-2 text-yellow-800">
          峰值：{peakDay ? `第 ${peakDay.day} 天 · ${peakDay.count} 人打卡` : "暂无数据"}
        </div>
        <div className="rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sub">
          低谷：{lowDay ? `第 ${lowDay.day} 天 · ${lowDay.count} 人打卡` : "暂无数据"}
        </div>
      </div>
    </section>
  );
}
