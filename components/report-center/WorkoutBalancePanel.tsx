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
 */
export function WorkoutBalancePanel({ items }: { items: TeamWorkoutBalanceItem[] }) {
  const maxCount = Math.max(1, ...items.map((i) => i.count));

  if (items.every((i) => i.count === 0)) {
    return (
      <ChartPanel chip="训练平衡" title="部位频次">
        <EmptyState message="暂无训练数据" />
      </ChartPanel>
    );
  }

  let strengthIndex = 0;

  return (
    <ChartPanel chip="训练平衡" title="部位频次">
      <div className="dashboard-balance-chart">
        {items.map((item) => {
          const isCardio = (CARDIO_ITEMS as readonly string[]).includes(item.code);
          const color = isCardio ? CARDIO_COLOR : STRENGTH_COLORS[strengthIndex % STRENGTH_COLORS.length];
          if (!isCardio) strengthIndex += 1;
          const heightPct =
            item.count <= 0 ? 0 : `${Math.max(12, (item.count / maxCount) * 100)}%`;

          return (
            <div key={item.code} className="dashboard-balance-item">
              <div className="dashboard-balance-track">
                <div
                  className="dashboard-balance-bar"
                  style={{ height: heightPct, backgroundColor: color }}
                  title={`${item.label}：${item.count} 次`}
                />
              </div>
              <span className="dashboard-balance-label">{item.label}</span>
              <span className="dashboard-balance-count">{item.count}</span>
            </div>
          );
        })}
      </div>
    </ChartPanel>
  );
}
