"use client";

import type { DailyTrendPoint, ReportDaySummary } from "./report-data";

interface TrendChartProps {
  dailyPoints: DailyTrendPoint[];
  monthNumber: number;
  peakDay: ReportDaySummary | null;
  lowDay: ReportDaySummary | null;
}

const chartWidth = 960;
const chartHeight = 280;
const paddingX = 42;
const topY = 46;
const bottomY = 200;
const chartFloorY = 224;

function getAxisMax(points: DailyTrendPoint[]) {
  const maxCount = Math.max(1, ...points.map((point) => point.count));

  return Math.max(5, Math.ceil(maxCount / 5) * 5);
}

function getPointCoordinates(points: DailyTrendPoint[]) {
  const axisMax = getAxisMax(points);
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = bottomY - topY;

  return points.map((point, index) => {
    const x = points.length === 1 ? chartWidth / 2 : paddingX + (index / (points.length - 1)) * usableWidth;
    const y = topY + ((axisMax - point.count) / axisMax) * usableHeight;

    return { ...point, x, y };
  });
}

function getYAxisTicks(points: DailyTrendPoint[]) {
  const axisMax = getAxisMax(points);

  return [
    axisMax,
    Math.round(axisMax * 0.75),
    Math.round(axisMax * 0.5),
    Math.round(axisMax * 0.25),
    0,
  ].map(String);
}

function getTickDays(points: DailyTrendPoint[]) {
  if (points.length <= 3) {
    return points.map((point) => point.day);
  }

  return points.map((point) => point.day);
}

function formatChartDay(monthNumber: number, day: number) {
  return `${monthNumber}/${day}`;
}

function buildPolylinePath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  return points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
}

function buildAreaPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) {
    return "";
  }

  const linePath = buildPolylinePath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${linePath} L ${last.x} ${chartFloorY} L ${first.x} ${chartFloorY} Z`;
}

function getSvgLabelLayout(point: { x: number; y: number }, options: { prefer: "above" | "below" }) {
  const width = 116;
  const height = 28;
  const offsetY = 18;
  const minX = 10;
  const maxX = chartWidth - width - 10;
  const preferredY = options.prefer === "above" ? point.y - height - offsetY : point.y + offsetY;
  const x = Math.max(minX, Math.min(point.x - width / 2, maxX));
  const y = Math.max(10, Math.min(preferredY, chartHeight - height - 10));

  return { x, y, width, height };
}

function ChartAnnotation({
  point,
  label,
  prefer,
  tone,
}: {
  point: { x: number; y: number };
  label: string;
  prefer: "above" | "below";
  tone: "peak" | "low";
}) {
  const layout = getSvgLabelLayout(point, { prefer });
  const palette =
    tone === "peak"
      ? {
          fill: "#ffffff",
          stroke: "#cbd5e1",
          text: "#334155",
        }
      : {
          fill: "#f8fafc",
          stroke: "#cbd5e1",
          text: "#475569",
        };

  return (
    <g className="report-chart-annotation-layer" transform={`translate(${layout.x} ${layout.y})`}>
      <rect
        width={layout.width}
        height={layout.height}
        rx="14"
        fill={palette.fill}
        fillOpacity="0.96"
        stroke={palette.stroke}
        strokeWidth="2"
      />
      <text
        x={layout.width / 2}
        y={layout.height / 2 + 4}
        fill={palette.text}
        fontSize="11"
        fontWeight="900"
        textAnchor="middle"
      >
        {label}
      </text>
    </g>
  );
}

export function TrendChart({ dailyPoints, monthNumber, peakDay, lowDay }: TrendChartProps) {
  const coordinates = getPointCoordinates(dailyPoints);
  const linePath = buildPolylinePath(coordinates);
  const areaPath = buildAreaPath(coordinates);
  const tickDays = getTickDays(dailyPoints);
  const yAxisTicks = getYAxisTicks(dailyPoints);
  const todayPoint = dailyPoints.at(-1) ?? null;
  const todayCoordinate = coordinates.at(-1) ?? null;
  const peakPoint = coordinates.find((point) => point.day === peakDay?.day) ?? null;
  const lowPoint = coordinates.find((point) => point.day === lowDay?.day) ?? null;

  return (
    <section className="report-chart-card report-analysis-paper report-prototype-trend flex flex-col overflow-hidden bg-[#fffaf0] p-4 sm:p-5">
      <div className="report-analysis-editorial-frame flex h-full flex-col gap-4 rounded-[1.25rem] border-[3px] border-slate-900 bg-[rgba(255,253,247,0.96)] p-4 shadow-[0_8px_0_0_rgba(15,23,42,0.12)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b-[3px] border-slate-200 pb-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="report-analysis-title text-[2rem] font-black leading-none text-slate-900">
                活跃趋势
              </h2>
              <span className="report-chart-badge report-analysis-badge report-prototype-trend-legend border-red-200 bg-red-100 text-red-900">
                ★ 每日打卡人数
              </span>
            </div>
            <div className="mt-2 h-[3px] w-32 rounded-full bg-slate-300" aria-hidden="true" />
          </div>

          <div className="report-analysis-chips flex flex-wrap gap-2 text-sm font-black">
            <div className="report-stat-chip border-red-200 bg-red-50 text-red-900">
              峰值&nbsp;&nbsp;{peakDay ? `${peakDay.count} 人 (${formatChartDay(monthNumber, peakDay.day)})` : "暂无数据"}
            </div>
            <div className="report-stat-chip border-blue-200 bg-blue-50 text-blue-900">
              低谷&nbsp;&nbsp;{lowDay ? `${lowDay.count} 人 (${formatChartDay(monthNumber, lowDay.day)})` : "暂无数据"}
            </div>
          </div>
        </div>

        <div className="report-analysis-body-grid grid gap-4">
          <div className="report-chart-frame relative overflow-hidden rounded-[0.8rem] border-0 bg-[rgba(255,255,255,0.55)]">
            {dailyPoints.length === 0 ? (
              <div className="flex min-h-[280px] items-center justify-center text-sm font-bold text-sub">
                暂无趋势数据
              </div>
            ) : (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-4 top-4 bottom-12 rounded-[0.75rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,250,250,0.34)),linear-gradient(90deg,rgba(239,68,68,0.1)_1px,transparent_1px),linear-gradient(180deg,rgba(148,163,184,0.22)_1px,transparent_1px)] bg-[length:auto,64px_64px,64px_64px] bg-[position:0_0,0_0,0_0]"
                />
                <div className="report-chart-canvas relative min-h-[280px] w-full">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="relative z-10 h-auto w-full"
                    role="img"
                    aria-label="团队每日打卡人数趋势"
                  >
                    <defs>
                      <linearGradient id="trend-area-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#fecaca" stopOpacity="0.72" />
                        <stop offset="100%" stopColor="#fecaca" stopOpacity="0.12" />
                      </linearGradient>
                    </defs>

                    <text x="16" y="54" fill="#1f2937" fontSize="16" fontWeight="900">{yAxisTicks[0]}</text>
                    <text x="16" y="106" fill="#1f2937" fontSize="16" fontWeight="900">{yAxisTicks[1]}</text>
                    <text x="16" y="158" fill="#1f2937" fontSize="16" fontWeight="900">{yAxisTicks[2]}</text>
                    <text x="16" y="210" fill="#1f2937" fontSize="16" fontWeight="900">{yAxisTicks[3]}</text>
                    <text x="22" y="246" fill="#1f2937" fontSize="16" fontWeight="900">{yAxisTicks[4]}</text>
                    <line x1={paddingX} y1="42" x2={chartWidth - paddingX} y2="42" stroke="#d1d5db" strokeDasharray="6,6" strokeWidth="2" />
                    <line x1={paddingX} y1="94" x2={chartWidth - paddingX} y2="94" stroke="#d1d5db" strokeDasharray="6,6" strokeWidth="2" />
                    <line x1={paddingX} y1="146" x2={chartWidth - paddingX} y2="146" stroke="#d1d5db" strokeDasharray="6,6" strokeWidth="2" />
                    <line x1={paddingX} y1={chartFloorY} x2={chartWidth - paddingX} y2={chartFloorY} stroke="#cbd5e1" strokeWidth="2" />

                    <path className="report-prototype-trend-area" d={areaPath} fill="url(#trend-area-fill)" />
                    {todayCoordinate && todayPoint ? (
                      <g className="report-prototype-today-label">
                        <rect
                          className="report-prototype-today-marker"
                          x={Math.max(todayCoordinate.x - 27, paddingX)}
                          y="34"
                          width="58"
                          height="210"
                          rx="12"
                        />
                        <text
                          x={todayCoordinate.x}
                          y="62"
                          fill="#111827"
                          fontSize="22"
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          {todayPoint.count}
                        </text>
                        <text
                          x={todayCoordinate.x}
                          y="238"
                          fill="#111827"
                          fontSize="15"
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          {formatChartDay(monthNumber, todayPoint.day)}
                        </text>
                        <text
                          x={todayCoordinate.x}
                          y="256"
                          fill="#111827"
                          fontSize="15"
                          fontWeight="900"
                          textAnchor="middle"
                        >
                          今天
                        </text>
                      </g>
                    ) : null}
                    <path
                      className="report-prototype-trend-line"
                      d={linePath}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity="0.58"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {coordinates.map((point, index) => {
                      const isLowPoint = point.day === lowDay?.day;
                      const isToday = index === coordinates.length - 1;

                      return (
                      <g key={point.day}>
                        <line
                          x1={point.x}
                          x2={point.x}
                          y1={point.y}
                          y2={chartFloorY}
                          stroke={isToday ? "#f59e0b" : "#fecaca"}
                          strokeDasharray="4,4"
                          strokeWidth="2"
                        />
                        {!isToday ? (
                          <text
                            x={point.x}
                            y={Math.max(18, point.y - 18)}
                            fill={isLowPoint ? "#1d4ed8" : "#991b1b"}
                            fontSize="18"
                            fontWeight="900"
                            textAnchor="middle"
                          >
                            {point.count}
                          </text>
                        ) : null}
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isToday ? 12 : 9}
                          fill="#ffffff"
                          stroke={isLowPoint ? "#2563eb" : "#ef4444"}
                          strokeWidth={4}
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={isToday ? 5 : 3.5}
                          fill={isLowPoint ? "#2563eb" : "#ef4444"}
                        />
                      </g>
                      );
                    })}

                    {peakPoint ? (
                      <ChartAnnotation
                        point={peakPoint}
                        label={`峰值 ${peakPoint.count} 人`}
                        prefer="above"
                        tone="peak"
                      />
                    ) : null}

                    {lowPoint ? (
                      <ChartAnnotation
                        point={lowPoint}
                        label={`低谷 ${lowPoint.count} 人`}
                        prefer="below"
                        tone="low"
                      />
                    ) : null}
                  </svg>
                </div>

                <div className="report-analysis-ruler flex items-center justify-between gap-2 border-t-2 border-slate-200 bg-[#fff7ed] px-5 py-3 text-[10px] font-black text-slate-800">
                  {tickDays.map((day) => (
                    <span key={day}>{formatChartDay(monthNumber, day)}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
