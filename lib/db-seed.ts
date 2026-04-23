import { prisma } from "@/lib/prisma";
import { hashPassword } from "./auth";

export const SEED_TEAM = {
  code: "ROOM-88",
  name: "晓风战队",
};

export const SEED_USERS = [
  { username: "li", avatarKey: "male1", coins: 10, role: "ADMIN" },
  { username: "luo", avatarKey: "male2", coins: 10, role: "MEMBER" },
  { username: "liu", avatarKey: "female1", coins: 10, role: "MEMBER" },
  { username: "wu", avatarKey: "male3", coins: 10, role: "MEMBER" },
  { username: "ji", avatarKey: "female2", coins: 10, role: "MEMBER" },
];

export const SEED_PUNCH_DAY = 22;
export const SEED_PUNCH_DAY_KEY = "2026-04-22";
export const SEED_PUNCH_CREATED_AT = new Date("2026-04-22T00:00:00+08:00");

export async function seedDatabase(): Promise<void> {
  const passwordHash = await hashPassword("0000");

  const team = await prisma.team.upsert({
    where: { code: SEED_TEAM.code },
    update: { name: SEED_TEAM.name },
    create: { code: SEED_TEAM.code, name: SEED_TEAM.name },
  });

  const existingSeasons = await prisma.season.findMany({
    where: { teamId: team.id },
    select: { id: true },
  });
  const existingSeasonIds = existingSeasons.map((season) => season.id);

  if (existingSeasonIds.length > 0) {
    await prisma.punchRecord.deleteMany({
      where: { seasonId: { in: existingSeasonIds } },
    });
    await prisma.seasonMemberStat.deleteMany({
      where: { seasonId: { in: existingSeasonIds } },
    });
    await prisma.season.deleteMany({
      where: { id: { in: existingSeasonIds } },
    });
  }

  await prisma.activityEvent.deleteMany({
    where: { teamId: team.id },
  });

  const seededUsernames = new Set(SEED_USERS.map((user) => user.username));
  const seededUserIds: string[] = [];

  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { username: seedUser.username },
      update: {
        avatarKey: seedUser.avatarKey,
        role: seedUser.role,
        currentStreak: 0,
        lastPunchDayKey: null,
        coins: seedUser.coins,
        password: passwordHash,
        teamId: team.id,
      },
      create: {
        username: seedUser.username,
        password: passwordHash,
        avatarKey: seedUser.avatarKey,
        role: seedUser.role,
        currentStreak: 0,
        lastPunchDayKey: null,
        coins: seedUser.coins,
        teamId: team.id,
      },
    });
    seededUserIds.push(user.id);
  }

  // The seed script owns this fixed local roster and resets it to a deterministic fixture.
  await prisma.punchRecord.deleteMany({
    where: { userId: { in: seededUserIds } },
  });

  await prisma.punchRecord.createMany({
    data: seededUserIds.map((userId) => ({
      userId,
      seasonId: null,
      dayIndex: SEED_PUNCH_DAY,
      dayKey: SEED_PUNCH_DAY_KEY,
      punched: true,
      punchType: "default",
      streakAfterPunch: 0,
      assetAwarded: 0,
      countedForSeasonSlot: false,
      createdAt: SEED_PUNCH_CREATED_AT,
    })),
  });

  await prisma.user.updateMany({
    where: { id: { in: seededUserIds } },
    data: {
      coins: 10,
      currentStreak: 0,
      lastPunchDayKey: null,
    },
  });

  const extraUsers = await prisma.user.findMany({
    where: {
      teamId: team.id,
      username: { notIn: Array.from(seededUsernames) },
    },
    select: { id: true },
  });

  if (extraUsers.length > 0) {
    const extraUserIds = extraUsers.map((user) => user.id);
    await prisma.boardNote.deleteMany({ where: { authorId: { in: extraUserIds } } });
    await prisma.activityEvent.deleteMany({ where: { userId: { in: extraUserIds } } });
    await prisma.punchRecord.deleteMany({ where: { userId: { in: extraUserIds } } });
    await prisma.seasonMemberStat.deleteMany({ where: { userId: { in: extraUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: extraUserIds } } });
  }
}
