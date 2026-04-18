"use client";

import { ReportHeader } from "./ReportHeader";
import { Milestones } from "./Milestones";
import { Highlights } from "./Highlights";
import { TrendChart } from "./TrendChart";

export function ReportCenter() {
  return (
    <div className="absolute inset-0 flex flex-col gap-4 transition-opacity duration-300 bg-white soft-card p-6 overflow-y-auto">
      <ReportHeader />
      <div className="grid grid-cols-3 gap-4 flex-1">
        <Milestones />
        <Highlights />
        <TrendChart />
      </div>
    </div>
  );
}
