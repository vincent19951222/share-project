export const ALLOWED_TARGET_SLOTS = [50, 80, 100, 120, 150] as const;

const SHANGHAI_TIME_ZONE = "Asia/Shanghai";
const SHANGHAI_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: SHANGHAI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const PUNCH_REWARDS = [10, 20, 30, 40, 50] as const;
const SHANGHAI_DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type AllowedTargetSlot = (typeof ALLOWED_TARGET_SLOTS)[number];

function assertValidShanghaiDayKey(dayKey: string): void {
  if (!SHANGHAI_DAY_KEY_PATTERN.test(dayKey)) {
    throw new RangeError(`Invalid Shanghai day key: ${dayKey}. Expected YYYY-MM-DD.`);
  }

  const [yearText, monthText, dayText] = dayKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(Date.UTC(0, month - 1, day, 0, 0, 0));

  candidate.setUTCFullYear(year);

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new RangeError(`Invalid Shanghai day key: ${dayKey}. Expected a real calendar date.`);
  }
}

function parseShanghaiDayKey(dayKey: string): Date {
  assertValidShanghaiDayKey(dayKey);

  const [yearText, monthText, dayText] = dayKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const candidate = new Date(Date.UTC(0, month - 1, day, 0, 0, 0));

  candidate.setUTCFullYear(year);

  return new Date(candidate.getTime() - 8 * 60 * 60 * 1000);
}

function shiftShanghaiDayKey(dayKey: string, offsetDays: number): string {
  const shifted = new Date(parseShanghaiDayKey(dayKey).getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return getShanghaiDayKey(shifted);
}

function assertFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`Invalid ${label}: expected a finite number.`);
  }
}

export function getShanghaiDayKey(now: Date = new Date()): string {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("Invalid date value: expected a valid Date.");
  }

  return SHANGHAI_DATE_FORMATTER.format(now);
}

export function getPunchRewardForStreak(streak: number): number {
  assertFiniteNumber(streak, "streak");

  const normalizedStreak = Math.max(1, Math.floor(streak));
  const rewardIndex = Math.min(normalizedStreak, PUNCH_REWARDS.length) - 1;

  return PUNCH_REWARDS[rewardIndex];
}

export function getNextPunchStreak(
  currentStreak: number,
  lastPunchDayKey: string | null | undefined,
  todayDayKey: string,
): number {
  assertFiniteNumber(currentStreak, "current streak");
  assertValidShanghaiDayKey(todayDayKey);

  if (lastPunchDayKey === null || lastPunchDayKey === undefined) {
    return 1;
  }

  assertValidShanghaiDayKey(lastPunchDayKey);

  const yesterdayDayKey = shiftShanghaiDayKey(todayDayKey, -1);

  if (lastPunchDayKey === yesterdayDayKey) {
    return Math.max(1, Math.floor(currentStreak)) + 1;
  }

  return 1;
}

export function getNextPunchRewardPreview(
  currentStreak: number,
  lastPunchDayKey: string | null | undefined,
  todayDayKey: string,
): number {
  return getPunchRewardForStreak(getNextPunchStreak(currentStreak, lastPunchDayKey, todayDayKey));
}

export function getUpcomingPunchRewardPreview(
  currentStreak: number,
  lastPunchDayKey: string | null | undefined,
  todayDayKey: string,
): number {
  assertValidShanghaiDayKey(todayDayKey);

  const previewDayKey =
    lastPunchDayKey === todayDayKey
      ? shiftShanghaiDayKey(todayDayKey, 1)
      : todayDayKey;

  return getNextPunchRewardPreview(currentStreak, lastPunchDayKey, previewDayKey);
}

export function isValidTargetSlots(value: number): value is AllowedTargetSlot {
  return ALLOWED_TARGET_SLOTS.includes(value as AllowedTargetSlot);
}
