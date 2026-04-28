import type { Prisma, TeamDynamic, WeeklyReportDraft } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { TEAM_DYNAMIC_TYPES } from "@/lib/team-dynamics";
import {
  buildWeeklyReportSummary,
  getCurrentWeeklyReportWindow,
  type WeeklyReportSnapshot,
} from "@/lib/weekly-report";

type PrismaLike = typeof prisma | Prisma.TransactionClient;

interface BuildWeeklyReportSnapshotInput {
  teamId: string;
  generatedByUserId: string;
  now?: Date;
  client?: PrismaLike;
}

interface WeeklyReportDraftRecord {
  id: string;
  teamId: string;
  createdByUserId: string;
  weekStartDayKey: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  snapshot: WeeklyReportSnapshot;
}

interface AdminWeeklyReportInput {
  userId: string;
  now?: Date;
  client?: PrismaLike;
}

export class WeeklyReportServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "WeeklyReportServiceError";
    this.code = code;
    this.status = status;
  }
}

function serializeDraft(draft: WeeklyReportDraft): WeeklyReportDraftRecord {
  return {
    id: draft.id,
    teamId: draft.teamId,
    createdByUserId: draft.createdByUserId,
    weekStartDayKey: draft.weekStartDayKey,
    summary: draft.summary,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
    snapshot: parseWeeklyReportSnapshot(draft.payloadJson),
  };
}

function parseWeeklyReportSnapshot(payloadJson: string): WeeklyReportSnapshot {
  return JSON.parse(payloadJson) as WeeklyReportSnapshot;
}

function isUniqueConstraintError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function enumerateWeekDayKeys(weekStartAt: Date, weekEndDayKey: string): string[] {
  const dayKeys: string[] = [];
  const cursor = new Date(weekStartAt);

  while (true) {
    const dayKey = cursor.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
    dayKeys.push(dayKey);

    if (dayKey === weekEndDayKey) {
      break;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dayKeys;
}

function formatTopMembers(
  members: Array<{ id: string; username: string }>,
  punchCounts: Map<string, number>,
) {
  return members
    .map((member) => ({
      userId: member.id,
      username: member.username,
      count: punchCounts.get(member.id) ?? 0,
    }))
    .filter((member) => member.count > 0)
    .sort((left, right) => right.count - left.count || left.username.localeCompare(right.username))
    .slice(0, 3)
    .map((member) => ({
      userId: member.userId,
      label: "本周高光",
      value: `${member.username} · ${member.count} 次有效打卡`,
    }));
}

function formatCoffeeHighlight(
  members: Array<{ id: string; username: string }>,
  coffeeCounts: Map<string, number>,
) {
  const leader =
    members
      .map((member) => ({
        userId: member.id,
        username: member.username,
        cups: coffeeCounts.get(member.id) ?? 0,
      }))
      .filter((member) => member.cups > 0)
      .sort((left, right) => right.cups - left.cups || left.username.localeCompare(right.username))[0] ??
    null;

  if (!leader) {
    return undefined;
  }

  return {
    userId: leader.userId,
    label: "续命担当",
    value: `${leader.username} · ${leader.cups} 杯咖啡`,
  };
}

async function requireAdmin(input: AdminWeeklyReportInput) {
  const client = input.client ?? prisma;
  const user = await client.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: {
      id: true,
      role: true,
      teamId: true,
    },
  });

  if (user.role !== "ADMIN") {
    throw new WeeklyReportServiceError("FORBIDDEN", 403, "仅管理员可以操作周报。");
  }

  return user;
}

