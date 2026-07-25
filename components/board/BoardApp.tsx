"use client";

import {
  DynamicDataDashboard,
  DynamicDrinkCheckin,
  DynamicSharedBoard,
} from "@/components/board/dynamic-tabs";
import { Navbar } from "@/components/navbar/Navbar";
import { PunchBoard } from "@/components/punch-board/PunchBoard";
import { DrinkProvider } from "@/lib/drink-store";
import type { AppTab } from "@/lib/types";

type DataDashboardView = "personal" | "team";

export function BoardApp({
  activeTab,
  initialDataView = "personal",
}: {
  activeTab: AppTab;
  initialDataView?: DataDashboardView;
}) {
  const activeContent = (() => {
    switch (activeTab) {
      case "punch":
        return <PunchBoard />;
      case "board":
        return <DynamicSharedBoard isActive={activeTab === "board"} />;
      case "coffee":
        return <DynamicDrinkCheckin />;
      case "data":
        return <DynamicDataDashboard initialView={initialDataView} />;
      default:
        return <PunchBoard />;
    }
  })();

  const pageShell = (
    <>
      <Navbar
        activeTabOverride={activeTab}
      />
      <div className="board-tab-stage flex-1 w-full relative overflow-hidden">
        <div className="board-tab-panel board-tab-panel-active absolute inset-0 opacity-100 transition-opacity duration-300">
          {activeContent}
        </div>
      </div>
    </>
  );

  if (activeTab === "coffee" || activeTab === "data") {
    return <DrinkProvider>{pageShell}</DrinkProvider>;
  }

  return pageShell;
}
