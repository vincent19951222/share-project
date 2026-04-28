import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
const adapter = new PrismaBetterSqlite3({ url: "file:./.local/dev.db" });
const prisma = new PrismaClient({ adapter });

const USERS = [
  { id: "cmoa64j0b0001e4kd3jq8xe40", username: "li" },
  { id: "cmoa64j0f0002e4kdk2x30ral", username: "luo" },
  { id: "cmoa64j0j0003e4kdk0943c0b", username: "shadow" },
  { id: "cmoa64j0m0004e4kdjuv27n2f", username: "wu" },
  { id: "cmoa64j0p0005e4kdl6i7hg8p", username: "最美的女人" },
];

const TEAM_ID = "cmoa64j040000e4kd6ffwdmoc";
const SEASON_ID = "manual-season-1776873003025";

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function dayKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function generatePunchPlan(totalDays: number): boolean[] {
  const plan: boolean[] = [];
  let streak = 0;

  for (let i = 0; i < totalDays; i++) {
    if (streak === 0) {
      // 断开后重新开始，70% 概率开始打卡
      const start = Math.random() < 0.7;
      plan.push(start);
      streak = start ? 1 : 0;
    } else {
      // 连续打卡中，根据连续天数递减继续概率
      // 连续1-2天: 85%, 连续3-5天: 70%, 连续6-8天: 55%, 连续9天+: 40%
      let continueProb: number;
      if (streak <= 2) continueProb = 0.85;
      else if (streak <= 5) continueProb = 0.7;
      else if (streak <= 8) continueProb = 0.55;
      else continueProb = 0.4;

      const cont = Math.random() < continueProb;
      plan.push(cont);
      streak = cont ? streak + 1 : 0;
    }
  }

  return plan;
}

async function main() {
  // 清除 4 月旧数据
  await prisma.punchRecord.deleteMany({
    where: { dayKey: { startsWith: "2026-04" } },
  });
  await prisma.coffeeRecord.deleteMany({
    where: { dayKey: { startsWith: "2026-04" } },
  });
  await prisma.activityEvent.deleteMany({
    where: { type: { in: ["PUNCH", "COFFEE"] } },
  });

  const year = 2026;
  const month = 4;
  const daysInMonth = 30;

  for (const user of USERS) {
    const plan = generatePunchPlan(daysInMonth);
    let streak = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dk = dayKey(year, month, day);
      const punched = plan[day - 1];

      if (punched) {
        streak++;
      } else {
        streak = 0;
      }

      // 插入打卡记录
      await prisma.punchRecord.create({
        data: {
          userId: user.id,
          seasonId: SEASON_ID,
          dayIndex: day,
          dayKey: dk,
          punched,
          punchType: punched ? "morning" : null,
          streakAfterPunch: streak,
          assetAwarded: 0,
          countedForSeasonSlot: punched,
          createdAt: new Date(`${dk}T0${randomInt(6, 9)}:${randomInt(10, 59)}:${randomInt(10, 59)}.000Z`),
        },
      });

      // 咖啡：每天 0-2 杯
      const coffeeCount = randomInt(0, 2);
      for (let c = 0; c < coffeeCount; c++) {
        await prisma.coffeeRecord.create({
          data: {
            userId: user.id,
            teamId: TEAM_ID,
            dayKey: dk,
            createdAt: new Date(`${dk}T${randomInt(10, 22)}:${randomInt(10, 59)}:${randomInt(10, 59)}.000Z`),
          },
        });
      }
    }
  }

  // 统计
  const punchStats = await prisma.punchRecord.groupBy({
    by: ["userId"],
    where: { punched: true, dayKey: { startsWith: "2026-04" } },
    _count: { id: true },
  });

  const coffeeStats = await prisma.coffeeRecord.groupBy({
    by: ["userId"],
    where: { dayKey: { startsWith: "2026-04" } },
    _count: { id: true },
  });

  console.log("\n=== 4月打卡统计 ===");
  for (const user of USERS) {
    const p = punchStats.find((s) => s.userId === user.id)?._count.id ?? 0;
    const c = coffeeStats.find((s) => s.userId === user.id)?._count.id ?? 0;
    console.log(`${user.username}: 打卡 ${p}/30 天, 咖啡 ${c} 杯`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
