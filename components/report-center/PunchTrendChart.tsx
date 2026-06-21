"use client";

import { useState } from "react";
import type { TeamPunchTrendPoint } from "@/lib/types";
import { ChartPanel } from "./ChartPanel";
import { EmptyState } from "./EmptyState";

/** 月视图 dayKey=YYYY-MM-DD → "6/10"；年视图 dayKey=YYYY-MM → "6月" */
function formatAxisLabel(dayKey: string): string {
  if (dayKey.length === 7) {
    return `${Number(dayKey.slice(5, 7))}月`;
  }
  return `${Number(dayKey.slice(5, 7))}/${Number(dayKey.slice(8, 10))}`;
}

/** 标签里的完整日期文案 */
function formatDateText(dayKey: string): string {
  if (dayKey.length === 10) {
    return `${Number(dayKey.slice(5, 7))}月${Number(dayKey.slice(8, 10))}日`;
  }
  return `${dayKey.slice(0, 4)}年${Number(dayKey.slice(5, 7))}月`;
}

/**
 * 每日打卡趋势（柱状图）。
 * 复用项目图表设计系统：dashboard-chart-panel 外壳 + chip 标题头。
 * 柱顶上方有一个共享 hover 标签：默认显示最近一天，hover 任一柱切换到该柱
 * （日期 + 人数 + 全勤标记）。底部 x 轴标首/中/末关键日期。
 * 全勤日 = 实心黄；部分打卡 = 半透明黄。不引入绿色。
 */
export function PunchTrendChart({ points }: { points: TeamPunchTrendPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

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
  const activeIdx = hoverIdx ?? points.length - 1;
  const active = points[activeIdx];
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

      <ValueLabel date={formatDateText(active.dayKey)} value={active.count} unit="人" badge={active.isFullAttendance ? "全勤" : undefined} />

      <div className="flex min-h-[6rem] flex-1 items-end gap-[3px] pb-1">
        {points.map((p, i) => {
          const heightPct = p.count <= 0 ? 6 : Math.max(12, (p.count / max) * 100);
          const isActive = i === activeIdx;
          return (
            <div key={p.dayKey} className="flex h-full min-w-[5px] flex-1 items-end justify-center">
              <div
                data-punch-bar
                data-full={p.isFullAttendance ? "true" : "false"}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                className={`w-full max-w-[1rem] cursor-default rounded-[0.3rem] border-[1.5px] border-[#111827] ${
                  p.isFullAttendance
                    ? "bg-[#fde047] shadow-[0_2px_0_0_rgba(17,24,39,0.25)]"
                    : "bg-[#fde047]/45"
                } ${isActive ? "ring-2 ring-[#111827]/70 ring-offset-1" : ""}`}
                style={{ height: `${heightPct}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex gap-[3px] text-[0.55rem] font-bold text-[#94a3b8]">
        {points.map((p, i) => (
          <span key={p.dayKey} className="min-w-[5px] flex-1 text-center">
            {tickIndices.has(i) ? formatAxisLabel(p.dayKey) : ""}
          </span>
        ))}
      </div>
    </ChartPanel>
  );
}

/** 顶部数值标签：日期 + 大号数值 + 单位 + 可选徽章 */
function ValueLabel({
  date,
  value,
  unit,
  badge,
}: {
  date: string;
  value: number;
  unit: string;
  badge?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 self-start rounded-full border-2 border-[#111827] bg-white px-2.5 py-[3px] text-[0.7rem] font-extrabold text-[#1f2937] shadow-[0_2px_0_0_#111827]">
      <span className="text-[#64748b]">{date}</span>
      <span className="text-[1rem] font-black leading-none text-[#1f2937]">{value}</span>
      <span className="text-[#64748b]">{unit}</span>
      {badge && (
        <span className="rounded-full bg-[#fde047] px-1.5 text-[0.6rem] text-[#1f2937]">{badge}</span>
      )}
    </div>
  );
}

/** 选最多 5 个刻度位置，柱子少时全标 */
function pickTickIndices(length: number): Set<number> {
  if (length <= 5) {
    return new Set(length > 0 ? Array.from({ length }, (_, i) => i) : []);
  }
  return new Set([
    0,
    Math.round(length * 0.25),
    Math.round(length * 0.5),
    Math.round(length * 0.75),
    length - 1,
  ]);
}
