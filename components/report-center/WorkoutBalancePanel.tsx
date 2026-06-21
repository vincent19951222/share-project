import type { TeamWorkoutBalanceItem } from "@/lib/types";
import { EmptyState } from "./EmptyState";

export function WorkoutBalancePanel({ items }: { items: TeamWorkoutBalanceItem[] }) {
  const max = Math.max(...items.map((i) => i.count), 0);
  const min = Math.min(...items.map((i) => i.count));

  if (max === 0) {
    return (
      <div className="soft-card p-4">
        <h3 className="mb-2 text-sm font-bold text-main">团队训练部位均衡</h3>
        <EmptyState message="暂无训练数据" />
      </div>
    );
  }

  // 最薄弱项 = count === min 且 min < max（避免全相等时误标）
  const weakestCode = min < max ? items.find((i) => i.count === min)?.code : undefined;

  return (
    <div className="soft-card p-4">
      <h3 className="mb-2 text-sm font-bold text-main">团队训练部位均衡</h3>
      <div className="space-y-2">
        {items.map((i) => {
          const isMax = i.count === max;
          const isWeakest = i.code === weakestCode;
          const widthPct = (i.count / max) * 100;
          return (
            <div key={i.code} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-xs text-sub">{i.label}</span>
              <div className="h-4 flex-1 rounded border border-[#1f2937]/30 bg-[#f3f4f6]">
                <div
                  className={`h-full rounded ${isMax ? "bg-[#fde047]" : "bg-[#fbbf24]/60"}`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className={`w-8 shrink-0 text-right text-xs ${isWeakest ? "text-sub" : "text-main"}`}>
                {i.count}
              </span>
              {isWeakest && <span className="text-[10px] text-sub">最薄弱</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
