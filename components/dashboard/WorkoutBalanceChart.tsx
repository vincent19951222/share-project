"use client";

import type { WorkoutBalanceItem } from "@/lib/types";
import { getBarHeight } from "./dashboard-data";

interface WorkoutBalanceChartProps {
  items: WorkoutBalanceItem[];
}

const strengthColors = [
  "#fde047",
  "#facc15",
  "#eab308",
  "#ca8a04",
  "#fde047",
  "#facc15",
  "#eab308",
];

export function WorkoutBalanceChart({ items }: WorkoutBalanceChartProps) {
  const maxCount = Math.max(1, ...items.map((item) => item.count));

  return (
    <section className="dashboard-chart-panel">
      <div className="dashboard-chart-heading">
        <span className="dashboard-chart-chip">训练平衡</span>
        <h2 className="dashboard-chart-title">部位频次</h2>
      </div>
      <div className="dashboard-balance-chart">
        {items.map((item, index) => {
          const isCardio = item.category === "cardio";
          const color = isCardio ? "#22d3ee" : strengthColors[index % strengthColors.length];

          return (
            <div key={item.code} className="dashboard-balance-item">
              <div className="dashboard-balance-track">
                <div
                  className="dashboard-balance-bar"
                  style={{
                    height: getBarHeight(item.count, maxCount),
                    backgroundColor: color,
                  }}
                  title={`${item.label}: ${item.count} 次`}
                />
              </div>
              <span className="dashboard-balance-label">{item.label}</span>
              <span className="dashboard-balance-count">{item.count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
