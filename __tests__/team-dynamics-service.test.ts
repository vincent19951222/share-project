import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import {
  TEAM_DYNAMICS_PAGE_LIMIT,
  TEAM_DYNAMICS_PANEL_LIMIT,
  TEAM_DYNAMIC_TYPES,
} from "@/lib/team-dynamics";
import {
  createOrReuseTeamDynamic,
  listTeamDynamicsForUser,
  markAllTeamDynamicsRead,
  markTeamDynamicRead,
} from "@/lib/team-dynamics-service";

describe("team-dynamics service", () => {
  let userId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
  });

  beforeEach(async () => {
    await prisma.teamDynamicReadState.deleteMany();
    await prisma.teamDynamic.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("dedupes entries by source key", async () => {
    const first = await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
      title: "新赛季已经开启",
      summary: "五月脱脂挑战开始了",
      payload: { goalName: "五月脱脂挑战" },
      sourceType: "season",
      sourceId: "season-1",
      occurredAt: new Date("2026-04-25T08:00:00+08:00"),
    });

    const second = await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
      title: "重复创建不应新增",
      summary: "should reuse",
      payload: { goalName: "五月脱脂挑战" },
      sourceType: "season",
      sourceId: "season-1",
      occurredAt: new Date("2026-04-25T08:00:00+08:00"),
    });

    expect(second.id).toBe(first.id);
    expect(await prisma.teamDynamic.count()).toBe(1);
  });

  it("returns unread count and filters out read entries in unread mode", async () => {
    const seasonEntry = await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_STARTED,
      title: "新赛季已经开启",
      summary: "五月脱脂挑战开始了",
      payload: { goalName: "五月脱脂挑战" },
      sourceType: "season",
      sourceId: "season-2",
      occurredAt: new Date("2026-04-25T08:00:00+08:00"),
    });

    await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.STREAK_MILESTONE,
      title: "li 连续打卡 7 天",
      summary: "保持住了",
      payload: { username: "li", streak: 7 },
      sourceType: "streak",
      sourceId: "li-7-2026-04-25",
      occurredAt: new Date("2026-04-25T09:00:00+08:00"),
    });

    await markTeamDynamicRead({ userId, teamDynamicId: seasonEntry.id });

    const unreadOnly = await listTeamDynamicsForUser({
      userId,
      view: "page",
      unreadOnly: true,
      type: "ALL",
      limit: TEAM_DYNAMICS_PAGE_LIMIT,
      cursor: null,
    });

    expect(unreadOnly.unreadCount).toBe(1);
    expect(unreadOnly.items).toHaveLength(1);
    expect(unreadOnly.items[0].type).toBe(TEAM_DYNAMIC_TYPES.STREAK_MILESTONE);
  });

  it("marks all entries as read for the viewer", async () => {
    await createOrReuseTeamDynamic({
      teamId,
      type: TEAM_DYNAMIC_TYPES.SEASON_ENDED,
      title: "赛季已经结束",
      summary: "五月脱脂挑战已封盘",
      payload: { goalName: "五月脱脂挑战" },
      sourceType: "season",
      sourceId: "season-3-ended",
      occurredAt: new Date("2026-04-25T10:00:00+08:00"),
    });

    await markAllTeamDynamicsRead({ userId, teamId });

    const result = await listTeamDynamicsForUser({
      userId,
      view: "panel",
      unreadOnly: true,
      type: "ALL",
      limit: TEAM_DYNAMICS_PANEL_LIMIT,
      cursor: null,
    });

    expect(result.unreadCount).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});
