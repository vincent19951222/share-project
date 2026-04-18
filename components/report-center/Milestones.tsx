"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";

export function Milestones() {
  return (
    <div className="col-span-2 bg-slate-50 border-4 border-slate-100 rounded-[1.5rem] p-6 flex flex-col justify-between relative overflow-hidden">
      <div className="absolute -right-6 -bottom-6 w-48 h-48 opacity-20 rotate-[-15deg] text-slate-400">
        <span dangerouslySetInnerHTML={{ __html: SvgIcons.burger }} />
      </div>
      <h2 className="text-xl font-black mb-2 relative z-10">MILESTONES / 团队里程碑</h2>
      <div className="mt-4 relative z-10">
        <p className="text-sub font-bold text-sm">本月全员共同燃烧热量，相当于消耗了...</p>
        <div className="text-6xl font-black text-orange-500 mt-2">50 个巨无霸汉堡!</div>
      </div>
      <div className="mt-6 flex gap-4 relative z-10">
        <div className="bg-white border-2 border-slate-200 px-4 py-2 rounded-xl flex-1 shadow-sm">
          <div className="text-xs text-sub font-bold">总打卡次数</div>
          <div className="text-2xl font-black">124 次</div>
        </div>
        <div className="bg-white border-2 border-slate-200 px-4 py-2 rounded-xl flex-1 shadow-sm">
          <div className="text-xs text-sub font-bold">全勤天数</div>
          <div className="text-2xl font-black text-green-500">12 天</div>
        </div>
      </div>
    </div>
  );
}
