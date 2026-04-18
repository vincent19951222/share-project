"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";

export function ReportHeader() {
  return (
    <div className="flex justify-between items-end mb-4 relative z-10">
      <div>
        <h1 className="text-4xl font-black tracking-tight">OCTOBER REPORT</h1>
        <p className="text-sub font-bold mt-1 flex items-center gap-2">
          10月团队荣誉战报
          <span dangerouslySetInnerHTML={{ __html: SvgIcons.medal }} />
        </p>
      </div>
      <div className="text-right">
        <div className="text-xs font-bold text-sub">TEAM SCORE</div>
        <div className="text-3xl font-black text-yellow-500">+12,450</div>
      </div>
    </div>
  );
}
