import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, POST } from "@/app/api/board/punch/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { getCurrentBoardDay } from "@/lib/board-state";
import { getPreviousShanghaiDayKey, getShanghaiDayKey } from "@/lib/economy";
import { createCookieValue } from "@/lib/auth";

function request(method: "POST" | "DELETE", userId?: string) {
  return new NextRequest("http://localhost/api/board/punch", {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify({}),
  });
}

describe("/api/board/punch", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let today: number;
  let todayDayKey: string;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    today = getCurrentBoardDay(fixedNow);
    todayDayKey = getShanghaiDayKey(fixedNow);
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function resetState() {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const teamUsers = await prisma.user.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });
    const seasons = await prisma.season.findMany({
      where: { teamId: user.teamId },
      select: { id: true },
    });
    const seasonIds = seasons.map((season) => season.id);

    await prisma.punchRecord.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.itemUseRecord.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.inventoryItem.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.lotteryTicketLedger.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.activityEvent.deleteMany({
      where: {
        userId: { in: teamUsers.map((member) => member.id) },
      },
    });
    await prisma.teamDynamicReadState.deleteMany();
    await prisma.teamDynamic.deleteMany({
      where: {
        teamId: user.teamId,
      },
    });
    await prisma.enterpriseWechatPushEvent.deleteMany({
      where: {
        teamId: user.teamId,
      },
    });
    await prisma.enterpriseWechatSendLog.deleteMany({
      where: {
        teamId: user.teamId,
      },
    });
    await prisma.seasonMemberStat.deleteMany({
      where: {
        seasonId: { in: seasonIds },
      },
    });
    await prisma.season.deleteMany({
      where: { id: { in: seasonIds } },
    });
    await prisma.user.updateMany({
      where: { id: { in: teamUsers.map((member) => member.id) } },
      data: {
        coins: 10,
        currentStreak: 0,
        lastPunchDayKey: null,
      },
    });
  }

  async function createActiveSeason({
    filledSlots,
    targetSlots,
  }: {
    filledSlots: number;
    targetSlots: number;
  }) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    return prisma.season.create({
      data: {
        teamId: user.teamId,
        monthKey: "2026-04",
        goalName: "April sprint",
        status: "ACTIVE",
        targetSlots,
        filledSlots,
        startedAt: new Date("2026-04-01T00:00:00+08:00"),
      },
    });
  }

  it("returns 401 when unauthenticated", async () => {
    await resetState();

    const response = await POST(request("POST"));
    expect(response.status).toBe(401);
  });

  it("creates today's punch, increments coins once, and returns the latest snapshot without a season", async () => {
    await resetState();

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 1,
        lastPunchDayKey: "2026-04-23",
      },
    });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const currentUserRowIndex = body.snapshot.members.findIndex(
      (member: { id: string }) => member.id === body.snapshot.currentUserId,
    );

    const record = await prisma.punchRecord.findUnique({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(record?.punched).toBe(true);
    expect(record?.dayIndex).toBe(today);
    expect(record?.seasonId).toBeNull();
    expect(record?.assetAwarded).toBe(20);
    expect(record?.streakAfterPunch).toBe(2);
    expect(record?.countedForSeasonSlot).toBe(false);
    expect(after.coins).toBe(before.coins + 20);
    expect(after.currentStreak).toBe(2);
    expect(after.lastPunchDayKey).toBe(todayDayKey);
    expect(body.snapshot.currentUserId).toBe(userId);
    expect(body.snapshot.currentUser).toMatchObject({
      assetBalance: after.coins,
      currentStreak: 2,
      nextReward: 30,
      seasonIncome: 0,
      isAdmin: true,
    });
    expect(body.snapshot.activeSeason).toBeNull();
    expect(currentUserRowIndex).toBeGreaterThanOrEqual(0);
    expect(body.snapshot.gridData[currentUserRowIndex][today - 1]).toBe(true);

    const activity = await prisma.activityEvent.findFirstOrThrow({
      where: {
        userId,
        type: "PUNCH",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(activity.message).toBe("li 刚刚打卡，拿下 20 银子");
    expect(activity.assetAwarded).toBe(20);
  });

  it("binds a pending fitness boost to the new real punch without settling it", async () => {
    await resetState();
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId: (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).teamId,
        itemId: "small_boost_coupon",
        dayKey: todayDayKey,
        status: "PENDING",
        targetType: null,
        targetId: null,
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
      },
    });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });
    const boost = await prisma.itemUseRecord.findFirstOrThrow({
      where: { userId, itemId: "small_boost_coupon" },
    });

    expect(boost).toMatchObject({
      status: "PENDING",
      targetType: "FITNESS_PUNCH",
      targetId: punch.id,
    });
    expect(punch.assetAwarded).toBe(10);
  });

  it("continues streak reward through one leave-protected day", async () => {
    await resetState();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const yesterdayDayKey = getPreviousShanghaiDayKey(todayDayKey);
    const dayBeforeYesterdayKey = getPreviousShanghaiDayKey(yesterdayDayKey);

    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today - 2,
        dayKey: dayBeforeYesterdayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 3,
        assetAwarded: 30,
        countedForSeasonSlot: false,
      },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId: user.teamId,
        itemId: "fitness_leave_coupon",
        dayKey: yesterdayDayKey,
        status: "SETTLED",
        targetType: "LEAVE_PROTECTION",
        targetId: null,
        effectSnapshotJson: JSON.stringify({
          type: "leave_protection",
          protectsStreak: true,
          freezesNextFitnessRewardTier: true,
        }),
        settledAt: new Date("2026-04-23T09:00:00+08:00"),
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 3,
        lastPunchDayKey: dayBeforeYesterdayKey,
        coins: 100,
      },
    });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const punch = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });

    expect(punch.streakAfterPunch).toBe(4);
    expect(punch.assetAwarded).toBe(40);
    expect(after.coins).toBe(140);
  });

  it("awards coins from the user's consecutive punch streak globally", async () => {
    const cases = [
      {
        label: "first consecutive day",
        currentStreak: 0,
        lastPunchDayKey: null,
        expectedStreak: 1,
        expectedReward: 10,
        expectedNextReward: 20,
      },
      {
        label: "second consecutive day",
        currentStreak: 1,
        lastPunchDayKey: "2026-04-23",
        expectedStreak: 2,
        expectedReward: 20,
        expectedNextReward: 30,
      },
      {
        label: "third consecutive day",
        currentStreak: 2,
        lastPunchDayKey: "2026-04-23",
        expectedStreak: 3,
        expectedReward: 30,
        expectedNextReward: 40,
      },
      {
        label: "capped reward after five consecutive days",
        currentStreak: 5,
        lastPunchDayKey: "2026-04-23",
        expectedStreak: 6,
        expectedReward: 50,
        expectedNextReward: 50,
      },
    ] as const;

    for (const testCase of cases) {
      await resetState();
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: testCase.currentStreak,
          lastPunchDayKey: testCase.lastPunchDayKey,
        },
      });

      const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const response = await POST(request("POST", userId));

      expect(response.status, testCase.label).toBe(200);

      const body = await response.json();
      const record = await prisma.punchRecord.findUniqueOrThrow({
        where: { userId_dayKey: { userId, dayKey: todayDayKey } },
      });
      const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

      expect(record.assetAwarded, testCase.label).toBe(testCase.expectedReward);
      expect(record.streakAfterPunch, testCase.label).toBe(testCase.expectedStreak);
      expect(after.coins, testCase.label).toBe(before.coins + testCase.expectedReward);
      expect(after.currentStreak, testCase.label).toBe(testCase.expectedStreak);
      expect(after.lastPunchDayKey, testCase.label).toBe(todayDayKey);
      expect(body.snapshot.currentUser).toMatchObject({
        assetBalance: after.coins,
        currentStreak: testCase.expectedStreak,
        nextReward: testCase.expectedNextReward,
      });
    }
  });

  it("adds a season slot and season income when an active season exists", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 0, targetSlots: 5 });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const afterSeason = await prisma.season.findUniqueOrThrow({
      where: { id: season.id },
    });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId,
        },
      },
    });
    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });

    expect(record.seasonId).toBe(season.id);
    expect(record.countedForSeasonSlot).toBe(true);
    expect(record.assetAwarded).toBe(10);
    expect(record.streakAfterPunch).toBe(1);
    expect(after.coins).toBe(before.coins + 10);
    expect(afterSeason.filledSlots).toBe(1);
    expect(stat.seasonIncome).toBe(10);
    expect(stat.slotContribution).toBe(1);
    expect(stat.firstContributionAt).not.toBeNull();
    expect(body.snapshot.activeSeason?.filledSlots).toBe(1);
    expect(body.snapshot.currentUser.nextReward).toBe(20);
  });

  it("keeps filled slots capped and skips slot contribution when the season is already full", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 1, targetSlots: 1 });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const afterSeason = await prisma.season.findUniqueOrThrow({
      where: { id: season.id },
    });
    const stat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId,
        },
      },
    });
    const record = await prisma.punchRecord.findUniqueOrThrow({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });

    expect(after.coins).toBe(before.coins + 10);
    expect(afterSeason.filledSlots).toBe(1);
    expect(stat.seasonIncome).toBe(10);
    expect(stat.slotContribution).toBe(0);
    expect(stat.firstContributionAt).toBeNull();
    expect(record.countedForSeasonSlot).toBe(false);
    expect(body.snapshot.activeSeason?.filledSlots).toBe(1);
  });

  it("rejects a second punch on the same day without double-incrementing coins", async () => {
    await resetState();

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const firstResponse = await POST(request("POST", userId));
    expect(firstResponse.status).toBe(200);

    const middle = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const response = await POST(request("POST", userId));
    expect(response.status).toBe(409);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const records = await prisma.punchRecord.findMany({
      where: {
        userId,
        dayKey: todayDayKey,
      },
    });

    expect(records).toHaveLength(1);
    expect(after.coins).toBe(middle.coins);
    expect(after.coins).toBe(before.coins + 10);
  });

  it("allows only one successful concurrent punch and increments coins once", async () => {
    await resetState();

    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const [firstResponse, secondResponse] = await Promise.all([
      POST(request("POST", userId)),
      POST(request("POST", userId)),
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort((a, b) => a - b);
    const records = await prisma.punchRecord.findMany({
      where: {
        userId,
        dayKey: todayDayKey,
      },
    });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(statuses).toEqual([200, 409]);
    expect(records).toHaveLength(1);
    expect(records[0]?.punched).toBe(true);
    expect(after.coins).toBe(before.coins + 10);
  });

  it("caps season slot growth when different users punch concurrently", async () => {
    await resetState();
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const otherUser = await prisma.user.findFirstOrThrow({
      where: {
        teamId: currentUser.teamId,
        id: { not: userId },
      },
      orderBy: { createdAt: "asc" },
    });
    const season = await createActiveSeason({ filledSlots: 0, targetSlots: 1 });

    const [firstResponse, secondResponse] = await Promise.all([
      POST(request("POST", userId)),
      POST(request("POST", otherUser.id)),
    ]);

    const afterSeason = await prisma.season.findUniqueOrThrow({
      where: { id: season.id },
    });
    const records = await prisma.punchRecord.findMany({
      where: { seasonId: season.id },
    });
    const stats = await prisma.seasonMemberStat.findMany({
      where: { seasonId: season.id },
    });

    expect([firstResponse.status, secondResponse.status].sort((a, b) => a - b)).toEqual([200, 200]);
    expect(afterSeason.filledSlots).toBe(1);
    expect(records.filter((record) => record.countedForSeasonSlot)).toHaveLength(1);
    expect(stats.reduce((sum, stat) => sum + stat.slotContribution, 0)).toBe(1);
  });

  it("writes a season target reached dynamic exactly once when the last slot fills", async () => {
    await resetState();
    await createActiveSeason({ filledSlots: 0, targetSlots: 1 });

    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const otherUser = await prisma.user.findFirstOrThrow({
      where: { teamId: currentUser.teamId, id: { not: userId } },
      orderBy: { createdAt: "asc" },
    });

    const [firstResponse, secondResponse] = await Promise.all([
      POST(request("POST", userId)),
      POST(request("POST", otherUser.id)),
    ]);

    expect([firstResponse.status, secondResponse.status].sort((a, b) => a - b)).toEqual([200, 200]);

    const entries = await prisma.teamDynamic.findMany({
      where: { teamId: currentUser.teamId, type: "SEASON_TARGET_REACHED" },
    });

    expect(entries).toHaveLength(1);
  });

  it("writes a full attendance dynamic when every member punches on the same day", async () => {
    await resetState();
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const teammates = await prisma.user.findMany({
      where: { teamId: currentUser.teamId },
      orderBy: { createdAt: "asc" },
    });

    for (const teammate of teammates) {
      const response = await POST(request("POST", teammate.id));
      expect(response.status).toBe(200);
    }

    const entry = await prisma.teamDynamic.findFirstOrThrow({
      where: { teamId: currentUser.teamId, type: "TEAM_FULL_ATTENDANCE" },
      orderBy: { occurredAt: "desc" },
    });

    expect(entry.summary).toContain("全勤");
  });

  it("writes a streak milestone dynamic when the current user reaches seven days", async () => {
    await resetState();
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 6,
        lastPunchDayKey: "2026-04-23",
      },
    });

    const response = await POST(request("POST", userId));
    expect(response.status).toBe(200);

    const entry = await prisma.teamDynamic.findFirstOrThrow({
      where: { type: "STREAK_MILESTONE" },
      orderBy: { occurredAt: "desc" },
    });

    expect(entry.title).toContain("7 天");
  });

  it("sends a streak milestone push when the user reaches fourteen days", async () => {
    await resetState();
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 13,
        lastPunchDayKey: "2026-04-23",
      },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-1",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    const response = await POST(request("POST", userId));

    expect(response.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "TEAM_MILESTONE",
        message: expect.objectContaining({ type: "text" }),
      }),
    );
  });

  it("sends full-team attendance to enterprise wechat only once per day", async () => {
    await resetState();
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const teammates = await prisma.user.findMany({
      where: { teamId: currentUser.teamId },
      orderBy: { createdAt: "asc" },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-2",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    for (const teammate of teammates) {
      await POST(request("POST", teammate.id));
    }

    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("does not resend full-team attendance after undo and re-complete on the same day", async () => {
    await resetState();
    const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const teammates = await prisma.user.findMany({
      where: { teamId: currentUser.teamId },
      orderBy: { createdAt: "asc" },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-3",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    for (const teammate of teammates) {
      const response = await POST(request("POST", teammate.id));
      expect(response.status).toBe(200);
    }

    const lastTeammate = teammates[teammates.length - 1]!;
    const undoResponse = await DELETE(request("DELETE", lastTeammate.id));
    expect(undoResponse.status).toBe(200);

    const repunchResponse = await POST(request("POST", lastTeammate.id));
    expect(repunchResponse.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledTimes(1);
  });

  it("sends a season target reached push only once per season", async () => {
    await resetState();
    await createActiveSeason({ filledSlots: 0, targetSlots: 1 });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-4",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    const firstResponse = await POST(request("POST", userId));
    expect(firstResponse.status).toBe(200);

    const undoResponse = await DELETE(request("DELETE", userId));
    expect(undoResponse.status).toBe(200);

    const secondResponse = await POST(request("POST", userId));
    expect(secondResponse.status).toBe(200);

    const seasonGoalCalls = sendSpy.mock.calls.filter(
      ([arg]) => arg?.targetType === "SeasonGoal",
    );
    expect(seasonGoalCalls).toHaveLength(1);
  });

  it("sends a streak milestone push when the user reaches one hundred days", async () => {
    await resetState();
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 99,
        lastPunchDayKey: "2026-04-23",
      },
    });

    const sender = await import("@/lib/integrations/enterprise-wechat");
    const sendSpy = vi.spyOn(sender, "sendEnterpriseWechatMessage").mockResolvedValue({
      ok: true,
      status: "SENT",
      logId: "log-5",
      httpStatus: 200,
      wechatErrcode: 0,
      wechatErrmsg: "ok",
    });

    const response = await POST(request("POST", userId));

    expect(response.status).toBe(200);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        targetType: "StreakMilestone",
        message: expect.objectContaining({
          content: expect.stringContaining("100"),
        }),
      }),
    );
  });

  it("undoes today's punch and restores the previous streak and coins", async () => {
    await resetState();

    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today - 1,
        dayKey: "2026-04-23",
        punched: true,
        punchType: "default",
        streakAfterPunch: 4,
        assetAwarded: 40,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 100,
        currentStreak: 5,
        lastPunchDayKey: todayDayKey,
      },
    });
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today,
        dayKey: todayDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 5,
        assetAwarded: 50,
        countedForSeasonSlot: false,
      },
    });

    const response = await DELETE(request("DELETE", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const todayRecord = await prisma.punchRecord.findUnique({
      where: { userId_dayKey: { userId, dayKey: todayDayKey } },
    });

    expect(todayRecord).toBeNull();
    expect(after.coins).toBe(50);
    expect(after.currentStreak).toBe(4);
    expect(after.lastPunchDayKey).toBe("2026-04-23");
    expect(body.snapshot.currentUser).toMatchObject({
      assetBalance: 50,
      currentStreak: 4,
      nextReward: 50,
    });
  });

  it("undoes today's season punch and rolls back season income plus progress", async () => {
    await resetState();
    const season = await createActiveSeason({ filledSlots: 3, targetSlots: 5 });

    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: today - 1,
        dayKey: "2026-04-23",
        punched: true,
        punchType: "default",
        streakAfterPunch: 1,
        assetAwarded: 10,
      },
    });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 70,
        currentStreak: 2,
        lastPunchDayKey: todayDayKey,
      },
    });
    await prisma.seasonMemberStat.create({
      data: {
        seasonId: season.id,
        userId,
        seasonIncome: 20,
        slotContribution: 2,
        colorIndex: 0,
        memberOrder: 0,
        firstContributionAt: new Date("2026-04-20T08:00:00+08:00"),
      },
    });
    await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: season.id,
        dayIndex: today,
        dayKey: todayDayKey,
        punched: true,
        punchType: "default",
        streakAfterPunch: 2,
        assetAwarded: 20,
        countedForSeasonSlot: true,
      },
    });
    await prisma.season.update({
      where: { id: season.id },
      data: { filledSlots: 4 },
    });
    await prisma.seasonMemberStat.update({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId,
        },
      },
      data: {
        seasonIncome: 40,
        slotContribution: 3,
      },
    });

    const response = await DELETE(request("DELETE", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const afterSeason = await prisma.season.findUniqueOrThrow({ where: { id: season.id } });
    const afterStat = await prisma.seasonMemberStat.findUniqueOrThrow({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId,
        },
      },
    });

    expect(after.coins).toBe(50);
    expect(after.currentStreak).toBe(1);
    expect(after.lastPunchDayKey).toBe("2026-04-23");
    expect(afterSeason.filledSlots).toBe(3);
    expect(afterStat.seasonIncome).toBe(20);
    expect(afterStat.slotContribution).toBe(2);
    expect(body.snapshot.activeSeason?.filledSlots).toBe(3);
    expect(body.snapshot.currentUser?.seasonIncome).toBe(20);

    const activity = await prisma.activityEvent.findFirstOrThrow({
      where: {
        userId,
        type: "UNDO_PUNCH",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(activity.message).toBe("li 撤销了今天的打卡");
    expect(activity.assetAwarded).toBeNull();
  });

  it("rejects undo when today's punch does not exist", async () => {
    await resetState();

    const response = await DELETE(request("DELETE", userId));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "今天还没打卡，撤销不了",
    });
  });
});
