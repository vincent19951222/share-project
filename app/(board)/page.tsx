"use client";

import { useEffect, useState } from "react";
import { useBoard } from "@/lib/store";
import { Navbar } from "@/components/navbar/Navbar";
import { PunchBoard } from "@/components/punch-board/PunchBoard";
import { SharedBoard } from "@/components/shared-board/SharedBoard";
import { CoffeeCheckin } from "@/components/coffee-checkin/CoffeeCheckin";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";
import { SupplyStation } from "@/components/gamification/SupplyStation";
import { CoffeeProvider } from "@/lib/coffee-store";

export default function Home() {
  const { state } = useBoard();
  const [hasVisitedCalendar, setHasVisitedCalendar] = useState(false);
  const [hasVisitedSupply, setHasVisitedSupply] = useState(false);
  const shouldRenderCalendar = state.activeTab === "calendar" || hasVisitedCalendar;
  const shouldRenderSupply = state.activeTab === "supply" || hasVisitedSupply;

  useEffect(() => {
    if (state.activeTab === "calendar") {
      setHasVisitedCalendar(true);
    }
    if (state.activeTab === "supply") {
      setHasVisitedSupply(true);
    }
  }, [state.activeTab]);

  return (
    <CoffeeProvider>
      <Navbar />
      <div className="board-tab-stage flex-1 w-full relative overflow-hidden">
        <div
          className={`board-tab-panel absolute inset-0 transition-opacity duration-300 ${
            state.activeTab === "punch" ? "board-tab-panel-active opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <PunchBoard />
        </div>
        <div
          className={`board-tab-panel absolute inset-0 transition-opacity duration-300 ${
            state.activeTab === "board" ? "board-tab-panel-active opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <SharedBoard />
        </div>
        <div
          className={`board-tab-panel absolute inset-0 transition-opacity duration-300 ${
            state.activeTab === "coffee" ? "board-tab-panel-active opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <CoffeeCheckin />
        </div>
        {shouldRenderSupply ? (
          <div
            className={`board-tab-panel absolute inset-0 transition-opacity duration-300 ${
              state.activeTab === "supply" ? "board-tab-panel-active opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <SupplyStation />
          </div>
        ) : null}
        {shouldRenderCalendar ? (
          <div
            className={`board-tab-panel absolute inset-0 transition-opacity duration-300 ${
              state.activeTab === "calendar" ? "board-tab-panel-active opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <CalendarBoard />
          </div>
        ) : null}
        <div
          className={`board-tab-panel absolute inset-0 transition-opacity duration-300 ${
            state.activeTab === "dash" ? "board-tab-panel-active opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <ReportCenter />
        </div>
      </div>
    </CoffeeProvider>
  );
}
