"use client";

import { TeamHeader } from "./TeamHeader";
import { HeatmapGrid } from "./HeatmapGrid";
import { ActivityStream } from "./ActivityStream";

export function PunchBoard() {
  return (
    <section
      className="punch-board-shell punch-scene absolute inset-0 flex flex-col gap-4 transition-opacity duration-300"
      aria-label="健身打卡训练室"
    >
      <div className="punch-scene-background" aria-hidden="true">
        <img
          src="/assets/home-scenes/punch/gym-wall-bg.webp"
          alt=""
          className="punch-scene-wall"
        />
        <img
          src="/assets/home-scenes/punch/gym-floor-strip.webp"
          alt=""
          className="punch-scene-floor"
        />
      </div>
      <div className="punch-scene-props" aria-hidden="true">
        <img
          src="/assets/home-scenes/punch/poster-no-pain.webp"
          alt=""
          className="punch-scene-poster punch-scene-poster-left"
        />
        <img
          src="/assets/home-scenes/punch/poster-believe.webp"
          alt=""
          className="punch-scene-poster punch-scene-poster-right"
        />
        <img
          src="/assets/home-scenes/punch/stopwatch-keep-going.webp"
          alt=""
          className="punch-scene-stopwatch"
        />
        <img
          src="/assets/home-scenes/punch/dumbbell-corner.webp"
          alt=""
          className="punch-scene-dumbbell"
        />
        <img
          src="/assets/home-scenes/punch/towel-bar.webp"
          alt=""
          className="punch-scene-towel"
        />
      </div>
      <div className="punch-scene-content relative z-10 flex min-h-0 flex-1 flex-col gap-4">
        <TeamHeader />
        <HeatmapGrid />
        <ActivityStream />
      </div>
    </section>
  );
}
