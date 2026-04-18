"use client";

export function TrendChart() {
  return (
    <div className="col-span-3 bg-white border-4 border-slate-100 rounded-[1.5rem] p-6 flex flex-col mt-2">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black">ACTIVITY TREND / 活跃趋势</h2>
        <span className="text-xs font-bold text-sub bg-slate-100 px-2 py-1 rounded">
          纵轴: 当日打卡人数 (0-5)
        </span>
      </div>
      <div className="w-full h-32 relative mt-2 bg-slate-50 border-2 border-slate-200 rounded-xl pt-4">
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="w-full h-full drop-shadow-md">
          <line x1="0" y1="20" x2="1000" y2="20" stroke="#e2e8f0" strokeDasharray="5,5" strokeWidth="2" />
          <line x1="0" y1="50" x2="1000" y2="50" stroke="#e2e8f0" strokeDasharray="5,5" strokeWidth="2" />
          <line x1="0" y1="80" x2="1000" y2="80" stroke="#e2e8f0" strokeDasharray="5,5" strokeWidth="2" />
          <polyline
            fill="none"
            stroke="#fde047"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="0,44 100,32 200,20 300,56 400,20 500,20 600,44 700,68 800,20 900,32 1000,20"
          />
          <circle cx="200" cy="20" r="8" fill="#1f2937" />
          <circle cx="400" cy="20" r="8" fill="#1f2937" />
          <circle cx="500" cy="20" r="8" fill="#1f2937" />
          <circle cx="800" cy="20" r="8" fill="#1f2937" />
          <circle cx="1000" cy="20" r="8" fill="#1f2937" />
        </svg>
        <div className="absolute inset-0 pointer-events-none flex justify-around items-end pb-1 px-4 text-[10px] font-bold text-slate-400">
          <span>10.01</span>
          <span>10.05</span>
          <span>10.10</span>
          <span>10.15</span>
          <span>10.20</span>
        </div>
      </div>
    </div>
  );
}
