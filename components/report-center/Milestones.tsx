"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import { REPORT_METRIC_IDS, type ReportMetric, type ReportMetricId } from "./report-data";

interface MilestonesProps {
  metrics: ReportMetric[];
}

const metricStyles: Record<
  ReportMetricId,
  {
    accent: string;
    panel: string;
    icon: string;
    iconSvg: string;
  }
> = {
  [REPORT_METRIC_IDS.completionRate]: {
    accent: "bg-emerald-300",
    panel: "bg-emerald-50 text-emerald-950",
    icon: "bg-emerald-200 text-emerald-900",
    iconSvg: SvgIcons.target,
  },
  [REPORT_METRIC_IDS.totalPunches]: {
    accent: "bg-sky-300",
    panel: "bg-sky-50 text-sky-950",
    icon: "bg-sky-200 text-sky-900",
    iconSvg: SvgIcons.chart,
  },
  [REPORT_METRIC_IDS.perfectDays]: {
    accent: "bg-amber-300",
    panel: "bg-amber-50 text-amber-950",
    icon: "bg-amber-200 text-amber-900",
    iconSvg: SvgIcons.medal,
  },
  [REPORT_METRIC_IDS.monthlyHighlight]: {
    accent: "bg-rose-300",
    panel: "bg-rose-50 text-rose-950",
    icon: "bg-rose-200 text-rose-900",
    iconSvg: SvgIcons.trophy,
  },
};

const fallbackStyles = {
  accent: "bg-slate-300",
  panel: "bg-white text-slate-900",
  icon: "bg-slate-200 text-slate-900",
  iconSvg: SvgIcons.box,
};

export function Milestones({ metrics }: MilestonesProps) {
  return (
    <section className="report-scene-metrics report-milestones grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => {
        const styles = metricStyles[metric.id] ?? fallbackStyles;

        return (
          <article
            key={metric.id}
            data-metric-id={metric.id}
            className={`report-metric-tile flex min-h-32 overflow-hidden rounded-[1.5rem] border-[3px] border-slate-900 shadow-[0_8px_0_0_#111827] ${styles.panel}`}
          >
            <div
              className={`report-metric-accent flex w-24 shrink-0 flex-col items-center justify-center gap-3 border-r-[3px] border-slate-900 px-3 py-4 ${styles.accent}`}
            >
              <span
                aria-hidden="true"
                className={`report-metric-icon flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-slate-900 ${styles.icon}`}
                dangerouslySetInnerHTML={{ __html: styles.iconSvg }}
              />
              <span className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-700">
                Metric
              </span>
            </div>
            <div className="report-metric-body flex min-w-0 flex-1 flex-col justify-between gap-3 p-4">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                {metric.label}
              </div>
              <div className="break-words text-4xl font-black leading-none text-slate-950">
                {metric.value}
              </div>
              <p className="text-sm font-bold leading-relaxed text-slate-700">{metric.helper}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}
