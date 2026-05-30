"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import { REPORT_METRIC_IDS, type ReportData } from "./report-data";

interface ReportHeaderProps {
  title: string;
  summary: string;
  teamVault: ReportData["teamVault"];
  metrics: ReportData["metrics"];
}

export function ReportHeader({ title, summary, teamVault, metrics }: ReportHeaderProps) {
  const completionMetric = metrics.find((metric) => metric.id === REPORT_METRIC_IDS.completionRate);
  const totalPunchMetric = metrics.find((metric) => metric.id === REPORT_METRIC_IDS.totalPunches);

  return (
    <section className="report-header-strip relative overflow-hidden rounded-[1.75rem] border-[3px] border-slate-900 bg-[#fffdf7] px-5 py-5 shadow-[0_10px_0_0_#111827] sm:px-6 sm:py-6 lg:px-8">
      <div className="absolute inset-x-0 top-0 h-6 bg-[linear-gradient(90deg,_rgba(252,211,77,0.18),_rgba(248,113,113,0.18),_rgba(59,130,246,0.12))]" />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)] lg:items-stretch">
        <div className="report-header-copy flex min-w-0 flex-col justify-between gap-5">
          <div>
            <div className="inline-flex rounded-full border-2 border-slate-900 bg-[#ef4444] px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-white">
              本月战况
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-main sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 flex max-w-3xl items-start gap-2 font-bold leading-relaxed text-sub">
              <span
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0"
                dangerouslySetInnerHTML={{ __html: SvgIcons.medal }}
              />
              <span>{summary}</span>
            </p>
          </div>
          <div className="report-header-decor-row flex flex-wrap items-end gap-3">
            <img
              src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_keep_going_stamp.webp"
              alt=""
              aria-hidden="true"
              className="report-header-stamp h-16 w-auto shrink-0 rotate-[-6deg] select-none sm:h-20"
            />
            <img
              src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_mini_chart_slip.webp"
              alt=""
              aria-hidden="true"
              className="report-header-mini-chart h-[4.5rem] w-auto shrink-0 rotate-[5deg] select-none sm:h-24"
            />
            <div className="flex flex-1 flex-wrap gap-2">
              {completionMetric ? (
                <div
                  className="report-header-pill rounded-2xl border-2 border-slate-900 bg-[#dcfce7] px-3 py-2 text-sm font-black text-slate-900"
                  data-metric-id={completionMetric.id}
                >
                  {completionMetric.label} {completionMetric.value}
                </div>
              ) : null}
              {totalPunchMetric ? (
                <div
                  className="report-header-pill rounded-2xl border-2 border-slate-900 bg-[#fef3c7] px-3 py-2 text-sm font-black text-slate-900"
                  data-metric-id={totalPunchMetric.id}
                >
                  {totalPunchMetric.label} {totalPunchMetric.value}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="report-header-vault relative flex min-h-full flex-col justify-between rounded-[1.5rem] border-[3px] border-slate-900 bg-[#ffe16a] p-5 text-left shadow-[0_8px_0_0_#111827] lg:text-right">
          <div className="flex items-start justify-between gap-4 lg:flex-row-reverse">
            <img
              src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_vault_safe_yellow.webp"
              alt=""
              aria-hidden="true"
              className="h-20 w-auto shrink-0 rotate-[4deg] select-none sm:h-24"
            />
            <div className="min-w-0">
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-700">牛马金库</div>
              <div className="mt-2 text-4xl font-black text-slate-900 sm:text-5xl">
                {teamVault.current.toLocaleString("zh-CN")}
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-base font-black text-main">{teamVault.helper}</div>
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">
              Vault stays separate from the sprint math.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
