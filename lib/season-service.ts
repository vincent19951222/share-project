import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ALLOWED_TARGET_SLOTS, getShanghaiDayKey, isValidTargetSlots } from "@/lib/economy";

export type SeasonStatus = "ACTIVE" | "ENDED";

export interface SeasonListItem {
  id: string;
  teamId: string;
  monthKey: string;
  goalName: string;
  targetSlots: number;
  filledSlots: number;
  status: SeasonStatus | string;
  startedAt: string;
  endedAt: string | null;
}

export class SeasonServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "SeasonServiceError";
    this.code = code;
    this.status = status;
  }
}

export class SeasonValidationError extends SeasonServiceError {
  constructor(message: string, code = "SEASON_VALIDATION_ERROR") {
    super(code, 400, message);
    this.name = "SeasonValidationError";
  }
}

export class SeasonConflictError extends SeasonServiceError {
  constructor(message: string, code = "SEASON_CONFLICT") {
    super(code, 409, message);
    this.name = "SeasonConflictError";
  }
}

export class SeasonNotFoundError extends SeasonServiceError {
  constructor(message: string, code = "SEASON_NOT_FOUND") {
    super(code, 404, message);
    this.name = "SeasonNotFoundError";
  }
}

function serializeSeason(season: {
  id: string;
  teamId: string;
  monthKey: string;
  goalName: string;
  targetSlots: number;
  filledSlots: number;
  status: string;
  startedAt: Date;
  endedAt: Date | null;
}): SeasonListItem {
  return {
    id: season.id,
    teamId: season.teamId,
    monthKey: season.monthKey,
    goalName: season.goalName,
    targetSlots: season.targetSlots,
    filledSlots: season.filledSlots,
    status: season.status,
    startedAt: season.startedAt.toISOString(),
    endedAt: season.endedAt ? season.endedAt.toISOString() : null,
  };
}

export function getCurrentSeasonMonthKey(now: Date = new Date()): string {
  return getShanghaiDayKey(now).slice(0, 7);
}

function validateGoalName(goalName: unknown): string {
  if (typeof goalName !== "string") {
    throw new SeasonValidationError("goalName must be a non-empty string");
  }

  const trimmed = goalName.trim();
  if (trimmed.length === 0) {
    throw new SeasonValidationError("goalName must be a non-empty string");
  }

  return trimmed;
}

function validateTargetSlots(targetSlots: unknown): number {
  if (typeof targetSlots !== "number" || !Number.isFinite(targetSlots)) {
    throw new SeasonValidationError("targetSlots must be one of the allowed slot tiers");
  }

  if (!isValidTargetSlots(targetSlots)) {
    throw new SeasonValidationError(
      `targetSlots must be one of: ${ALLOWED_TARGET_SLOTS.join(", ")}`,
    );
  }

  return targetSlots;
}

export async function listSeasonsForTeam(teamId: string): Promise<SeasonListItem[]> {
  const seasons = await prisma.season.findMany({
    where: { teamId },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
  });

  return seasons.map(serializeSeason);
}

export async function createSeasonForTeam(
  teamId: string,
  input: { goalName: unknown; targetSlots: unknown },
  now: Date = new Date(),
): Promise<SeasonListItem> {
  const goalName = validateGoalName(input.goalName);
  const targetSlots = validateTargetSlots(input.targetSlots);
  const monthKey = getCurrentSeasonMonthKey(now);
  const seasonId = randomUUID();
  const insertedCount = await prisma.$executeRaw`
    INSERT INTO "Season" ("id", "teamId", "monthKey", "goalName", "status", "targetSlots", "filledSlots", "startedAt")
    SELECT ${seasonId}, ${teamId}, ${monthKey}, ${goalName}, 'ACTIVE', ${targetSlots}, 0, ${now}
    WHERE NOT EXISTS (
      SELECT 1
      FROM "Season"
      WHERE "teamId" = ${teamId}
        AND "status" = 'ACTIVE'
    )
  `;

  if (insertedCount === 0) {
    throw new SeasonConflictError("An active season already exists for this team");
  }

  const season = await prisma.season.findUniqueOrThrow({
    where: { id: seasonId },
  });

  return serializeSeason(season);
}

export async function endActiveSeasonForTeam(
  teamId: string,
  now: Date = new Date(),
): Promise<SeasonListItem> {
  const activeSeason = await prisma.season.findFirst({
    where: { teamId, status: "ACTIVE" },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
  });

  if (!activeSeason) {
    throw new SeasonNotFoundError("No active season exists for this team");
  }

  const season = await prisma.season.update({
    where: { id: activeSeason.id },
    data: {
      status: "ENDED",
      endedAt: now,
    },
  });

  return serializeSeason(season);
}
