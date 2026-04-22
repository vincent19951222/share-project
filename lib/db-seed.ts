import { prisma } from "@/lib/prisma";
import { hashPassword } from "./auth";

export const SEED_TEAM = {
  code: "ROOM-88",
  name: "晓风战队",
};

export const SEED_USERS = [
  { username: "li", avatarKey: "male1", coins: 345 },
  { username: "luo", avatarKey: "male2", coins: 280 },
  { username: "liu", avatarKey: "female1", coins: 310 },
  { username: "wu", avatarKey: "male3", coins: 225 },
  { username: "ji", avatarKey: "female2", coins: 290 },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export async function seedDatabase(): Promise<void> {
  const today = 18;
  const passwordHash = await hashPassword("0000");

  const team = await prisma.team.upsert({
    where: { code: SEED_TEAM.code },
    update: { name: SEED_TEAM.name },
    create: { code: SEED_TEAM.code, name: SEED_TEAM.name },
  });

  const rand = seededRandom(42);
  const seededUsernames = new Set(SEED_USERS.map((user) => user.username));

  for (const seedUser of SEED_USERS) {
    const user = await prisma.user.upsert({
      where: { username: seedUser.username },
      update: { avatarKey: seedUser.avatarKey, coins: seedUser.coins, password: passwordHash },
      create: {
        username: seedUser.username,
        password: passwordHash,
        avatarKey: seedUser.avatarKey,
        coins: seedUser.coins,
        teamId: team.id,
      },
    });

    for (let day = 1; day < today; day++) {
      const punched = rand() > 0.2;
      await prisma.punchRecord.upsert({
        where: { userId_dayIndex: { userId: user.id, dayIndex: day } },
        update: { punched },
        create: {
          userId: user.id,
          dayIndex: day,
          punched,
        },
      });
    }
  }

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
