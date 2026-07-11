import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type CatalogExercise = { id: string };
type TrainingFrequency = 2 | 3 | 4;
type TrainingDuration = 30 | 45 | 60;

const SESSION_BLUEPRINTS = {
  fullBodyA: ["2141", "0739", "0025", "0861", "0276"],
  fullBodyB: ["2138", "0085", "0818", "0405", "0274"],
  fullBodyC: ["3666", "1760", "0289", "1350", "0872"],
  upperA: ["2141", "0025", "0861", "0334", "0241", "0276"],
  lowerA: ["2138", "0739", "0599", "0585", "0274"],
  upperB: ["2141", "0289", "0818", "0405", "0294", "0872"],
  lowerB: ["3666", "0085", "1760", "1385", "0276"],
} as const;

type BlueprintKey = keyof typeof SESSION_BLUEPRINTS;

const BLUEPRINT_TITLES: Record<BlueprintKey, string> = {
  fullBodyA: "全身基础 A",
  fullBodyB: "全身基础 B",
  fullBodyC: "全身基础 C",
  upperA: "上肢基础 A",
  lowerA: "下肢基础 A",
  upperB: "上肢基础 B",
  lowerB: "下肢基础 B",
};

const WEEK_PROGRESSION = [
  { weekIndex: 1, mainSets: 2, reps: "10" },
  { weekIndex: 2, mainSets: 2, reps: "12" },
  { weekIndex: 3, mainSets: 3, reps: "10" },
  { weekIndex: 4, mainSets: 3, reps: "10" },
] as const;

const FREQUENCY_BLUEPRINTS: Record<TrainingFrequency, BlueprintKey[]> = {
  2: ["fullBodyA", "fullBodyB"],
  3: ["fullBodyA", "fullBodyB", "fullBodyC"],
  4: ["upperA", "lowerA", "upperB", "lowerB"],
};

function buildSession(
  blueprintKey: BlueprintKey,
  slot: number,
  duration: TrainingDuration,
  progression: (typeof WEEK_PROGRESSION)[number],
) {
  const [warmupId, ...mainIds] = SESSION_BLUEPRINTS[blueprintKey];
  const mainLimit = duration === 30 ? 4 : mainIds.length;

  return {
    slot,
    title: BLUEPRINT_TITLES[blueprintKey],
    estimatedMinutes: duration,
    exercises: [
      {
        exerciseId: warmupId,
        phase: "warmup",
        sets: null,
        reps: null,
        seconds: 300,
        restSeconds: null,
      },
      ...mainIds.slice(0, mainLimit).map((exerciseId) => ({
        exerciseId,
        phase: "main",
        sets: progression.mainSets,
        reps: progression.reps,
        seconds: null,
        restSeconds: duration === 30 ? 45 : 60,
      })),
      ...(duration === 60
        ? [
            {
              exerciseId: blueprintKey.startsWith("lower") ? "1377" : "1271",
              phase: "cooldown",
              sets: null,
              reps: null,
              seconds: 180,
              restSeconds: null,
            },
          ]
        : []),
    ],
  };
}

function buildTemplates() {
  const templates = [];
  for (const frequency of [2, 3, 4] as const) {
    for (const duration of [30, 45, 60] as const) {
      templates.push({
        id: `beginner-fat-loss-${frequency}d-${duration}m`,
        version: 1,
        goal: "beginner-fat-loss",
        weeklyFrequency: frequency,
        durationMinutes: duration,
        weeks: WEEK_PROGRESSION.map((progression) => ({
          weekIndex: progression.weekIndex,
          sessions: FREQUENCY_BLUEPRINTS[frequency].map((blueprint, slot) =>
            buildSession(blueprint, slot, duration, progression),
          ),
        })),
      });
    }
  }
  return templates;
}

const catalogPath = resolve("content/training/exercises.v1.json");
const outputPath = resolve("content/training/templates.v1.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogExercise[];
const catalogIds = new Set(catalog.map((exercise) => exercise.id));
const templates = buildTemplates();

for (const template of templates) {
  for (const week of template.weeks) {
    for (const session of week.sessions) {
      for (const exercise of session.exercises) {
        if (!catalogIds.has(exercise.exerciseId)) {
          throw new Error(`template references missing exercise ${exercise.exerciseId}`);
        }
      }
    }
  }
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(templates, null, 2)}\n`);
console.log(`Wrote ${templates.length} templates to ${outputPath}`);
