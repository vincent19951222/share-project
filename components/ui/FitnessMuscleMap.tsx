"use client";

import type { StrengthPart } from "@/lib/workouts";

type FitnessMuscleMapProps = {
  cardioActive: boolean;
  selectedParts: StrengthPart[];
};

const muscleMapSrc = "/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.png";

export function FitnessMuscleMap(_props: FitnessMuscleMapProps) {
  return (
    <div className="fitness-ticket-muscle-map">
      <img className="fitness-ticket-muscle-image" src={muscleMapSrc} alt="今日训练部位肌肉图" />
    </div>
  );
}
