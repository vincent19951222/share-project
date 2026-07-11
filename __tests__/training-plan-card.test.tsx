import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingPlanCard } from "@/components/training-plan/TrainingPlanCard";
import type {
  TrainingPlanDaySnapshot,
  TrainingPlanSnapshot,
} from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function makeDay(
  overrides: Partial<TrainingPlanDaySnapshot> = {},
): TrainingPlanDaySnapshot {
  return {
    id: "day-1",
    dayKey: "2026-07-13",
    weekIndex: 1,
    weekday: 1,
    title: "全身基础 A",
    estimatedMinutes: 45,
    status: "today",
    workoutPayload: {
      trainingType: "strength",
      cardioItem: null,
      cardioItems: [],
      strengthParts: ["chest", "legs"],
      durationMinutes: 45,
    },
    exercises: Array.from({ length: 6 }, (_, index) => ({
      id: `exercise-${index + 1}`,
      exerciseId: `catalog-${index + 1}`,
      name: `动作 ${index + 1}`,
      bodyPart: "chest",
      equipment: "body weight",
      phase: index === 0 ? "warmup" : "main",
      sortOrder: index,
      plannedSets: index === 0 ? null : 3,
      plannedReps: index === 0 ? null : "8-10",
      plannedSeconds: index === 0 ? 60 : null,
      restSeconds: 60,
      beginnerTip: "动作放慢。",
      homeAlternativeExerciseId: null,
      homeAlternativeName: null,
      completed: false,
      actualWeightKg: null,
      actualReps: null,
    })),
    ...overrides,
  };
}

function makePlan(overrides: Partial<TrainingPlanSnapshot> = {}): TrainingPlanSnapshot {
  const todayDay = makeDay();
  return {
    id: "plan-1",
    templateId: "beginner-fat-loss-3d-45m",
    templateVersion: 1,
    status: "ACTIVE",
    startDayKey: "2026-07-13",
    endDayKey: "2026-08-09",
    currentWeekIndex: 1,
    todayDay,
    nextDay: todayDay,
    days: [todayDay],
    ...overrides,
  };
}

describe("TrainingPlanCard", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function render(plan: TrainingPlanSnapshot | null) {
    act(() => {
      root.render(
        <TrainingPlanCard plan={plan} onCreate={vi.fn()} onOpen={vi.fn()} />,
      );
    });
    return container.textContent ?? "";
  }

  it("offers a four week plan when the user has none", () => {
    expect(render(null)).toContain("生成我的 4 周计划");
  });

  it("shows today's title, duration and exercise count", () => {
    const text = render(makePlan());
    expect(text).toContain("全身基础 A");
    expect(text).toContain("45 分钟");
    expect(text).toContain("6 个动作");
  });

  it("shows a rest state and the next training date without shifting missed work", () => {
    const missedDay = makeDay({
      id: "missed-day",
      dayKey: "2026-07-13",
      status: "missed",
    });
    const nextDay = makeDay({
      id: "next-day",
      dayKey: "2026-07-15",
      weekday: 3,
      status: "upcoming",
      title: "全身基础 B",
    });
    const text = render(
      makePlan({ todayDay: null, nextDay, days: [missedDay, nextDay] }),
    );

    expect(text).toContain("今日休息");
    expect(text).toContain("7月15日");
    expect(text).not.toContain("补课");
    expect(text).not.toContain("顺延");
  });

  it("shows completion for a finished today session", () => {
    const completedDay = makeDay({ status: "completed" });
    expect(
      render(makePlan({ todayDay: completedDay, nextDay: null, days: [completedDay] })),
    ).toContain("今日训练已完成");
  });

  it("does not automatically create another plan after four weeks", () => {
    const text = render(
      makePlan({ status: "COMPLETED", todayDay: null, nextDay: null }),
    );
    expect(text).toContain("本轮计划已完成");
    expect(text).toContain("开启下一轮");
  });
});
