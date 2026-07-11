import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type SourceExercise = {
  id: string;
  name: string;
  body_part: string;
  equipment: string;
  target: string;
  secondary_muscles: string[];
  instructions: { zh?: string };
};

type BeginnerExercise = {
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
};

const EQUIPMENT_PRIORITY = [
  "body weight",
  "dumbbell",
  "cable",
  "leverage machine",
  "barbell",
  "sled machine",
  "elliptical machine",
  "stationary bike",
] as const;

const BODY_PART_QUOTAS: Record<string, number> = {
  "upper legs": 24,
  back: 18,
  chest: 16,
  shoulders: 14,
  waist: 20,
  "upper arms": 12,
  "lower legs": 8,
  cardio: 8,
};

const ADVANCED_NAME_PATTERN =
  /muscle[- ]up|kipping|one arm|single arm|jump|burpee|handstand|planche|hanging|suspended|decline|clock push-up|\bdip\b|pull-up|chin-up|plyo|pistol|snatch|clean and jerk|superman push-up/i;

const REQUIRED_TEMPLATE_SOURCE_IDS = new Set([
  "0025", "0085", "0241", "0274", "0276", "0289", "0294", "0334",
  "0405", "0585", "0599", "0662", "0699", "0739", "0818", "0861",
  "0872", "1271", "1350", "1373", "1377", "1385", "1760", "1769",
  "1771", "2138", "2141", "3013", "3132", "3167", "3666",
]);

const NAME_ZH_OVERRIDES: Record<string, string> = {
  "0025": "杠铃卧推",
  "0085": "杠铃罗马尼亚硬拉",
  "0241": "绳索三头下压",
  "0274": "卷腹",
  "0276": "死虫式",
  "0289": "哑铃卧推",
  "0294": "哑铃弯举",
  "0334": "哑铃侧平举",
  "0405": "坐姿哑铃推肩",
  "0585": "器械腿屈伸",
  "0599": "器械坐姿腿弯举",
  "0662": "俯卧撑",
  "0699": "肩部触碰俯卧撑",
  "0739": "45 度腿举",
  "0818": "平行握高位下拉",
  "0861": "坐姿绳索划船",
  "0872": "反向卷腹",
  "1271": "胸肩前侧拉伸",
  "1350": "器械坐姿划船",
  "1373": "徒手站姿提踵",
  "1377": "靠墙小腿拉伸",
  "1385": "腿举机提踵",
  "1760": "哑铃高脚杯深蹲",
  "1769": "侧卧徒手弯举",
  "1771": "跪姿徒手三头伸展",
  "2138": "动感单车",
  "2141": "椭圆机行走",
  "3013": "臀桥",
  "3132": "扶助深蹲",
  "3167": "毛巾辅助徒手划船",
  "3666": "上坡跑步机行走",
};

const HOME_ALTERNATIVE_BY_SOURCE_ID: Record<string, string> = {
  "0025": "0662",
  "0085": "3013",
  "0241": "1771",
  "0289": "0662",
  "0294": "1769",
  "0334": "0699",
  "0405": "0699",
  "0585": "3132",
  "0599": "3013",
  "0739": "3132",
  "0818": "3167",
  "0861": "3167",
  "1350": "3167",
  "1385": "1373",
  "1760": "3132",
};

const EQUIPMENT_ZH: Record<string, string> = {
  "body weight": "徒手",
  dumbbell: "哑铃",
  cable: "绳索",
  "leverage machine": "固定器械",
  barbell: "杠铃",
  "sled machine": "腿举机",
  "elliptical machine": "椭圆机",
  "stationary bike": "动感单车",
};

const BODY_PART_ZH: Record<string, string> = {
  "upper legs": "臀腿",
  back: "背部",
  chest: "胸部",
  shoulders: "肩部",
  waist: "核心",
  "upper arms": "手臂",
  "lower legs": "小腿",
  cardio: "心肺",
};

function readFlag(args: string[], name: string, fallback?: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}

function equipmentRank(equipment: string): number {
  const index = EQUIPMENT_PRIORITY.indexOf(
    equipment as (typeof EQUIPMENT_PRIORITY)[number],
  );
  return index === -1 ? EQUIPMENT_PRIORITY.length : index;
}

function deriveMovementPattern(exercise: SourceExercise): string {
  const name = exercise.name.toLowerCase();
  if (exercise.body_part === "cardio") return "cardio";
  if (/row|pulldown|pull-up/.test(name)) return "pull";
  if (/press|push-up/.test(name)) return "push";
  if (/squat|leg press|lunge|extension/.test(name)) return "squat";
  if (/deadlift|bridge|leg curl/.test(name)) return "hinge";
  if (/curl/.test(name)) return "curl";
  if (/crunch|plank|dead bug/.test(name)) return "core";
  if (/calf/.test(name)) return "calf";
  return exercise.body_part;
}

function deriveAvoidTags(exercise: SourceExercise): string[] {
  const tags = new Set<string>();
  const name = exercise.name.toLowerCase();
  if (exercise.body_part === "shoulders" || /shoulder|overhead/.test(name)) tags.add("shoulder");
  if (/squat|leg press|lunge|leg extension/.test(name)) tags.add("knee");
  if (/deadlift|bent over|back extension/.test(name)) tags.add("lower-back");
  return [...tags];
}

