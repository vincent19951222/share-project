"use client";

import type { DailyTrendPoint, ReportDaySummary } from "./report-data";

interface TrendChartProps {
  dailyPoints: DailyTrendPoint[];
  peakDay: ReportDaySummary | null;
  lowDay: ReportDaySummary | null;
}

const chartWidth = 960;
const chartHeight = 280;
const paddingX = 42;
const topY = 54;
const bottomY = 190;
const chartFloorY = 224;

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

function buildSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;

    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`;
  }

  return path;
}

function buildAreaPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  const smoothPath = buildSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${smoothPath} L ${last.x} ${chartFloorY} L ${first.x} ${chartFloorY} Z`;
}

function getSmartLabelPosition(
  point: { x: number; y: number },
  options: { prefer: "above" | "below" },
) {
  const xPercent = (point.x / chartWidth) * 100;
  const yPercent = (point.y / chartHeight) * 100;

  const horizontal =
    xPercent >= 88
      ? { left: `${xPercent}%`, transformX: "calc(-100% - 8px)" }
      : xPercent <= 12
        ? { left: `${xPercent}%`, transformX: "8px" }
        : { left: `${xPercent}%`, transformX: "-50%" };

  const shouldFlipBelow = options.prefer === "above" && yPercent <= 24;
  const shouldFlipAbove = options.prefer === "below" && yPercent >= 74;

  if (shouldFlipBelow) {
    return {
      left: horizontal.left,
      top: `${Math.min(80, ((point.y + 18) / chartHeight) * 100)}%`,
      transform: `translate(${horizontal.transformX}, 0)`,
    };
  }

  if (shouldFlipAbove) {
    return {
      left: horizontal.left,
      top: `${Math.max(8, ((point.y - 18) / chartHeight) * 100)}%`,
      transform: `translate(${horizontal.transformX}, -100%)`,
    };
  }

  if (options.prefer === "above") {
    return {
      left: horizontal.left,
      top: `${Math.max(8, ((point.y - 18) / chartHeight) * 100)}%`,
      transform: `translate(${horizontal.transformX}, -100%)`,
    };
  }

  return {
    left: horizontal.left,
    top: `${Math.min(84, ((point.y + 18) / chartHeight) * 100)}%`,
    transform: `translate(${horizontal.transformX}, 0)`,
  };
}

export function TrendChart({ dailyPoints, peakDay, lowDay }: TrendChartProps) {
  const coordinates = getPointCoordinates(dailyPoints);
  const linePath = buildSmoothPath(coordinates);
  const areaPath = buildAreaPath(coordinates);
  const tickDays = getTickDays(dailyPoints);
  const peakPoint = coordinates.find((point) => point.day === peakDay?.day) ?? null;
  const lowPoint = coordinates.find((point) => point.day === lowDay?.day) ?? null;
  const peakLabelStyle = peakPoint
    ? getSmartLabelPosition(peakPoint, { prefer: "above" })
    : null;
  const lowLabelStyle = lowPoint
    ? getSmartLabelPosition(lowPoint, { prefer: "below" })
    : null;

  return (
    <section className="report-chart-card flex flex-col p-5 xl:col-span-2 sm:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="report-chip report-chip-muted">每日走势</div>
          <h2 className="mt-3 text-2xl font-black text-main">活跃趋势</h2>
        </div>
        <span className="report-chart-badge">每日打卡人数</span>
      </div>

      <div className="report-chart-frame relative mt-2 w-full overflow-hidden">
        {dailyPoints.length === 0 ? (
          <div className="flex min-h-[280px] items-center justify-center text-sm font-bold text-sub">暂无趋势数据</div>
        ) : (
          <>
            <div className="report-chart-canvas relative min-h-[280px] w-full">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="h-auto w-full"
                role="img"
                aria-label="团队每日打卡人数趋势"
              >
                <defs>
                  <linearGradient id="trend-area-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#fde68a" stopOpacity="0.55" />
                    <stop offset="100%" stopColor="#fde68a" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                <line x1={paddingX} y1="42" x2={chartWidth - paddingX} y2="42" stroke="#dbe4ee" strokeDasharray="6,6" strokeWidth="2" />
                <line x1={paddingX} y1="94" x2={chartWidth - paddingX} y2="94" stroke="#dbe4ee" strokeDasharray="6,6" strokeWidth="2" />
                <line x1={paddingX} y1="146" x2={chartWidth - paddingX} y2="146" stroke="#dbe4ee" strokeDasharray="6,6" strokeWidth="2" />
                <line x1={paddingX} y1={chartFloorY} x2={chartWidth - paddingX} y2={chartFloorY} stroke="#cbd5e1" strokeWidth="2" />

                <path d={areaPath} fill="url(#trend-area-fill)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#facc15"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={linePath}
                  fill="none"
                  stroke="#ffffff"
                  strokeOpacity="0.42"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {coordinates.map((point) => (
                  <g key={point.day}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={point.isFullAttendance ? 10 : 6}
                      fill="#ffffff"
                      stroke={point.isFullAttendance ? "#1f2937" : "#f59e0b"}
                      strokeWidth={point.isFullAttendance ? 4 : 3}
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={point.isFullAttendance ? 4 : 2.5}
                      fill={point.isFullAttendance ? "#1f2937" : "#f59e0b"}
                    />
                  </g>
                ))}
              </svg>

              {peakPoint ? (
                <div
                  className="pointer-events-none absolute rounded-full border-2 border-slate-200 bg-white/95 px-3 py-1 text-[11px] font-black text-slate-700 shadow-sm"
                  style={peakLabelStyle ?? undefined}
                >
                  峰值 {peakPoint.count} 人
                </div>
              ) : null}

              {lowPoint ? (
                <div
                  className="pointer-events-none absolute rounded-full border-2 border-slate-200 bg-slate-50/95 px-3 py-1 text-[11px] font-black text-slate-600 shadow-sm"
                  style={lowLabelStyle ?? undefined}
                >
                  低谷 {lowPoint.count} 人
                </div>
              ) : null}

              <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-between px-6 text-[10px] font-bold text-slate-500">
                {tickDays.map((day) => (
                  <span key={day}>{day} 日</span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 text-xs font-bold sm:grid-cols-2">
        <div className="report-stat-chip bg-yellow-100 text-yellow-900">
          峰值：{peakDay ? `第 ${peakDay.day} 天 · ${peakDay.count} 人打卡` : "暂无数据"}
        </div>
        <div className="report-stat-chip bg-slate-100 text-slate-700">
          低谷：{lowDay ? `第 ${lowDay.day} 天 · ${lowDay.count} 人打卡` : "暂无数据"}
        </div>
      </div>
    </section>
  );
}
