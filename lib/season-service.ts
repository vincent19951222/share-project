import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ALLOWED_TARGET_SLOTS, getShanghaiDayKey, isValidTargetSlots } from "@/lib/economy";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";
import { createOrReuseTeamDynamic } from "@/lib/team-dynamics-service";

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
    throw new SeasonValidationError("请填写冲刺目标名称");
  }

  const trimmed = goalName.trim();
  if (trimmed.length === 0) {
    throw new SeasonValidationError("请填写冲刺目标名称");
  }

  return trimmed;
}

function validateTargetSlots(targetSlots: unknown): number {
  if (typeof targetSlots !== "number" || !Number.isFinite(targetSlots)) {
    throw new SeasonValidationError("目标格数只能从固定档位里选");
  }

  if (!isValidTargetSlots(targetSlots)) {
    throw new SeasonValidationError(
      `目标格数只能选 ${ALLOWED_TARGET_SLOTS.join("、")}`,
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
    throw new SeasonConflictError("当前已经有进行中的赛季了");
  }

  const season = await prisma.season.findUniqueOrThrow({
    where: { id: seasonId },
  });

  await createOrReuseTeamDynamic({
    teamId,
    type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
    title: `新赛季已经开启：${goalName}`,
    summary: `${goalName} 的 ${targetSlots} 格冲刺已经开始`,
    payload: {
      seasonId: season.id,
      goalName: season.goalName,
      targetSlots: season.targetSlots,
      monthKey: season.monthKey,
    },
    sourceType: "season",
    sourceId: `${season.id}:started`,
    occurredAt: now,
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
    throw new SeasonNotFoundError("当前没有可结束的赛季");
  }

  const season = await prisma.season.update({
    where: { id: activeSeason.id },
    data: {
      status: "ENDED",
      endedAt: now,
    },
  });

  await createOrReuseTeamDynamic({
    teamId,
    type: TEAM_DYNAMIC_TYPES.SEASON_ENDED,
    title: `赛季已经结束：${season.goalName}`,
    summary: `${season.goalName} 本期定格在 ${season.filledSlots}/${season.targetSlots}`,
    payload: {
      seasonId: season.id,
      goalName: season.goalName,
      filledSlots: season.filledSlots,
      targetSlots: season.targetSlots,
    },
    sourceType: "season",
    sourceId: `${season.id}:ended`,
    occurredAt: now,
  });

  return serializeSeason(season);
}
