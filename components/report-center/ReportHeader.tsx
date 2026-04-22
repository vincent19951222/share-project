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
      <div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 flex items-center gap-2 font-bold leading-relaxed text-sub">
          {summary}
          <span className="h-5 w-5 shrink-0" dangerouslySetInnerHTML={{ __html: SvgIcons.medal }} />
        </p>
      </div>
      <div className="min-w-48 lg:text-right">
        <div className="text-xs font-bold text-sub">牛马金库</div>
        <div className="text-3xl font-black text-yellow-500">
          {teamVault.current.toLocaleString("zh-CN")}
          <span className="text-base text-slate-300">/{teamVault.target.toLocaleString("zh-CN")}</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 lg:ml-auto lg:w-44">
          <div
            className="h-full border-r-2 border-slate-800 bg-yellow-300 transition-all duration-500"
            style={{ width: `${teamVault.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
