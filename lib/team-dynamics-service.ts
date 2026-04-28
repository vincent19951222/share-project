import type { Prisma, TeamDynamic } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  TeamDynamicFilterType,
  TeamDynamicListItem,
  TeamDynamicListView,
  TeamDynamicType,
} from "@/lib/team-dynamics";

type PrismaLike = typeof prisma | Prisma.TransactionClient;

interface CreateTeamDynamicInput {
  teamId: string;
  type: TeamDynamicType;
  title: string;
  summary: string;
  payload: unknown;
  actorUserId?: string | null;
  sourceType?: string | null;
  sourceId?: string | null;
  importance?: "normal" | "high";
  occurredAt: Date;
  client?: PrismaLike;
}

interface TeamDynamicWithReadState extends TeamDynamic {
  readStates: Array<{ readAt: Date }>;
}

function parsePayload(payloadJson: string): Record<string, unknown> {
  try {
    return JSON.parse(payloadJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function serializeItem(item: TeamDynamicWithReadState): TeamDynamicListItem {
  return {
    id: item.id,
    type: item.type as TeamDynamicType,
    title: item.title,
    summary: item.summary,
    occurredAt: item.occurredAt.toISOString(),
    payload: parsePayload(item.payloadJson),
    isRead: item.readStates.length > 0,
    importance: item.importance === "high" ? "high" : "normal",
  };
}

export async function createOrReuseTeamDynamic(input: CreateTeamDynamicInput) {
  const client = input.client ?? prisma;

  if (input.sourceType && input.sourceId) {
    const existing = await client.teamDynamic.findUnique({
      where: {
        teamId_sourceType_sourceId: {
          teamId: input.teamId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
    });

    if (existing) {
      return existing;
    }
  }

  return client.teamDynamic.create({
    data: {
      teamId: input.teamId,
      type: input.type,
      title: input.title,
      summary: input.summary,
      payloadJson: JSON.stringify(input.payload ?? {}),
      actorUserId: input.actorUserId ?? null,
      sourceType: input.sourceType ?? null,
      sourceId: input.sourceId ?? null,
      importance: input.importance ?? "normal",
      occurredAt: input.occurredAt,
    },
  });
}

export async function listTeamDynamicsForUser(input: {
  userId: string;
  view: TeamDynamicListView;
  unreadOnly: boolean;
  type: TeamDynamicFilterType;
  limit: number;
  cursor: string | null;
}) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: input.userId },
    select: { teamId: true },
  });

  const readStateWhere = { none: { userId: input.userId } };
  const where: Prisma.TeamDynamicWhereInput = {
    teamId: user.teamId,
    ...(input.type === "ALL" ? {} : { type: input.type }),
    ...(input.unreadOnly ? { readStates: readStateWhere } : {}),
    ...(input.cursor ? { occurredAt: { lt: new Date(input.cursor) } } : {}),
  };

  const [items, unreadCount] = await Promise.all([
    prisma.teamDynamic.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: input.limit,
      include: {
        readStates: {
          where: { userId: input.userId },
          select: { readAt: true },
        },
      },
    }),
    prisma.teamDynamic.count({
      where: {
        teamId: user.teamId,
        readStates: readStateWhere,
      },
    }),
  ]);

  return {
    unreadCount,
    items: items.map(serializeItem),
    nextCursor:
      items.length === input.limit
        ? items.at(-1)?.occurredAt.toISOString() ?? null
        : null,
  };
}

export async function markTeamDynamicRead(input: {
  userId: string;
  teamDynamicId: string;
}) {
  const [user, dynamic] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { teamId: true },
    }),
    prisma.teamDynamic.findUnique({
      where: { id: input.teamDynamicId },
      select: { id: true, teamId: true },
    }),
  ]);

  if (!dynamic || dynamic.teamId !== user.teamId) {
    return null;
  }

  return prisma.teamDynamicReadState.upsert({
    where: {
      teamDynamicId_userId: {
        teamDynamicId: input.teamDynamicId,
        userId: input.userId,
      },
    },
    update: { readAt: new Date() },
    create: {
      teamDynamicId: input.teamDynamicId,
      userId: input.userId,
      readAt: new Date(),
    },
  });
}

export async function markAllTeamDynamicsRead(input: { userId: string; teamId: string }) {
  const unread = await prisma.teamDynamic.findMany({
    where: {
      teamId: input.teamId,
      readStates: {
        none: {
          userId: input.userId,
        },
      },
    },
    select: { id: true },
  });

  if (unread.length === 0) {
    return 0;
  }

  const now = new Date();

  await prisma.$transaction(
    unread.map((item) =>
      prisma.teamDynamicReadState.upsert({
        where: {
          teamDynamicId_userId: {
            teamDynamicId: item.id,
            userId: input.userId,
          },
        },
        update: { readAt: now },
        create: {
          teamDynamicId: item.id,
          userId: input.userId,
          readAt: now,
        },
      }),
    ),
  );

  return unread.length;
}
