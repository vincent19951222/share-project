"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BoardTabLoadingShell } from "@/components/board/BoardTabLoadingShell";
import { loadDashboardBoard, loadReportCenter } from "@/components/board/tab-component-loaders";

export type DataDashboardView = "personal" | "team";

interface DataDashboardProps {
  initialView?: DataDashboardView;
}

const PersonalDashboardView = dynamic(loadDashboardBoard, {
  loading: () => <BoardTabLoadingShell label="我的日历加载中" />,
});

const TeamReportView = dynamic(loadReportCenter, {
  loading: () => <BoardTabLoadingShell label="团队战报加载中" />,
});

const tabs: Array<{ id: DataDashboardView; label: string; panelId: string }> = [
  { id: "personal", label: "我的日历", panelId: "data-dashboard-personal-panel" },
  { id: "team", label: "团队战报", panelId: "data-dashboard-team-panel" },
];

export function DataDashboard({ initialView = "personal" }: DataDashboardProps) {
  const [activeView, setActiveView] = useState<DataDashboardView>(initialView);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const activeTab = tabs.find((tab) => tab.id === activeView) ?? tabs[0];

  return (
    <section className="data-dashboard-shell flex h-full min-h-0 flex-col bg-slate-50">
      <div className="data-dashboard-chrome shrink-0 border-b-2 border-slate-800 bg-white px-4 py-3 shadow-[0_3px_0_0_#1f2937]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">数据看板</h1>
            <p className="text-sm font-bold text-slate-500">
              {activeView === "personal" ? "个人维度" : "团队维度"}
            </p>
          </div>
          <div
            aria-label="数据看板视图"
            className="inline-flex rounded-lg border-2 border-slate-800 bg-slate-100 p-1"
            role="tablist"
          >
            {tabs.map((tab) => {
              const selected = activeView === tab.id;

              return (
                <button
                  aria-controls={tab.panelId}
                  aria-selected={selected}
                  className={`rounded-md px-3 py-1.5 text-sm font-black transition-colors ${
                    selected ? "bg-yellow-300 text-slate-900 shadow-[0_2px_0_0_#1f2937]" : "text-slate-600 hover:bg-white"
                  }`}
                  data-dashboard-tab={tab.id}
                  id={`data-dashboard-${tab.id}-tab`}
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  role="tab"
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        aria-labelledby={`data-dashboard-${activeTab.id}-tab`}
        className="data-dashboard-content relative min-h-0 flex-1 overflow-auto"
        id={activeTab.panelId}
        role="tabpanel"
      >
        {activeView === "personal" ? <PersonalDashboardView /> : <TeamReportView />}
      </div>
    </section>
  );
}
