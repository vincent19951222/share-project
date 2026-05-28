"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import { CoffeeCheckin } from "@/components/coffee-checkin/CoffeeCheckin";
import { SupplyStation } from "@/components/gamification/SupplyStation";
import { Navbar } from "@/components/navbar/Navbar";
import { PunchBoard } from "@/components/punch-board/PunchBoard";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { SharedBoard } from "@/components/shared-board/SharedBoard";
import { appTabRoutes, supplyPanelRoutes, type SupplyPanelKey } from "@/lib/navigation-routes";
import { CoffeeProvider } from "@/lib/coffee-store";
import { useBoard } from "@/lib/store";
import type { AppTab } from "@/lib/types";

export function BoardApp({
  activeTab,
  supplyPanel = "dashboard",
}: {
  activeTab: AppTab;
  supplyPanel?: SupplyPanelKey;
}) {
  const { state, dispatch } = useBoard();
  const router = useRouter();

  useEffect(() => {
    if (state.activeTab !== activeTab) {
      dispatch({ type: "SET_TAB", tab: activeTab });
    }
  }, [activeTab, dispatch, state.activeTab]);

  const activeContent = (() => {
    switch (activeTab) {
      case "punch":
        return <PunchBoard />;
      case "board":
        return <SharedBoard />;
      case "coffee":
        return <CoffeeCheckin />;
      case "supply":
        return (
          <SupplyStation
            initialPanel={supplyPanel}
            onBackToPunch={() => router.push(appTabRoutes.punch)}
            onPanelChange={(panel) => router.push(supplyPanelRoutes[panel])}
          />
        );
      case "calendar":
        return <CalendarBoard />;
      case "dash":
        return <ReportCenter />;
      default:
        return <PunchBoard />;
    }
  })();

  const pageShell = (
    <>
      {activeTab === "supply" ? null : <Navbar activeTabOverride={activeTab} />}
      <div className="board-tab-stage flex-1 w-full relative overflow-hidden">
        <div className="board-tab-panel board-tab-panel-active absolute inset-0 opacity-100 transition-opacity duration-300">
          {activeContent}
        </div>
      </div>
    </>
  );

  if (activeTab === "coffee" || activeTab === "dash") {
    return <CoffeeProvider>{pageShell}</CoffeeProvider>;
  }

  return pageShell;
}
