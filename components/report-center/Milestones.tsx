"use client";

import type { ReportMetric } from "./report-data";

interface MilestonesProps {
  metrics: ReportMetric[];
}

const toneClasses: Record<ReportMetric["tone"], string> = {
  plain: "bg-white text-slate-900",
  good: "bg-emerald-50 text-emerald-900",
  warm: "bg-yellow-100 text-yellow-900",
};

const helperClasses: Record<ReportMetric["tone"], string> = {
  plain: "text-sub",
  good: "text-emerald-700",
  warm: "text-yellow-800",
};

export function Milestones({ metrics }: MilestonesProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className={`report-metric-card flex min-h-36 flex-col justify-between p-5 ${toneClasses[metric.tone]}`}
        >
          <div className="report-metric-label">{metric.label}</div>
          <div className="mt-3 break-words text-4xl font-black leading-none">{metric.value}</div>
          <p className={`mt-3 text-sm font-bold leading-relaxed ${helperClasses[metric.tone]}`}>{metric.helper}</p>
        </article>
      ))}
    </section>
  );
}
