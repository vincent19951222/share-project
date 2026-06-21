"use client";

import { useState } from "react";
import { CARDIO_ITEMS } from "@/lib/workouts";
import type { TeamWorkoutBalanceItem } from "@/lib/types";
import { ChartPanel } from "./ChartPanel";
import { EmptyState } from "./EmptyState";

const STRENGTH_COLORS = ["#fde047", "#facc15", "#eab308", "#ca8a04", "#fde047", "#facc15", "#eab308"];
const CARDIO_COLOR = "#22d3ee";

/**
 * 团队训练部位均衡。
 * 镜像个人看板 WorkoutBalanceChart：垂直 div 柱，力量按黄色梯度、有氧青色。
 * 从 code 反推 category（TeamWorkoutBalanceItem 不带 category 字段）。
 * 顶部共享 hover 标签：默认显示最高项，hover 任一柱切换到该部位（部位 · N 次 · 占 X%）。
 */
export function WorkoutBalancePanel({ items }: { items: TeamWorkoutBalanceItem[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const maxCount = Math.max(1, ...items.map((i) => i.count));
  const totalCount = items.reduce((sum, i) => sum + i.count, 0);

  if (items.every((i) => i.count === 0)) {
    return (
      <ChartPanel chip="训练平衡" title="部位频次">
        <EmptyState message="暂无训练数据" />
      </ChartPanel>
    );
  }

  // 默认 = 次数最多的部位
  const defaultIdx = items.reduce((best, item, i) => (item.count > items[best].count ? i : best), 0);
  const activeIdx = hoverIdx ?? defaultIdx;
  const active = items[activeIdx];
  const activePct = totalCount > 0 ? Math.round((active.count / totalCount) * 100) : 0;

  let strengthIndex = 0;

  return (
    <ChartPanel chip="训练平衡" title="部位频次">
      <div className="inline-flex items-center gap-1.5 self-start rounded-full border-2 border-[#111827] bg-white px-2.5 py-[3px] text-[0.7rem] font-extrabold text-[#1f2937] shadow-[0_2px_0_0_#111827]">
        <span className="text-[#64748b]">{active.label}</span>
        <span className="text-[1rem] font-black leading-none text-[#1f2937]">{active.count}</span>
        <span className="text-[#64748b]">次 · {activePct}%</span>
      </div>

      <div className="report-balance-body">
        <div className="dashboard-balance-chart" style={{ height: "auto" }}>
          {items.map((item, i) => {
            const isCardio = (CARDIO_ITEMS as readonly string[]).includes(item.code);
            const color = isCardio ? CARDIO_COLOR : STRENGTH_COLORS[strengthIndex % STRENGTH_COLORS.length];
            if (!isCardio) strengthIndex += 1;
            const heightPct =
              item.count <= 0 ? 0 : `${Math.max(12, (item.count / maxCount) * 100)}%`;
            const isActive = i === activeIdx;

            return (
              <div key={item.code} className="dashboard-balance-item" style={{ flex: 1 }}>
                <div
                  className="dashboard-balance-track"
                  // 固定高度基准，让柱子的百分比 height 能正确解析
                  style={{ height: "8rem" }}
                >
                  <div
                    className={`dashboard-balance-bar ${isActive ? "ring-2 ring-[#111827]/70 ring-offset-1" : ""}`}
                    style={{ height: heightPct, backgroundColor: color }}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                  />
                </div>
                <span className="dashboard-balance-label">{item.label}</span>
                <span className="dashboard-balance-count">{item.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </ChartPanel>
  );
}
