"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";
import type { ReportData } from "./report-data";

interface ReportHeaderProps {
  title: string;
  summary: string;
  teamVault: ReportData["teamVault"];
}

export function ReportHeader({ title, summary, teamVault }: ReportHeaderProps) {
  return (
    <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="report-hero">
        <div className="report-chip">本月战况</div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-main sm:text-5xl">{title}</h1>
        <p className="mt-2 flex items-center gap-2 font-bold leading-relaxed text-sub">
          {summary}
          <span className="h-5 w-5 shrink-0" dangerouslySetInnerHTML={{ __html: SvgIcons.medal }} />
        </p>
      </div>
      <div className="report-vault-card min-w-48 lg:max-w-xs lg:text-right">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sub">牛马金库</div>
        <div className="mt-2 text-4xl font-black text-yellow-500">
          {teamVault.current.toLocaleString("zh-CN")}
        </div>
        <div className="mt-3 text-sm font-bold text-main">{teamVault.helper}</div>
        <div className="mt-1 text-xs font-bold text-sub">团队累计银子总和，不和冲刺条混着算。</div>
      </div>
    </div>
  );
}
