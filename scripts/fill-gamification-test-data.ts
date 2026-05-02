import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import "dotenv/config";
import { ACTIVITY_EVENT_TYPES, buildCoffeeAddActivityMessage, buildPunchActivityMessage } from "@/lib/activity-events";
import { getPunchRewardForStreak } from "@/lib/economy";
import { FITNESS_PUNCH_SOURCE_TYPE, FITNESS_PUNCH_TICKET_GRANT_REASON } from "@/lib/gamification/fitness-ticket";
import { resolveSqliteDatabasePath, resolveSqliteDatabaseUrl } from "@/lib/sqlite-db-config";

const START_DAY_KEY = "2026-04-01";
const END_DAY_KEY = "2026-05-02";
const DAY_MS = 24 * 60 * 60 * 1000;
const adapter = new PrismaBetterSqlite3({ url: resolveSqliteDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

type UserFixture = {
  id: string;
  username: string;
  avatarKey: string;
  teamId: string;
};

type UserSummary = {
  username: string;
  punchCount: number;
  coffeeCount: number;
  coins: number;
  tickets: number;
  currentStreak: number;
  lastPunchDayKey: string | null;
};

const ACCEPTANCE_INVENTORY: Record<string, Record<string, number>> = {
  li: {
    luckin_coffee_coupon: 2,
    small_boost_coupon: 1,
    team_broadcast_coupon: 1,
  },
  luo: {
    task_reroll_coupon: 1,
    small_boost_coupon: 1,
    drink_water_ping: 1,
    luckin_coffee_coupon: 1,
  },
  liu: {
    double_niuma_coupon: 1,
    team_standup_ping: 1,
  },
  wu: {
    fitness_leave_coupon: 1,
    walk_ping: 1,
  },
  ji: {
    task_reroll_coupon: 1,
    season_sprint_coupon: 1,
    share_info_ping: 1,
  },
};

function createRng(seed: number) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const rng = createRng(20260502);

function randomInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function chance(probability: number) {
  return rng() < probability;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
}

function formatDayKey(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function enumerateDayKeys(startDayKey: string, endDayKey: string) {
  const days: string[] = [];
  const start = parseDayKey(startDayKey).getTime();
  const end = parseDayKey(endDayKey).getTime();

  for (let time = start; time <= end; time += DAY_MS) {
    days.push(formatDayKey(new Date(time)));
  }

  return days;
}

function shanghaiDate(dayKey: string, hour: number, minute: number, second: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second));
}

function dayIndex(dayKey: string) {
  return Number(dayKey.slice(-2));
}

function punchProbability(userIndex: number, streak: number, dayKey: string) {
  const date = parseDayKey(dayKey);
  const weekday = date.getUTCDay();
  const weekendPenalty = weekday === 0 || weekday === 6 ? 0.08 : 0;
  const userBias = [0.84, 0.78, 0.72, 0.68, 0.62][userIndex % 5] ?? 0.7;
  const streakPenalty = Math.min(streak, 8) * 0.018;

  return Math.max(0.38, userBias - weekendPenalty - streakPenalty);
}

function coffeeCountForDay(punched: boolean) {
  if (!punched) {
    return chance(0.28) ? 1 : 0;
  }

  if (chance(0.12)) {
    return 0;
  }

  return chance(0.28) ? 2 : 1;
}

async function resetTeamData(teamId: string, userIds: string[]) {
  const teamDynamics = await prisma.teamDynamic.findMany({
    where: { teamId },
    select: { id: true },
  });
  const teamDynamicIds = teamDynamics.map((item) => item.id);
  const lotteryDraws = await prisma.lotteryDraw.findMany({
    where: { teamId },
    select: { id: true },
  });
  const lotteryDrawIds = lotteryDraws.map((draw) => draw.id);
  const seasons = await prisma.season.findMany({
    where: { teamId },
    select: { id: true },
  });
  const seasonIds = seasons.map((season) => season.id);

  await prisma.socialInvitationResponse.deleteMany({ where: { teamId } });
  await prisma.socialInvitation.deleteMany({ where: { teamId } });
  await prisma.realWorldRedemption.deleteMany({ where: { teamId } });
  await prisma.itemUseRecord.deleteMany({ where: { teamId } });
  await prisma.lotteryDrawResult.deleteMany({ where: { drawId: { in: lotteryDrawIds } } });
  await prisma.lotteryDraw.deleteMany({ where: { teamId } });
  await prisma.inventoryItem.deleteMany({ where: { teamId } });
  await prisma.lotteryTicketLedger.deleteMany({ where: { teamId } });
  await prisma.dailyTaskAssignment.deleteMany({ where: { teamId } });
  await prisma.enterpriseWechatPushEvent.deleteMany({ where: { teamId } });
  await prisma.enterpriseWechatSendLog.deleteMany({ where: { teamId } });
  await prisma.teamDynamicReadState.deleteMany({ where: { teamDynamicId: { in: teamDynamicIds } } });
  await prisma.teamDynamic.deleteMany({ where: { teamId } });
  await prisma.activityEvent.deleteMany({ where: { teamId } });
  await prisma.coffeeRecord.deleteMany({ where: { teamId } });
  await prisma.punchRecord.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.seasonMemberStat.deleteMany({ where: { seasonId: { in: seasonIds } } });
  await prisma.season.deleteMany({ where: { teamId } });
}

async function createSeason(teamId: string, monthKey: string, goalName: string, status: string, startedAt: Date, endedAt: Date | null) {
  return prisma.season.create({
    data: {
      teamId,
      monthKey,
      goalName,
      status,
      targetSlots: 120,
      filledSlots: 0,
      startedAt,
      endedAt,
    },
  });
}

async function fillUserData(user: UserFixture, userIndex: number, dayKeys: string[], seasonsByMonth: Map<string, string>) {
  let streak = 0;
  let lastPunchDayKey: string | null = null;
  let coins = 0;
  let tickets = 0;
  let punchCount = 0;
  let coffeeCount = 0;
  const seasonStats = new Map<string, { income: number; slots: number; firstContributionAt: Date | null }>();

  for (const dayKey of dayKeys) {
    const punched = chance(punchProbability(userIndex, streak, dayKey));
    const createdAt = shanghaiDate(dayKey, randomInt(6, 22), randomInt(0, 59), randomInt(0, 59));
    const seasonId = seasonsByMonth.get(dayKey.slice(0, 7)) ?? null;

    if (punched) {
      streak += 1;
      lastPunchDayKey = dayKey;
      const reward = getPunchRewardForStreak(streak);
      coins += reward;
      tickets += 1;
      punchCount += 1;

      const punch = await prisma.punchRecord.create({
        data: {
          userId: user.id,
          seasonId,
          dayIndex: dayIndex(dayKey),
          dayKey,
          punched: true,
          punchType: "default",
          streakAfterPunch: streak,
          assetAwarded: reward,
          baseAssetAwarded: reward,
          boostAssetBonus: 0,
          baseSeasonContribution: seasonId ? reward : 0,
          boostSeasonBonus: 0,
          seasonContributionAwarded: seasonId ? reward : 0,
          countedForSeasonSlot: Boolean(seasonId),
          createdAt,
        },
      });

      await prisma.activityEvent.create({
        data: {
          teamId: user.teamId,
          userId: user.id,
          type: ACTIVITY_EVENT_TYPES.PUNCH,
          message: buildPunchActivityMessage(user.username, reward),
          assetAwarded: reward,
          createdAt,
        },
      });

      await prisma.lotteryTicketLedger.create({
        data: {
          userId: user.id,
          teamId: user.teamId,
          dayKey,
          delta: 1,
          balanceAfter: tickets,
          reason: FITNESS_PUNCH_TICKET_GRANT_REASON,
          sourceType: FITNESS_PUNCH_SOURCE_TYPE,
          sourceId: punch.id,
          metadataJson: JSON.stringify({ punchRecordId: punch.id, dayKey, punchType: "default" }),
          createdAt,
        },
      });

      if (seasonId) {
        const stat = seasonStats.get(seasonId) ?? { income: 0, slots: 0, firstContributionAt: null };
        stat.income += reward;
        stat.slots += 1;
        stat.firstContributionAt ??= createdAt;
        seasonStats.set(seasonId, stat);
      }
    } else {
      streak = 0;
    }

    const cups = coffeeCountForDay(punched);
    for (let index = 0; index < cups; index += 1) {
      const coffeeCreatedAt = shanghaiDate(dayKey, randomInt(9, 21), randomInt(0, 59), randomInt(0, 59));
      coffeeCount += 1;

      await prisma.coffeeRecord.create({
        data: {
          userId: user.id,
          teamId: user.teamId,
          dayKey,
          createdAt: coffeeCreatedAt,
        },
      });

      await prisma.activityEvent.create({
        data: {
          teamId: user.teamId,
          userId: user.id,
          type: ACTIVITY_EVENT_TYPES.COFFEE_ADD,
          message: buildCoffeeAddActivityMessage(user.username, index + 1),
          assetAwarded: null,
          createdAt: coffeeCreatedAt,
        },
      });
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { coins, ticketBalance: tickets, currentStreak: streak, lastPunchDayKey },
  });

  for (const [seasonId, stat] of seasonStats) {
    await prisma.seasonMemberStat.create({
      data: {
        seasonId,
        userId: user.id,
        seasonIncome: stat.income,
        slotContribution: stat.slots,
        colorIndex: userIndex,
        memberOrder: userIndex,
        firstContributionAt: stat.firstContributionAt,
      },
    });
  }

  return { username: user.username, punchCount, coffeeCount, coins, tickets, currentStreak: streak, lastPunchDayKey };
}

async function seedAcceptanceInventory(users: UserFixture[]) {
  for (const user of users) {
    const items = ACCEPTANCE_INVENTORY[user.username] ?? {};

    for (const [itemId, quantity] of Object.entries(items)) {
      await prisma.inventoryItem.upsert({
        where: {
          userId_itemId: {
            userId: user.id,
            itemId,
          },
        },
        create: {
          userId: user.id,
          teamId: user.teamId,
          itemId,
          quantity,
        },
        update: {
          quantity,
        },
      });
    }
  }
}

async function main() {
  const dbPath = resolveSqliteDatabasePath();

  if (!dbPath.endsWith("/Users/vincent/data/share-project/dev.db")) {
    throw new Error(`Refusing to fill unexpected database: ${dbPath}`);
  }

  const team = await prisma.team.findFirst({
    include: { users: { orderBy: { createdAt: "asc" } } },
  });

  if (!team || team.users.length === 0) {
    throw new Error("No team/users found. Run the base seed first.");
  }

  const userIds = team.users.map((user) => user.id);

  await resetTeamData(team.id, userIds);

  const aprilSeason = await createSeason(
    team.id,
    "2026-04",
    "4月减脂冲刺",
    "ENDED",
    shanghaiDate("2026-04-01", 0, 0, 0),
    shanghaiDate("2026-04-30", 23, 59, 59),
  );
  const maySeason = await createSeason(
    team.id,
    "2026-05",
    "5月补给冲刺",
    "ACTIVE",
    shanghaiDate("2026-05-01", 0, 0, 0),
    null,
  );
  const seasonsByMonth = new Map([
    ["2026-04", aprilSeason.id],
    ["2026-05", maySeason.id],
  ]);

  const dayKeys = enumerateDayKeys(START_DAY_KEY, END_DAY_KEY);
  const summaries: UserSummary[] = [];

  for (const [index, user] of team.users.entries()) {
    summaries.push(await fillUserData(user, index, dayKeys, seasonsByMonth));
  }

  await seedAcceptanceInventory(team.users);

  for (const season of [aprilSeason, maySeason]) {
    const slots = await prisma.punchRecord.count({
      where: { seasonId: season.id, punched: true, countedForSeasonSlot: true },
    });
    const income = await prisma.punchRecord.aggregate({
      where: { seasonId: season.id, punched: true },
      _sum: { seasonContributionAwarded: true },
    });

    await prisma.season.update({
      where: { id: season.id },
      data: {
        filledSlots: Math.min(slots, season.targetSlots),
      },
    });

    await prisma.teamDynamic.create({
      data: {
        teamId: team.id,
        type: "GAME_TEAM_BROADCAST",
        title: `${season.goalName} 测试数据已生成`,
        summary: `累计 ${slots} 次健身打卡，贡献 ${income._sum.seasonContributionAwarded ?? 0} 银子`,
        payloadJson: JSON.stringify({ seasonId: season.id, slots, income: income._sum.seasonContributionAwarded ?? 0 }),
        sourceType: "test-data",
        sourceId: `${season.id}:generated`,
        importance: "normal",
        occurredAt: new Date(),
      },
    });
  }

  console.log(`Database: ${dbPath}`);
  console.log(`Range: ${START_DAY_KEY}..${END_DAY_KEY}`);
  for (const summary of summaries) {
    console.log(
      `${summary.username}: punch=${summary.punchCount}, coffee=${summary.coffeeCount}, coins=${summary.coins}, tickets=${summary.tickets}, streak=${summary.currentStreak}, last=${summary.lastPunchDayKey ?? "-"}`,
    );
  }
  console.log("Acceptance inventory seeded for: li, luo, liu, wu, ji");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
