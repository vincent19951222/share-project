"use client";

import type { ReportMetric } from "./report-data";

interface MilestonesProps {
  metrics: ReportMetric[];
}

const toneClasses: Record<ReportMetric["tone"], string> = {
  plain: "bg-white border-slate-200 text-slate-900",
  good: "bg-green-50 border-green-200 text-green-900",
  warm: "bg-yellow-50 border-yellow-300 text-yellow-900",
};

const helperClasses: Record<ReportMetric["tone"], string> = {
  plain: "text-sub",
  good: "text-green-700",
  warm: "text-yellow-700",
};

export function Milestones({ metrics }: MilestonesProps) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className={`flex min-h-32 flex-col justify-between rounded-[1rem] border-4 p-4 shadow-sm ${toneClasses[metric.tone]}`}
        >
          <div className="text-xs font-black tracking-wide text-sub">{metric.label}</div>
          <div className="mt-2 break-words text-3xl font-black">{metric.value}</div>
          <p className={`mt-2 text-xs font-bold leading-relaxed ${helperClasses[metric.tone]}`}>{metric.helper}</p>
        </article>
      ))}
    </section>
  );
}
