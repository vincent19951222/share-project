"use client";

import { SvgIcons } from "@/components/ui/SvgIcons";

export function Highlights() {
  return (
    <div className="col-span-1 flex flex-col gap-4">
      <div className="bg-blue-50 border-4 border-blue-100 rounded-[1.5rem] p-5 flex-1 flex flex-col justify-center items-center text-center">
        <div className="w-10 h-10 mb-2 text-blue-500">
          <span dangerouslySetInnerHTML={{ __html: SvgIcons.megaphone }} />
        </div>
        <h3 className="font-black text-blue-900 text-lg">月度打气筒</h3>
        <p className="text-xs text-blue-700 font-bold mt-1">Bob 催促了 15 次！</p>
      </div>
      <div className="bg-purple-50 border-4 border-purple-100 rounded-[1.5rem] p-5 flex-1 flex flex-col justify-center items-center text-center">
        <div className="w-10 h-10 mb-2 text-purple-500">
          <span dangerouslySetInnerHTML={{ __html: SvgIcons.ice }} />
        </div>
        <h3 className="font-black text-purple-900 text-lg">早起破冰者</h3>
        <p className="text-xs text-purple-700 font-bold mt-1">Dave 18天首位打卡</p>
      </div>
    </div>
  );
}
