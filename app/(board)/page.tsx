"use client";

import { useEffect, useState } from "react";
import { useBoard } from "@/lib/store";
import { Navbar } from "@/components/navbar/Navbar";
import { PunchBoard } from "@/components/punch-board/PunchBoard";
import { SharedBoard } from "@/components/shared-board/SharedBoard";
import { CoffeeCheckin } from "@/components/coffee-checkin/CoffeeCheckin";
import { ReportCenter } from "@/components/report-center/ReportCenter";
import { CalendarBoard } from "@/components/calendar/CalendarBoard";

export default function Home() {
  const { state } = useBoard();
  const [hasVisitedCalendar, setHasVisitedCalendar] = useState(false);
  const shouldRenderCalendar = state.activeTab === "calendar" || hasVisitedCalendar;

  useEffect(() => {
    if (state.activeTab === "calendar") {
      setHasVisitedCalendar(true);
    }
  }, [state.activeTab]);

  return (
    <>
      <Navbar />
      <div className="flex-1 w-full relative overflow-hidden">
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            state.activeTab === "punch" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <PunchBoard />
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            state.activeTab === "board" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <SharedBoard />
        </div>
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            state.activeTab === "coffee" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <CoffeeCheckin />
        </div>
        {shouldRenderCalendar ? (
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              state.activeTab === "calendar" ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <CalendarBoard />
          </div>
        ) : null}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            state.activeTab === "dash" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <ReportCenter />
        </div>
      </div>
    </>
  );
}
