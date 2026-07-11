import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrainingPlanDetailDialog } from "@/components/training-plan/TrainingPlanDetailDialog";
import { TrainingSessionView } from "@/components/training-plan/TrainingSessionView";
import { submitTodayPunch, updateTodayWorkout } from "@/lib/api";
import type {
  BoardSnapshot,
  BoardState,
  TrainingPlanDaySnapshot,
  TrainingPlanSnapshot,
} from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const dispatch = vi.fn();
let boardState: BoardState;

vi.mock("@/lib/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/store")>();
  return {
    ...actual,
    reservePunchEpoch: vi.fn(() => 7),
    useBoard: () => ({ state: boardState, dispatch }),
  };
});

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    submitTodayPunch: vi.fn(),
    updateTodayWorkout: vi.fn(),
  };
});

function makeDay(
  id: string,
  weekIndex: number,
  status: TrainingPlanDaySnapshot["status"],
): TrainingPlanDaySnapshot {
  return {
    id,
    dayKey: weekIndex === 1 ? "2026-07-13" : "2026-07-20",
    weekIndex,
    weekday: 1,
    title: weekIndex === 1 ? "第一周基础" : "第二周进阶",
    estimatedMinutes: 45,
    status,
    workoutPayload: {
      trainingType: "strength",
      cardioItem: null,
      cardioItems: [],
      strengthParts: ["chest", "legs"],
      durationMinutes: 45,
    },
    exercises: [
      {
        id: `${id}-exercise-1`,
        exerciseId: "push-up",
        name: "上斜俯卧撑",
        bodyPart: "chest",
        equipment: "body weight",
        phase: "main",
        sortOrder: 0,
        plannedSets: 3,
        plannedReps: "8-10",
        plannedSeconds: null,
        restSeconds: 60,
        beginnerTip: "身体保持一条直线。",
        homeAlternativeExerciseId: "wall-push-up",
        homeAlternativeName: "墙壁俯卧撑",
        completed: false,
        actualWeightKg: null,
        actualReps: null,
      },
      {
        id: `${id}-exercise-2`,
        exerciseId: "squat",
        name: "徒手深蹲",
        bodyPart: "upper legs",
        equipment: "body weight",
        phase: "main",
        sortOrder: 1,
        plannedSets: 3,
        plannedReps: "10-12",
        plannedSeconds: null,
        restSeconds: 60,
        beginnerTip: "膝盖朝脚尖方向。",
        homeAlternativeExerciseId: null,
        homeAlternativeName: null,
        completed: false,
        actualWeightKg: null,
        actualReps: null,
      },
    ],
  };
}

function makePlan(): TrainingPlanSnapshot {
  const weekOne = makeDay("day-1", 1, "missed");
  const today = makeDay("day-2", 2, "today");
  const future = makeDay("day-3", 3, "upcoming");
  return {
    id: "plan-1",
    templateId: "beginner-fat-loss-3d-45m",
    templateVersion: 1,
    status: "ACTIVE",
    startDayKey: "2026-07-13",
    endDayKey: "2026-08-09",
    currentWeekIndex: 2,
    todayDay: today,
    nextDay: today,
    days: [weekOne, today, future],
  };
}

const responseSnapshot = {
  members: [{ id: "user-1", name: "Li", avatarKey: "male1" }],
  gridData: [[true]],
  today: 1,
  totalDays: 1,
  currentUserId: "user-1",
  currentTrainingPlan: makePlan(),
} satisfies BoardSnapshot;

describe("training plan detail and session", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    dispatch.mockReset();
    vi.mocked(submitTodayPunch).mockReset();
    vi.mocked(updateTodayWorkout).mockReset();
    boardState = {
      ...responseSnapshot,
      gridData: [[false]],
      logs: [],
      activeTab: "punch",
    };
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function button(label: string) {
    return Array.from(document.body.querySelectorAll("button")).find(
      (item) => item.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;
  }

  it("opens on the current week and allows read-only week switching", () => {
    act(() => {
      root.render(
        <TrainingPlanDetailDialog plan={makePlan()} open onClose={vi.fn()} />,
      );
    });
    expect(document.body.textContent).toContain("第二周进阶");
    expect(document.body.textContent).not.toContain("第一周基础");

    act(() => button("第 1 周")!.click());
    expect(document.body.textContent).toContain("第一周基础");
    expect(document.body.textContent).toContain("已错过");
    expect(button("补做训练")).toBeUndefined();

    act(() => button("第 3 周")!.click());
    expect(document.body.textContent).toContain("尚未开始");
    expect(button("完成今日训练")).toBeUndefined();
  });

  it("submits checked exercise results through a new punch", async () => {
    vi.mocked(submitTodayPunch).mockResolvedValue(responseSnapshot);
    const day = makePlan().todayDay!;
    act(() => root.render(<TrainingSessionView day={day} />));

    const checkbox = document.body.querySelector(
      `input[aria-label="完成${day.exercises[0].name}"]`,
    ) as HTMLInputElement;
    const weight = document.body.querySelector(
      `input[aria-label="${day.exercises[0].name}重量"]`,
    ) as HTMLInputElement;
    const reps = document.body.querySelector(
      `input[aria-label="${day.exercises[0].name}次数"]`,
    ) as HTMLInputElement;
    const setInputValue = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;

    await act(async () => {
      checkbox.click();
      setInputValue?.call(weight, "12.5");
      weight.dispatchEvent(new Event("input", { bubbles: true }));
      setInputValue?.call(reps, "10");
      reps.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      button("完成今日训练")!.click();
      await Promise.resolve();
    });

    expect(submitTodayPunch).toHaveBeenCalledWith({
      ...day.workoutPayload,
      trainingPlanCompletion: {
        planDayId: day.id,
        exercises: [
          {
            planExerciseId: day.exercises[0].id,
            completed: true,
            actualWeightKg: 12.5,
            actualReps: "10",
          },
          {
            planExerciseId: day.exercises[1].id,
            completed: false,
            actualWeightKg: null,
            actualReps: null,
          },
        ],
      },
    });
    expect(dispatch).toHaveBeenCalledWith({ type: "BEGIN_PUNCH_SYNC", punchEpoch: 7 });
    expect(dispatch).toHaveBeenCalledWith({
      type: "SYNC_REMOTE_STATE",
      snapshot: responseSnapshot,
      source: "punch",
      punchEpoch: 7,
    });
  });

  it("updates the workout when today was already punched", async () => {
    boardState = { ...boardState, gridData: [[true]] };
    vi.mocked(updateTodayWorkout).mockResolvedValue(responseSnapshot);
    const day = makePlan().todayDay!;
    act(() => root.render(<TrainingSessionView day={day} />));

    await act(async () => {
      button("保存计划完成情况")!.click();
      await Promise.resolve();
    });

    expect(updateTodayWorkout).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingPlanCompletion: expect.objectContaining({ planDayId: day.id }),
      }),
    );
    expect(submitTodayPunch).not.toHaveBeenCalled();
  });
});
