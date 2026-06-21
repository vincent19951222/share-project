"use client";

import type { DashboardPeriod } from "@/lib/types";

const OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: "month", label: "本月" },
  { value: "year", label: "本年" },
];

export function PeriodSwitcher({
  period,
  onChange,
}: {
  period: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg border-2 border-[#1f2937] bg-white p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-md px-3 py-1 text-sm font-bold transition-colors ${
            period === opt.value
              ? "bg-[#fde047] text-[#1f2937]"
              : "text-[#1f2937] hover:bg-[#fde047]/40"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
