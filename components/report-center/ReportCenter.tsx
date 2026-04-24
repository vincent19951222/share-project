"use client";

import { useMemo } from "react";
import { useCoffee } from "@/lib/coffee-store";
import { useBoard } from "@/lib/store";
import { ReportHeader } from "./ReportHeader";
import { Milestones } from "./Milestones";
import { CoffeeReportPanel } from "./CoffeeReportPanel";
import { TrendChart } from "./TrendChart";
import { buildReportData } from "./report-data";

export function ReportCenter() {
  const { state } = useBoard();
  const coffeeState = useCoffee();
  const report = useMemo(
    () => buildReportData(state, new Date(), coffeeState.snapshot),
    [coffeeState.snapshot, state],
  );

  return (
    <div className="report-board absolute inset-0 flex flex-col gap-5 overflow-y-auto p-4 transition-opacity duration-300 sm:p-6">
      <ReportHeader title={report.title} summary={report.summary} teamVault={report.teamVault} />
      <Milestones metrics={report.metrics} />
      <div className="grid grid-cols-1 gap-4 pb-2 xl:grid-cols-3">
        <TrendChart dailyPoints={report.dailyPoints} peakDay={report.peakDay} lowDay={report.lowDay} />
        <CoffeeReportPanel
          coffee={report.coffee}
          loading={!coffeeState.snapshot && !coffeeState.error}
          error={coffeeState.error}
        />
      </div>
    </div>
  );
}
