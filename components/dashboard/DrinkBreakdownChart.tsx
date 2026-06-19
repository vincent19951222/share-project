"use client";

import type { DrinkBreakdownItem } from "@/lib/types";
import { getBarHeight } from "./dashboard-data";

interface DrinkBreakdownChartProps {
  items: DrinkBreakdownItem[];
}

export function DrinkBreakdownChart({ items }: DrinkBreakdownChartProps) {
  const maxCount = Math.max(1, ...items.map((item) => item.count));

  return (
    <section className="dashboard-chart-panel">
      <div className="dashboard-chart-heading">
        <span className="dashboard-chart-chip">饮品构成</span>
        <h2 className="dashboard-chart-title">喝些什么</h2>
      </div>
      <div className="dashboard-drink-breakdown">
        {items.map((item) => (
          <div key={item.type} className="dashboard-drink-breakdown-item">
            <div className="dashboard-drink-breakdown-info">
              <span
                className="dashboard-drink-breakdown-dot"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="dashboard-drink-breakdown-label">{item.label}</span>
              <span className="dashboard-drink-breakdown-count">{item.count}</span>
            </div>
            <div className="dashboard-drink-breakdown-track">
              <div
                className="dashboard-drink-breakdown-bar"
                style={{
                  width: getBarHeight(item.count, maxCount),
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
