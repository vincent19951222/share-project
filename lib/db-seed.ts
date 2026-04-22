import { prisma } from "@/lib/prisma";
import { hashPassword } from "./auth";

export const SEED_TEAM = {
  code: "ROOM-88",
  name: "晓风战队",
};

export const SEED_USERS = [
  { username: "li", avatarKey: "male1", coins: 10 },
  { username: "luo", avatarKey: "male2", coins: 10 },
  { username: "liu", avatarKey: "female1", coins: 10 },
  { username: "wu", avatarKey: "male3", coins: 10 },
  { username: "ji", avatarKey: "female2", coins: 10 },
];

export const SEED_PUNCH_DAY = 22;
export const SEED_PUNCH_CREATED_AT = new Date("2026-04-22T00:00:00+08:00");

export async function seedDatabase(): Promise<void> {
  const passwordHash = await hashPassword("0000");

  const team = await prisma.team.upsert({
    where: { code: SEED_TEAM.code },
    update: { name: SEED_TEAM.name },
    create: { code: SEED_TEAM.code, name: SEED_TEAM.name },
  });

  const seededUsernames = new Set(SEED_USERS.map((user) => user.username));
  const seededUserIds: string[] = [];

  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { username: seedUser.username },
      update: {
        avatarKey: seedUser.avatarKey,
        coins: seedUser.coins,
        password: passwordHash,
        teamId: team.id,
      },
      create: {
        username: seedUser.username,
        password: passwordHash,
        avatarKey: seedUser.avatarKey,
        coins: seedUser.coins,
        teamId: team.id,
      },
    });
    seededUserIds.push(user.id);
  }

  await prisma.punchRecord.deleteMany({
    where: { userId: { in: seededUserIds } },
  });

  await prisma.punchRecord.createMany({
    data: seededUserIds.map((userId) => ({
      userId,
      dayIndex: SEED_PUNCH_DAY,
      punched: true,
      punchType: "default",
      createdAt: SEED_PUNCH_CREATED_AT,
    })),
  });

  await prisma.boardNote.deleteMany({
    where: {
      authorId: { in: seededUserIds },
    },
  });

  await prisma.user.updateMany({
    where: { id: { in: seededUserIds } },
    data: { coins: 10 },
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
    await prisma.punchRecord.deleteMany({ where: { userId: { in: extraUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: extraUserIds } } });
  }
}
