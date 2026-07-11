import exercisesJson from "@/content/training/exercises.v1.json";
import templatesJson from "@/content/training/templates.v1.json";

export type TrainingFrequency = 2 | 3 | 4;
export type TrainingDuration = 30 | 45 | 60;
export type TrainingPhase = "warmup" | "main" | "cardio" | "cooldown";

export interface ExerciseCatalogEntry {
  id: string;
  source: "hasaneyldrm/exercises-dataset";
  sourceId: string;
  nameEn: string;
  nameZh: string;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  instructionsZh: string;
  difficulty: "beginner";
  movementPattern: string;
  avoidTags: string[];
  beginnerTip: string;
  homeAlternativeId: string | null;
}

export interface TrainingTemplateExercise {
  exerciseId: string;
  phase: TrainingPhase;
  sets: number | null;
  reps: string | null;
  seconds: number | null;
  restSeconds: number | null;
}

export interface TrainingTemplateSession {
  slot: number;
  title: string;
  estimatedMinutes: TrainingDuration;
  exercises: TrainingTemplateExercise[];
}

export interface TrainingTemplateWeek {
  weekIndex: 1 | 2 | 3 | 4;
  sessions: TrainingTemplateSession[];
}

export interface TrainingTemplate {
  id: string;
  version: 1;
  goal: "beginner-fat-loss";
  weeklyFrequency: TrainingFrequency;
  durationMinutes: TrainingDuration;
  weeks: TrainingTemplateWeek[];
}

export const exerciseCatalog = exercisesJson as ExerciseCatalogEntry[];
export const trainingTemplates = templatesJson as TrainingTemplate[];

const exercisesById = new Map(exerciseCatalog.map((item) => [item.id, item]));

export function getExerciseById(id: string): ExerciseCatalogEntry | null {
  return exercisesById.get(id) ?? null;
}

export function getTrainingTemplate(
  weeklyFrequency: TrainingFrequency,
  durationMinutes: TrainingDuration,
): TrainingTemplate | null {
  return (
    trainingTemplates.find(
      (item) =>
        item.weeklyFrequency === weeklyFrequency &&
        item.durationMinutes === durationMinutes,
    ) ?? null
  );
}

export function validateTrainingContent(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const matrixKeys = new Set<string>();

  for (const template of trainingTemplates) {
    const matrixKey = `${template.weeklyFrequency}:${template.durationMinutes}`;
    if (matrixKeys.has(matrixKey)) errors.push(`duplicate-template:${matrixKey}`);
    matrixKeys.add(matrixKey);
    if (template.weeks.length !== 4) errors.push(`invalid-week-count:${template.id}`);

    for (const week of template.weeks) {
      if (week.sessions.length !== template.weeklyFrequency) {
        errors.push(`invalid-session-count:${template.id}:${week.weekIndex}`);
      }
      for (const session of week.sessions) {
        if (session.estimatedMinutes !== template.durationMinutes) {
          errors.push(`invalid-duration:${template.id}:${week.weekIndex}:${session.slot}`);
        }
        for (const item of session.exercises) {
          const exercise = exercisesById.get(item.exerciseId);
          if (!exercise) {
            errors.push(`missing-exercise:${template.id}:${item.exerciseId}`);
            continue;
          }
          if (
            item.phase === "main" &&
            exercise.equipment !== "body weight" &&
            (!exercise.homeAlternativeId || !exercisesById.has(exercise.homeAlternativeId))
          ) {
            errors.push(`missing-home-alternative:${template.id}:${item.exerciseId}`);
          }
        }
      }
    }
  }

  if (matrixKeys.size !== 9) errors.push("incomplete-template-matrix");
  return { ok: errors.length === 0, errors };
}
