import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import {
  calculateBoostSettlement,
  settleBoostForPunch,
} from "@/lib/gamification/boost-settlement";
import { prisma } from "@/lib/prisma";

describe("gamification boost settlement", () => {
  const fixedNow = new Date("2026-04-26T09:00:00+08:00");
  let userId: string;
  let teamId: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;

    await prisma.itemUseRecord.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
    await prisma.punchRecord.deleteMany({ where: { userId } });
    await prisma.teamDynamic.deleteMany({ where: { teamId } });
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
  });

  it("keeps base rewards unchanged without a boost", () => {
    const settlement = calculateBoostSettlement({
      baseAssetAwarded: 40,
      baseSeasonContribution: 40,
      effect: null,
    });

    expect(settlement).toMatchObject({
      assetAwarded: 40,
      boostAssetBonus: 0,
      seasonContributionAwarded: 40,
      boostSeasonBonus: 0,
      boostLabel: null,
    });
  });

  it("settles small boost for personal coins only", () => {
    const settlement = calculateBoostSettlement({
      baseAssetAwarded: 40,
      baseSeasonContribution: 40,
      effect: { type: "fitness_coin_multiplier", multiplier: 1.5 },
    });

    expect(settlement.assetAwarded).toBe(60);
    expect(settlement.boostAssetBonus).toBe(20);
    expect(settlement.seasonContributionAwarded).toBe(40);
    expect(settlement.boostSeasonBonus).toBe(0);
  });

  it("settles season sprint for season income only", () => {
    const settlement = calculateBoostSettlement({
      baseAssetAwarded: 40,
      baseSeasonContribution: 40,
      effect: { type: "fitness_season_multiplier", multiplier: 2 },
    });

    expect(settlement.assetAwarded).toBe(40);
    expect(settlement.boostAssetBonus).toBe(0);
    expect(settlement.seasonContributionAwarded).toBe(80);
    expect(settlement.boostSeasonBonus).toBe(40);
  });

  it("settles double niuma for coins and season income", () => {
    const settlement = calculateBoostSettlement({
      baseAssetAwarded: 40,
      baseSeasonContribution: 40,
      effect: { type: "fitness_coin_and_season_multiplier", multiplier: 2 },
    });

    expect(settlement.assetAwarded).toBe(80);
    expect(settlement.boostAssetBonus).toBe(40);
    expect(settlement.seasonContributionAwarded).toBe(80);
    expect(settlement.boostSeasonBonus).toBe(40);
  });

  it("settles a pending boost once and consumes exactly one inventory item", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });
    const itemUse = await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "small_boost_coupon",
        dayKey: "2026-04-26",
        status: "PENDING",
        targetType: "FITNESS_PUNCH",
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
      },
    });
    const punch = await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 26,
        dayKey: "2026-04-26",
        punched: true,
        punchType: "default",
        streakAfterPunch: 4,
        assetAwarded: 40,
        baseAssetAwarded: 40,
        baseSeasonContribution: 0,
        seasonContributionAwarded: 0,
        countedForSeasonSlot: false,
      },
    });

    const first = await prisma.$transaction((tx) =>
      settleBoostForPunch({
        tx,
        userId,
        teamId,
        dayKey: "2026-04-26",
        punchRecordId: punch.id,
        baseAssetAwarded: 40,
        baseSeasonContribution: 0,
        applyBonusDeltas: false,
      }),
    );
    const second = await prisma.$transaction((tx) =>
      settleBoostForPunch({
        tx,
        userId,
        teamId,
        dayKey: "2026-04-26",
        punchRecordId: punch.id,
        baseAssetAwarded: 40,
        baseSeasonContribution: 0,
        applyBonusDeltas: false,
      }),
    );

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: { userId_itemId: { userId, itemId: "small_boost_coupon" } },
    });
    const updatedUse = await prisma.itemUseRecord.findUniqueOrThrow({ where: { id: itemUse.id } });

    expect(first.assetAwarded).toBe(60);
    expect(second.assetAwarded).toBe(60);
    expect(inventory.quantity).toBe(0);
    expect(updatedUse.status).toBe("SETTLED");
    expect(updatedUse.targetId).toBe(punch.id);
  });

  it("writes a team dynamic when double niuma coupon settles", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "double_niuma_coupon", quantity: 1 },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "double_niuma_coupon",
        dayKey: "2026-04-26",
        status: "PENDING",
        targetType: "FITNESS_PUNCH",
        effectSnapshotJson: JSON.stringify({
          type: "fitness_coin_and_season_multiplier",
          multiplier: 2,
        }),
      },
    });
    const punch = await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 26,
        dayKey: "2026-04-26",
        punched: true,
        punchType: "default",
        streakAfterPunch: 4,
        assetAwarded: 40,
        baseAssetAwarded: 40,
        baseSeasonContribution: 40,
        seasonContributionAwarded: 40,
        countedForSeasonSlot: false,
      },
    });

    await prisma.$transaction((tx) =>
      settleBoostForPunch({
        tx,
        userId,
        teamId,
        dayKey: "2026-04-26",
        punchRecordId: punch.id,
        baseAssetAwarded: 40,
        baseSeasonContribution: 40,
        applyBonusDeltas: false,
      }),
    );

    const dynamic = await prisma.teamDynamic.findFirstOrThrow({
      where: {
        teamId,
        type: "GAME_BOOST_MILESTONE",
        sourceType: "punch_record_boost",
        sourceId: punch.id,
      },
    });

    expect(dynamic.title).toContain("双倍牛马券");
  });

  it("does not write a team dynamic for a non-highlight small boost", async () => {
    await prisma.inventoryItem.create({
      data: { userId, teamId, itemId: "small_boost_coupon", quantity: 1 },
    });
    await prisma.itemUseRecord.create({
      data: {
        userId,
        teamId,
        itemId: "small_boost_coupon",
        dayKey: "2026-04-26",
        status: "PENDING",
        targetType: "FITNESS_PUNCH",
        effectSnapshotJson: JSON.stringify({ type: "fitness_coin_multiplier", multiplier: 1.5 }),
      },
    });
    const punch = await prisma.punchRecord.create({
      data: {
        userId,
        seasonId: null,
        dayIndex: 26,
        dayKey: "2026-04-26",
        punched: true,
        punchType: "default",
        streakAfterPunch: 4,
        assetAwarded: 40,
        baseAssetAwarded: 40,
        baseSeasonContribution: 40,
        seasonContributionAwarded: 40,
        countedForSeasonSlot: false,
      },
    });

    await prisma.$transaction((tx) =>
      settleBoostForPunch({
        tx,
        userId,
        teamId,
        dayKey: "2026-04-26",
        punchRecordId: punch.id,
        baseAssetAwarded: 40,
        baseSeasonContribution: 40,
        applyBonusDeltas: false,
      }),
    );

    const count = await prisma.teamDynamic.count({
      where: { teamId, type: "GAME_BOOST_MILESTONE" },
    });
    expect(count).toBe(0);
  });
});
