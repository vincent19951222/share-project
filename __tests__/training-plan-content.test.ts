import { describe, expect, it } from "vitest";
import {
  exerciseCatalog,
  getExerciseById,
  trainingTemplates,
  validateTrainingContent,
} from "@/lib/training-plan/content";

describe("beginner training content", () => {
  it("ships a media-free beginner exercise catalog", () => {
    expect(exerciseCatalog.length).toBeGreaterThanOrEqual(100);
    expect(exerciseCatalog.length).toBeLessThanOrEqual(150);
    expect(new Set(exerciseCatalog.map((exercise) => exercise.id)).size).toBe(
      exerciseCatalog.length,
    );

    for (const exercise of exerciseCatalog) {
      expect(exercise.nameZh.length).toBeGreaterThan(0);
      expect(exercise.instructionsZh.length).toBeGreaterThan(0);
      expect(exercise).not.toHaveProperty("image");
      expect(exercise).not.toHaveProperty("gif_url");
      expect(exercise).not.toHaveProperty("gifUrl");
    }
  });

  it("excludes clearly advanced or explosive movements from the beginner catalog", () => {
    const advancedPattern =
      /muscle up|kipping|one arm|single arm|jump|burpee|handstand|planche|hanging|suspended|decline|clock push-up|\bdip\b|pull-up|chin-up/i;

    for (const exercise of exerciseCatalog) {
      expect(exercise.nameEn).not.toMatch(advancedPattern);
    }
  });

  it("ships the complete nine-template matrix", () => {
    expect(trainingTemplates).toHaveLength(9);
    expect(
      trainingTemplates.map((template) => [
        template.weeklyFrequency,
        template.durationMinutes,
      ]),
    ).toEqual([
      [2, 30],
      [2, 45],
      [2, 60],
      [3, 30],
      [3, 45],
      [3, 60],
      [4, 30],
      [4, 45],
      [4, 60],
    ]);
  });

  it("contains four complete weeks and only references catalog exercises", () => {
    expect(validateTrainingContent()).toEqual({ ok: true, errors: [] });

    for (const template of trainingTemplates) {
      expect(template.weeks).toHaveLength(4);
      for (const week of template.weeks) {
        expect(week.sessions).toHaveLength(template.weeklyFrequency);
        for (const session of week.sessions) {
          expect(session.estimatedMinutes).toBe(template.durationMinutes);
          for (const item of session.exercises) {
            const exercise = getExerciseById(item.exerciseId);
            expect(exercise).not.toBeNull();
            if (item.phase === "main" && exercise?.equipment !== "body weight") {
              expect(exercise?.homeAlternativeId).not.toBeNull();
              expect(getExerciseById(exercise!.homeAlternativeId!)).not.toBeNull();
            }
          }
        }
      }
    }
  });
});
