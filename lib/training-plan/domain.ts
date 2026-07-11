import { getShanghaiDayKey } from "@/lib/economy";

export type TrainingPlanDayStatus = "completed" | "today" | "missed" | "upcoming";

export interface CreateTrainingPlanInput {
  weeklyFrequency: 2 | 3 | 4;
  sessionDurationMinutes: 30 | 45 | 60;
  weekdays: number[];
  equipment: string[];
  avoidTags: string[];
}

const FREQUENCIES = new Set([2, 3, 4]);
const DURATIONS = new Set([30, 45, 60]);
const AVOID_TAGS = new Set(["shoulder", "lower-back", "knee"]);

function parseDayKey(dayKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey);
  if (!match) throw new Error("invalid-day-key");
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
}

function formatUtcDay(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function addShanghaiDays(dayKey: string, days: number): string {
  if (!Number.isInteger(days)) throw new Error("invalid-day-offset");
  const date = parseDayKey(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatUtcDay(date);
}

export function getShanghaiWeekday(dayKey: string): number {
  const weekday = parseDayKey(dayKey).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function getTrainingPlanStartDayKey(now: Date): string {
  const todayDayKey = getShanghaiDayKey(now);
  const weekday = getShanghaiWeekday(todayDayKey);
  return weekday === 1 ? todayDayKey : addShanghaiDays(todayDayKey, 8 - weekday);
}

export function parseCreateTrainingPlanInput(
  input: unknown,
):
  | { ok: true; value: CreateTrainingPlanInput }
  | { ok: false; error: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "invalid-training-plan-input" };
  }

  const body = input as Record<string, unknown>;
  const weeklyFrequency = body.weeklyFrequency;
  const sessionDurationMinutes = body.sessionDurationMinutes;

  if (typeof weeklyFrequency !== "number" || !FREQUENCIES.has(weeklyFrequency)) {
    return { ok: false, error: "invalid-weekly-frequency" };
  }
  if (
    typeof sessionDurationMinutes !== "number" ||
    !DURATIONS.has(sessionDurationMinutes)
  ) {
    return { ok: false, error: "invalid-session-duration" };
  }
  if (
    !Array.isArray(body.weekdays) ||
    body.weekdays.some(
      (weekday) =>
        typeof weekday !== "number" ||
        !Number.isInteger(weekday) ||
        weekday < 1 ||
        weekday > 7,
    )
  ) {
    return { ok: false, error: "invalid-weekdays" };
  }

  const weekdays = [...new Set(body.weekdays as number[])].sort((left, right) => left - right);
  if (weekdays.length !== weeklyFrequency) {
    return { ok: false, error: "weekday-count-mismatch" };
  }

  if (
    !Array.isArray(body.equipment) ||
    body.equipment.length !== 1 ||
    body.equipment[0] !== "gym"
  ) {
    return { ok: false, error: "unsupported-equipment" };
  }

  if (
    !Array.isArray(body.avoidTags) ||
    body.avoidTags.some((tag) => typeof tag !== "string" || !AVOID_TAGS.has(tag))
  ) {
    return { ok: false, error: "invalid-avoid-tags" };
  }

  const avoidTags = [...new Set(body.avoidTags as string[])].sort();
  return {
    ok: true,
    value: {
      weeklyFrequency: weeklyFrequency as 2 | 3 | 4,
      sessionDurationMinutes: sessionDurationMinutes as 30 | 45 | 60,
      weekdays,
      equipment: ["gym"],
      avoidTags,
    },
  };
}

export function deriveTrainingPlanDayStatus(input: {
  dayKey: string;
  todayDayKey: string;
  completedAt: Date | string | null;
}): TrainingPlanDayStatus {
  if (input.completedAt) return "completed";
  if (input.dayKey < input.todayDayKey) return "missed";
  if (input.dayKey === input.todayDayKey) return "today";
  return "upcoming";
}
