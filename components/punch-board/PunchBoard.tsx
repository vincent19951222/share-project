"use client";

import { TeamHeader } from "./TeamHeader";
import { HeatmapGrid } from "./HeatmapGrid";
import { ActivityStream } from "./ActivityStream";

export function PunchBoard() {
  return (
    <div className="punch-board-shell absolute inset-0 flex flex-col gap-4 transition-opacity duration-300">
      <TeamHeader />
      <HeatmapGrid />
      <ActivityStream />
    </div>
  );
}