export async function buildWeeklyReportSnapshot(
  input: BuildWeeklyReportSnapshotInput,
): Promise<WeeklyReportSnapshot> {
  const client = input.client ?? prisma;
  const now = input.now ?? new Date();
  const window = getCurrentWeeklyReportWindow(now);
  const dayKeys = enumerateWeekDayKeys(window.weekStartAt, window.weekEndDayKey);

  const [members, activeSeason] = await Promise.all([
    client.user.findMany({
      where: { teamId: input.teamId },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        username: true,
      },
    }),
    client.season.findFirst({
      where: { teamId: input.teamId, status: "ACTIVE" },
      orderBy: [{ startedAt: "desc" }, { id: "desc" }],
      select: {
        filledSlots: true,
        targetSlots: true,
        status: true,
      },
    }),
  ]);

  const memberIds = members.map((member) => member.id);
  const [punchRecords, coffeeRecords] =
    memberIds.length === 0
      ? [[], []]
      : await Promise.all([
          client.punchRecord.findMany({
            where: {
              userId: { in: memberIds },
              dayKey: {
                gte: window.weekStartDayKey,
                lte: window.weekEndDayKey,
              },
              punched: true,
            },
            select: {
              userId: true,
              dayKey: true,
            },
          }),
          client.coffeeRecord.findMany({
            where: {
              teamId: input.teamId,
              userId: { in: memberIds },
              dayKey: {
                gte: window.weekStartDayKey,
                lte: window.weekEndDayKey,
              },
              deletedAt: null,
            },
            select: {
              userId: true,
            },
          }),
        ]);

  const dailyPunchCounts = new Map(dayKeys.map((dayKey) => [dayKey, 0]));
  const memberPunchCounts = new Map(memberIds.map((memberId) => [memberId, 0]));

  for (const record of punchRecords) {
    dailyPunchCounts.set(record.dayKey, (dailyPunchCounts.get(record.dayKey) ?? 0) + 1);
    memberPunchCounts.set(record.userId, (memberPunchCounts.get(record.userId) ?? 0) + 1);
  }

  const coffeeCounts = new Map(memberIds.map((memberId) => [memberId, 0]));
  for (const record of coffeeRecords) {
    coffeeCounts.set(record.userId, (coffeeCounts.get(record.userId) ?? 0) + 1);
  }

  const totalPunches = Array.from(dailyPunchCounts.values()).reduce((sum, value) => sum + value, 0);
  const fullAttendanceDays =
    members.length > 0
      ? Array.from(dailyPunchCounts.values()).filter((value) => value === members.length).length
      : 0;

  const peakEntry = dayKeys.reduce<{ dayKey: string; value: number } | undefined>((best, dayKey) => {
    const value = dailyPunchCounts.get(dayKey) ?? 0;

    if (!best || value > best.value) {
      return { dayKey, value };
    }

    return best;
  }, undefined);
  const lowEntry = dayKeys.reduce<{ dayKey: string; value: number } | undefined>((best, dayKey) => {
    const value = dailyPunchCounts.get(dayKey) ?? 0;

    if (!best || value < best.value) {
      return { dayKey, value };
    }

    return best;
  }, undefined);

  const topMembers = formatTopMembers(members, memberPunchCounts);
  const coffeeHighlight = formatCoffeeHighlight(members, coffeeCounts);
  const seasonProgress = activeSeason
    ? {
        filledSlots: activeSeason.filledSlots,
        targetSlots: activeSeason.targetSlots,
        status: activeSeason.status,
      }
    : undefined;

  const overviewSummary = buildWeeklyReportSummary({
    version: 1,
    weekStartDayKey: window.weekStartDayKey,
    weekEndDayKey: window.weekEndDayKey,
    generatedAt: now.toISOString(),
    generatedByUserId: input.generatedByUserId,
    summary: "",
    metrics: {
      totalPunches,
      fullAttendanceDays,
      peakDay: peakEntry,
      lowDay: lowEntry,
      seasonProgress,
    },
    highlights: {
      topMembers,
      coffee: coffeeHighlight,
    },
    sections: [],
  });

  const sections = [
    {
      id: "overview",
      title: "本周概览",
      summary: overviewSummary,
      bullets: [
        `统计区间：${window.weekStartDayKey} 至 ${window.weekEndDayKey}`,
        peakEntry ? `峰值日 ${peakEntry.dayKey}，团队完成 ${peakEntry.value} 次打卡` : "本周暂无峰值日",
        lowEntry ? `低谷日 ${lowEntry.dayKey}，团队完成 ${lowEntry.value} 次打卡` : "本周暂无低谷日",
      ],
    },
    {
      id: "members",
      title: "成员高光",
      summary:
        topMembers.length > 0 ? `本周共记录 ${topMembers.length} 位高光成员。` : "本周还没有有效打卡高光。",
      bullets:
        topMembers.length > 0
          ? topMembers.map((member) => member.value)
          : ["本周还没有成员完成有效打卡。"],
    },
    {
      id: "coffee",
      title: "咖啡观察",
      summary: coffeeHighlight?.value ?? "本周暂无续命记录。",
      bullets: [
        `团队本周共喝了 ${Array.from(coffeeCounts.values()).reduce((sum, value) => sum + value, 0)} 杯咖啡`,
        coffeeHighlight ? `续命担当：${coffeeHighlight.value}` : "续命担当：暂无",
      ],
    },
  ];

  const snapshot: WeeklyReportSnapshot = {
    version: 1,
    weekStartDayKey: window.weekStartDayKey,
    weekEndDayKey: window.weekEndDayKey,
    generatedAt: now.toISOString(),
    generatedByUserId: input.generatedByUserId,
    summary: "",
    metrics: {
      totalPunches,
      fullAttendanceDays,
      peakDay: peakEntry,
      lowDay: lowEntry,
      seasonProgress,
    },
    highlights: {
      topMembers,
      coffee: coffeeHighlight,
    },
    sections,
  };

  snapshot.summary = buildWeeklyReportSummary(snapshot);

  return snapshot;
}