function buildNameZh(exercise: SourceExercise): string {
  const override = NAME_ZH_OVERRIDES[exercise.id];
  if (override) return override;
  const equipment = EQUIPMENT_ZH[exercise.equipment] ?? "基础";
  const bodyPart = BODY_PART_ZH[exercise.body_part] ?? "全身";
  return `${equipment}${bodyPart}训练 ${exercise.id}`;
}

function normalizeExercise(exercise: SourceExercise): BeginnerExercise {
  return {
    id: exercise.id,
    source: "hasaneyldrm/exercises-dataset",
    sourceId: exercise.id,
    nameEn: exercise.name,
    nameZh: buildNameZh(exercise),
    bodyPart: exercise.body_part,
    target: exercise.target,
    secondaryMuscles: exercise.secondary_muscles ?? [],
    equipment: exercise.equipment,
    instructionsZh: exercise.instructions.zh?.trim() || "请在动作稳定、无明显不适的前提下完成。",
    difficulty: "beginner",
    movementPattern: deriveMovementPattern(exercise),
    avoidTags: deriveAvoidTags(exercise),
    beginnerTip: "先使用轻重量熟悉动作，最后两次略感吃力但仍能保持稳定。",
    homeAlternativeId: HOME_ALTERNATIVE_BY_SOURCE_ID[exercise.id] ?? null,
  };
}

function selectBeginnerExercises(source: SourceExercise[]): BeginnerExercise[] {
  const byId = new Map(source.map((exercise) => [exercise.id, exercise]));
  const selected: SourceExercise[] = [];

  for (const [bodyPart, quota] of Object.entries(BODY_PART_QUOTAS)) {
    const candidates = source
      .filter((exercise) => exercise.body_part === bodyPart)
      .filter(
        (exercise) =>
          REQUIRED_TEMPLATE_SOURCE_IDS.has(exercise.id) ||
          EQUIPMENT_PRIORITY.includes(
            exercise.equipment as (typeof EQUIPMENT_PRIORITY)[number],
          ),
      )
      .filter(
        (exercise) =>
          REQUIRED_TEMPLATE_SOURCE_IDS.has(exercise.id) ||
          !ADVANCED_NAME_PATTERN.test(exercise.name),
      )
      .sort((left, right) => {
        const requiredDifference =
          Number(REQUIRED_TEMPLATE_SOURCE_IDS.has(right.id)) -
          Number(REQUIRED_TEMPLATE_SOURCE_IDS.has(left.id));
        return (
          requiredDifference ||
          equipmentRank(left.equipment) - equipmentRank(right.equipment) ||
          left.id.localeCompare(right.id)
        );
      });

    if (candidates.length < quota) {
      throw new Error(`not enough ${bodyPart} exercises: ${candidates.length}/${quota}`);
    }
    selected.push(...candidates.slice(0, quota));
  }

  for (const requiredId of REQUIRED_TEMPLATE_SOURCE_IDS) {
    if (selected.some((exercise) => exercise.id === requiredId)) continue;
    const required = byId.get(requiredId);
    if (!required) throw new Error(`missing required source exercise ${requiredId}`);
    const replacement = selected
      .map((exercise, index) => ({ exercise, index }))
      .reverse()
      .find(
        ({ exercise }) =>
          exercise.body_part === required.body_part &&
          !REQUIRED_TEMPLATE_SOURCE_IDS.has(exercise.id),
      );
    if (!replacement) throw new Error(`cannot place required source exercise ${requiredId}`);
    selected[replacement.index] = required;
  }

  const normalized = [...new Map(selected.map((item) => [item.id, item])).values()]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(normalizeExercise);
  if (normalized.length !== 120) {
    throw new Error(`expected 120 beginner exercises, got ${normalized.length}`);
  }
  return normalized;
}

function buildReviewMarkdown(exercises: BeginnerExercise[]): string {
  const rows = exercises.map(
    (exercise) =>
      `| ${exercise.id} | ${exercise.nameZh} | ${exercise.nameEn} | ${exercise.equipment} | ${exercise.bodyPart} | ${exercise.homeAlternativeId ?? "-"} |`,
  );
  return [
    "# 新手动作目录 v1 审核表",
    "",
    "本表由导入脚本生成；目录不包含图片或 GIF。",
    "",
    "| ID | 中文名 | 英文源名 | 器械 | 部位 | 居家替代 |",
    "|---|---|---|---|---|---|",
    ...rows,
    "",
  ].join("\n");
}

const args = process.argv.slice(2);
const sourcePath = readFlag(args, "--source");
const outputPath = readFlag(args, "--output", "content/training/exercises.v1.json");

if (!sourcePath || !outputPath) throw new Error("missing --source <exercises.json>");

const source = JSON.parse(readFileSync(resolve(sourcePath), "utf8")) as SourceExercise[];
const selected = selectBeginnerExercises(source);
const resolvedOutput = resolve(outputPath);
const reviewPath = resolve("docs/training/exercise-catalog-review-v1.md");

mkdirSync(dirname(resolvedOutput), { recursive: true });
mkdirSync(dirname(reviewPath), { recursive: true });
writeFileSync(resolvedOutput, `${JSON.stringify(selected, null, 2)}\n`);
writeFileSync(reviewPath, buildReviewMarkdown(selected));
console.log(`Wrote ${selected.length} exercises to ${resolvedOutput}`);
