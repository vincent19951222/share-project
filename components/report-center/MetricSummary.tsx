import type { TeamMetrics } from "@/lib/types";
import type { DashboardPeriod } from "@/lib/types";

function pct(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function MetricSummary({
  metrics,
}: {
  metrics: TeamMetrics;
  period: DashboardPeriod;
}) {
  const cards = [
    { label: "完成率", value: pct(metrics.completionRate) },
    { label: "总打卡", value: String(metrics.totalPunches) },
    { label: "全勤日", value: String(metrics.fullAttendanceDays) },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="soft-card flex flex-col items-center justify-center p-4">
          <span className="text-2xl font-extrabold text-main">{c.value}</span>
          <span className="mt-1 text-sm text-sub">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
