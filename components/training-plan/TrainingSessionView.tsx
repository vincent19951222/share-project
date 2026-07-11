"use client";

import { useMemo, useState } from "react";
import { submitTodayPunch, updateTodayWorkout } from "@/lib/api";
import { dispatchCalendarRefresh } from "@/lib/calendar-refresh";
import { reservePunchEpoch, useBoard } from "@/lib/store";
import type { TrainingPlanDaySnapshot } from "@/lib/types";

type ExerciseDraft = {
  completed: boolean;
  actualWeightKg: string;
  actualReps: string;
};

interface TrainingSessionViewProps {
  day: TrainingPlanDaySnapshot;
  onBusyChange?: (busy: boolean) => void;
}

function makeInitialDrafts(day: TrainingPlanDaySnapshot) {
  return Object.fromEntries(
    day.exercises.map((exercise) => [
      exercise.id,
      {
        completed: exercise.completed,
        actualWeightKg:
          exercise.actualWeightKg === null ? "" : String(exercise.actualWeightKg),
        actualReps: exercise.actualReps ?? "",
      } satisfies ExerciseDraft,
    ]),
  );
}

function isValidWeight(value: string) {
  if (value === "") return true;
  if (!/^\d{1,3}(?:\.\d)?$/.test(value)) return false;
  const number = Number(value);
  return number >= 0 && number <= 500;
}

function plannedExerciseText(exercise: TrainingPlanDaySnapshot["exercises"][number]) {
  const parts: string[] = [];
  if (exercise.plannedSets !== null) parts.push(`${exercise.plannedSets} 组`);
  if (exercise.plannedReps) parts.push(`${exercise.plannedReps} 次`);
  if (exercise.plannedSeconds !== null) parts.push(`${exercise.plannedSeconds} 秒`);
  if (exercise.restSeconds !== null) parts.push(`休 ${exercise.restSeconds} 秒`);
  return parts.join(" · ");
}

export function TrainingSessionView({ day, onBusyChange }: TrainingSessionViewProps) {
  const { state, dispatch } = useBoard();
  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>(() =>
    makeInitialDrafts(day),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUserIndex = state.members.findIndex(
    (member) => member.id === state.currentUserId,
  );
  const alreadyPunched =
    state.gridData[currentUserIndex]?.[state.today - 1] === true;
  const completedCount = useMemo(
    () => Object.values(drafts).filter((draft) => draft.completed).length,
    [drafts],
  );

  const updateDraft = (exerciseId: string, patch: Partial<ExerciseDraft>) => {
    setError(null);
    setDrafts((current) => ({
      ...current,
      [exerciseId]: { ...current[exerciseId], ...patch },
    }));
  };

  const submit = async () => {
    const invalidExercise = day.exercises.find((exercise) => {
      const draft = drafts[exercise.id];
      return (
        !isValidWeight(draft.actualWeightKg) || draft.actualReps.length > 32
      );
    });
    if (invalidExercise) {
      setError(`请检查「${invalidExercise.name}」的重量或次数`);
      return;
    }

    setBusy(true);
    onBusyChange?.(true);
    setError(null);
    const punchEpoch = reservePunchEpoch();
    dispatch({ type: "BEGIN_PUNCH_SYNC", punchEpoch });

    const payload = {
      ...day.workoutPayload,
      trainingPlanCompletion: {
        planDayId: day.id,
        exercises: day.exercises.map((exercise) => {
          const draft = drafts[exercise.id];
          return {
            planExerciseId: exercise.id,
            completed: draft.completed,
            actualWeightKg:
              draft.completed && draft.actualWeightKg !== ""
                ? Number(draft.actualWeightKg)
                : null,
            actualReps:
              draft.completed && draft.actualReps !== ""
                ? draft.actualReps
                : null,
          };
        }),
      },
    };

    try {
      const snapshot = alreadyPunched
        ? await updateTodayWorkout(payload)
        : await submitTodayPunch(payload);
      dispatch({
        type: "SYNC_REMOTE_STATE",
        snapshot,
        source: "punch",
        punchEpoch,
      });
      dispatch({
        type: "ADD_LOG",
        log: {
          id: `training-plan-${Date.now()}`,
          text: alreadyPunched
            ? "<b>你</b> 已把今日计划完成情况同步到训练小票。"
            : "<b>你</b> 已完成今日计划和健身打卡。",
          type: "success",
          timestamp: new Date(),
        },
      });
      window.dispatchEvent(new Event("activity-events:refresh"));
      dispatchCalendarRefresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败，请稍后再试");
      dispatch({ type: "END_PUNCH_SYNC", punchEpoch });
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="training-session-view">
      <div className="training-session-progress">
        <strong>{completedCount}/{day.exercises.length}</strong>
        <span>已勾选动作</span>
      </div>

      <div className="training-session-exercises training-plan-session-list">
        {day.exercises.map((exercise, index) => {
          const draft = drafts[exercise.id];
          return (
            <article
              key={exercise.id}
              className={`training-session-exercise ${draft.completed ? "is-completed" : ""}`}
            >
              <label className="training-session-check">
                <input
                  type="checkbox"
                  aria-label={`完成${exercise.name}`}
                  checked={draft.completed}
                  disabled={busy}
                  onChange={(event) =>
                    updateDraft(exercise.id, { completed: event.target.checked })
                  }
                />
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              </label>

              <div className="training-session-exercise-copy">
                <div className="training-session-exercise-heading">
                  <h4>{exercise.name}</h4>
                  <span>{exercise.phase === "warmup" ? "热身" : exercise.phase === "cooldown" ? "放松" : exercise.phase === "cardio" ? "有氧" : "主训练"}</span>
                </div>
                <p>{plannedExerciseText(exercise)}</p>
                <small>{exercise.beginnerTip}</small>
                {exercise.homeAlternativeName ? (
                  <small className="training-session-alternative">
                    居家替代：{exercise.homeAlternativeName}
                  </small>
                ) : null}
              </div>

              <div className="training-session-results">
                <label>
                  <span>重量 kg</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={`${exercise.name}重量`}
                    value={draft.actualWeightKg}
                    disabled={busy}
                    maxLength={5}
                    onChange={(event) =>
                      updateDraft(exercise.id, {
                        actualWeightKg: event.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  <span>实际次数</span>
                  <input
                    type="text"
                    aria-label={`${exercise.name}次数`}
                    value={draft.actualReps}
                    disabled={busy}
                    maxLength={32}
                    onChange={(event) =>
                      updateDraft(exercise.id, { actualReps: event.target.value })
                    }
                  />
                </label>
              </div>
            </article>
          );
        })}
      </div>

      {error ? <p className="training-plan-dialog-error" role="alert">{error}</p> : null}
      <button
        type="button"
        className="training-plan-card-primary training-session-submit"
        disabled={busy}
        onClick={submit}
      >
        {busy
          ? "同步中..."
          : alreadyPunched
            ? "保存计划完成情况"
            : "完成今日训练"}
      </button>
    </div>
  );
}
