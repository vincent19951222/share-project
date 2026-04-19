"use client";

import { useBoard } from "@/lib/store";
import { Navbar } from "@/components/navbar/Navbar";
import { PunchBoard } from "@/components/punch-board/PunchBoard";
import { SharedBoard } from "@/components/shared-board/SharedBoard";
import { ReportCenter } from "@/components/report-center/ReportCenter";

export default function Home() {
  const { state } = useBoard();

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
            state.activeTab === "dash" ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <ReportCenter />
        </div>
      </div>
    </>
  );
}