export async function upsertWeeklyReportDraft(
  input: AdminWeeklyReportInput,
): Promise<WeeklyReportDraftRecord> {
  const client = input.client ?? prisma;
  const now = input.now ?? new Date();
  const admin = await requireAdmin({ ...input, client });
  const snapshot = await buildWeeklyReportSnapshot({
    teamId: admin.teamId,
    generatedByUserId: admin.id,
    now,
    client,
  });

  const draft = await client.weeklyReportDraft.upsert({
    where: {
      teamId_createdByUserId_weekStartDayKey: {
        teamId: admin.teamId,
        createdByUserId: admin.id,
        weekStartDayKey: snapshot.weekStartDayKey,
      },
    },
    update: {
      summary: snapshot.summary,
      payloadJson: JSON.stringify(snapshot),
    },
    create: {
      teamId: admin.teamId,
      createdByUserId: admin.id,
      weekStartDayKey: snapshot.weekStartDayKey,
      summary: snapshot.summary,
      payloadJson: JSON.stringify(snapshot),
    },
  });

  return serializeDraft(draft);
}

export async function getCurrentWeeklyReportDraft(
  input: AdminWeeklyReportInput,
): Promise<WeeklyReportDraftRecord | null> {
  const client = input.client ?? prisma;
  const admin = await requireAdmin({ ...input, client });
  const now = input.now ?? new Date();
  const window = getCurrentWeeklyReportWindow(now);
  const draft = await client.weeklyReportDraft.findUnique({
    where: {
      teamId_createdByUserId_weekStartDayKey: {
        teamId: admin.teamId,
        createdByUserId: admin.id,
        weekStartDayKey: window.weekStartDayKey,
      },
    },
  });

  return draft ? serializeDraft(draft) : null;
}

export async function publishWeeklyReportDraft(
  input: AdminWeeklyReportInput,
): Promise<TeamDynamic> {
  const result = await publishWeeklyReportDraftWithStatus(input);
  return result.dynamic;
}

export async function publishWeeklyReportDraftWithStatus(
  input: AdminWeeklyReportInput,
): Promise<{ dynamic: TeamDynamic; created: boolean }> {
  const client = input.client ?? prisma;
  const now = input.now ?? new Date();
  const admin = await requireAdmin({ ...input, client });
  const draft = await getCurrentWeeklyReportDraft({ ...input, client, now });

  if (!draft) {
    throw new WeeklyReportServiceError("DRAFT_NOT_FOUND", 404, "当前周还没有可发布的草稿。");
  }

  const sourceType = "weekly-report";
  const sourceId = `${admin.teamId}:${draft.weekStartDayKey}`;

  const existing = await client.teamDynamic.findUnique({
    where: {
      teamId_sourceType_sourceId: {
        teamId: admin.teamId,
        sourceType,
        sourceId,
      },
    },
  });

  if (existing) {
    return { dynamic: existing, created: false };
  }

  try {
    const dynamic = await client.teamDynamic.create({
      data: {
        teamId: admin.teamId,
        type: TEAM_DYNAMIC_TYPES.WEEKLY_REPORT_CREATED,
        title: "本周战报已经生成",
        summary: draft.summary,
        payloadJson: JSON.stringify(draft.snapshot),
        actorUserId: admin.id,
        sourceType,
        sourceId,
        occurredAt: now,
      },
    });

    return { dynamic, created: true };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existing = await client.teamDynamic.findUnique({
      where: {
        teamId_sourceType_sourceId: {
          teamId: admin.teamId,
          sourceType,
          sourceId,
        },
      },
    });

    if (existing) {
      return { dynamic: existing, created: false };
    }

    throw error;
  }
}
