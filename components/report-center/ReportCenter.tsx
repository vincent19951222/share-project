"use client";

import { useMemo } from "react";
import { useCoffee } from "@/lib/coffee-store";
import { useBoard } from "@/lib/store";
import { ReportHeader } from "./ReportHeader";
import { Milestones } from "./Milestones";
import { CoffeeReportPanel } from "./CoffeeReportPanel";
import { GamificationWeeklyReportPanel } from "./GamificationWeeklyReportPanel";
import { TrendChart } from "./TrendChart";
import { WeeklyReportAdminPanel } from "./WeeklyReportAdminPanel";
import { buildReportData } from "./report-data";

const reportSceneProps = [
  {
    src: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_binder_clip_left.webp",
    className: "left-4 top-2 w-20 sm:left-8 sm:w-24",
  },
  {
    src: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_discipline_note.webp",
    className: "left-0 top-28 hidden w-36 sm:block lg:w-40",
  },
  {
    src: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_no_excuses_note.webp",
    className: "right-3 top-10 hidden w-32 sm:block lg:w-36",
  },
  {
    src: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_bar_chart_note.webp",
    className: "right-2 top-72 hidden w-28 lg:block xl:w-32",
  },
  {
    src: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_stronger_stamp.webp",
    className: "bottom-28 left-3 hidden w-28 md:block lg:w-32",
  },
  {
    src: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_focus_marker.webp",
    className: "bottom-8 right-2 hidden w-36 md:block lg:w-40",
  },
] as const;

export function ReportCenter() {
  const { state } = useBoard();
  const coffeeState = useCoffee();
  const report = useMemo(
    () => buildReportData(state, new Date(), coffeeState.snapshot),
    [coffeeState.snapshot, state],
  );

  return (
    <div className="report-board absolute inset-0 overflow-y-auto transition-opacity duration-300">
      <div className="report-scene relative isolate min-h-full overflow-hidden rounded-[2rem] border-[3px] border-slate-900 bg-[#f7f3e8] shadow-[0_16px_0_0_#111827]">
        <div className="report-scene-background absolute inset-0">
          <img
            src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_report_editor_desk_bg.webp"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.82),_rgba(247,243,232,0.96)_60%)]" />
        </div>
        <div className="report-scene-props pointer-events-none absolute inset-0 z-0 overflow-hidden">
          {reportSceneProps.map((prop) => (
            <img
              key={prop.src}
              src={prop.src}
              alt=""
              aria-hidden="true"
              className={`absolute select-none ${prop.className}`}
            />
          ))}
        </div>
        <div className="report-scene-content relative z-10 flex min-h-full flex-col gap-5 p-4 sm:p-6 lg:p-8">
          <div className="report-scene-header">
            <ReportHeader
              title={report.title}
              summary={report.summary}
              teamVault={report.teamVault}
              metrics={report.metrics}
            />
          </div>
          <Milestones metrics={report.metrics} />
          <div className="report-scene-analysis grid grid-cols-1 gap-4 xl:grid-cols-3">
            <TrendChart
              dailyPoints={report.dailyPoints}
              monthNumber={report.monthNumber}
              peakDay={report.peakDay}
              lowDay={report.lowDay}
            />
            <CoffeeReportPanel
              coffee={report.coffee}
              loading={!coffeeState.snapshot && !coffeeState.error}
              error={coffeeState.error}
            />
          </div>
          <div className="report-scene-bottom">
            <GamificationWeeklyReportPanel isAdmin={state.currentUser?.isAdmin ?? false} />
          </div>
          {state.currentUser?.isAdmin ? (
            <div className="report-scene-admin">
              <WeeklyReportAdminPanel />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
