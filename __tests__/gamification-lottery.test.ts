import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { getShanghaiDayKey } from "@/lib/economy";
import { prisma } from "@/lib/prisma";
import {
  drawLottery,
  getDirectCoinExpectedValue,
  LotteryDrawError,
} from "@/lib/gamification/lottery";

function sequenceRng(values: number[]) {
  let index = 0;

  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

describe("gamification lottery", () => {
  const fixedNow = new Date("2026-04-24T09:00:00+08:00");
  let userId: string;
  let teamId: string;
  let dayKey: string;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(fixedNow);

    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    teamId = user.teamId;
    dayKey = getShanghaiDayKey(fixedNow);

    await prisma.lotteryDrawResult.deleteMany({});
    await prisma.lotteryDraw.deleteMany({});
    await prisma.lotteryTicketLedger.deleteMany({ where: { userId } });
    await prisma.inventoryItem.deleteMany({ where: { userId } });
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: 200,
        ticketBalance: 0,
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("keeps the GM-16 direct coin expected value at 8.75", () => {
    expect(getDirectCoinExpectedValue()).toBeCloseTo(8.75, 5);
    expect(getDirectCoinExpectedValue()).toBeLessThan(40);
  });

  it("runs a single draw, spends one ticket, and records one result", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 1 },
    });

    const result = await drawLottery({
      userId,
      drawType: "SINGLE",
      rng: sequenceRng([0.01]),
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const draw = await prisma.lotteryDraw.findUniqueOrThrow({
      where: { id: result.draw.id },
      include: { results: true },
    });
    const spendLedger = await prisma.lotteryTicketLedger.findFirstOrThrow({
      where: {
        userId,
        dayKey,
        reason: "LOTTERY_DRAW_SPENT",
        sourceType: "lottery_draw",
        sourceId: draw.id,
      },
    });

    expect(user.ticketBalance).toBe(0);
    expect(draw).toMatchObject({
      drawType: "SINGLE",
      ticketSpent: 1,
      coinSpent: 0,
      guaranteeApplied: false,
    });
    expect(draw.results).toHaveLength(1);
    expect(spendLedger).toMatchObject({
      delta: -1,
      balanceAfter: 0,
    });
    expect(result.draw.rewards).toHaveLength(1);
    expect(result.snapshot.ticketBalance).toBe(0);
  });

  it("rejects single draw without a ticket", async () => {
    await expect(
      drawLottery({
        userId,
        drawType: "SINGLE",
        rng: sequenceRng([0.01]),
      }),
    ).rejects.toThrow(LotteryDrawError);
  });

  it("runs a ten draw, spends ten tickets, and records ten results", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 10 },
    });

    const result = await drawLottery({
      userId,
      drawType: "TEN",
      rng: sequenceRng([0.01, 0.2, 0.35, 0.48, 0.55, 0.62, 0.7, 0.82, 0.9, 0.98]),
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const draw = await prisma.lotteryDraw.findUniqueOrThrow({
      where: { id: result.draw.id },
      include: { results: true },
    });

    expect(user.ticketBalance).toBe(0);
    expect(draw).toMatchObject({
      drawType: "TEN",
      ticketSpent: 10,
      coinSpent: 0,
    });
    expect(draw.results).toHaveLength(10);
    expect(result.draw.rewards).toHaveLength(10);
  });

  it("allows ten draw top-up from seven tickets and charges coins", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ticketBalance: 7,
        coins: 200,
      },
    });

    const result = await drawLottery({
      userId,
      drawType: "TEN",
      useCoinTopUp: true,
      rng: sequenceRng([0.6, 0.62, 0.64, 0.66, 0.68, 0.7, 0.72, 0.74, 0.76, 0.78]),
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const draw = await prisma.lotteryDraw.findUniqueOrThrow({ where: { id: result.draw.id } });
    const topUpLedger = await prisma.lotteryTicketLedger.findFirstOrThrow({
      where: {
        userId,
        dayKey,
        reason: "COIN_PURCHASE_GRANTED",
        sourceType: "lottery_topup",
        sourceId: draw.id,
      },
    });

    expect(draw.coinSpent).toBe(120);
    expect(user.ticketBalance).toBe(0);
    expect(user.coins).toBeLessThanOrEqual(80);
    expect(topUpLedger).toMatchObject({
      delta: 3,
      balanceAfter: 10,
    });
  });

  it("rejects ten draw from fewer than seven tickets", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ticketBalance: 6,
        coins: 1000,
      },
    });

    await expect(
      drawLottery({
        userId,
        drawType: "TEN",
        useCoinTopUp: true,
        rng: sequenceRng([0.01]),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("rejects ten draw top-up when the daily purchased-ticket cap is exhausted", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ticketBalance: 9,
        coins: 1000,
      },
    });
    await prisma.lotteryTicketLedger.create({
      data: {
        userId,
        teamId,
        dayKey,
        delta: 3,
        balanceAfter: 3,
        reason: "COIN_PURCHASE_GRANTED",
        sourceType: "lottery_topup",
        sourceId: "previous-draw",
      },
    });

    await expect(
      drawLottery({
        userId,
        drawType: "TEN",
        useCoinTopUp: true,
        rng: sequenceRng([0.01]),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("applies ten-draw guarantee when all natural results are coin rewards", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 10 },
    });

    const result = await drawLottery({
      userId,
      drawType: "TEN",
      rng: sequenceRng([0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.6]),
    });

    const draw = await prisma.lotteryDraw.findUniqueOrThrow({
      where: { id: result.draw.id },
      include: { results: true },
    });
    const nonCoinResults = draw.results.filter((item) => item.rewardTier !== "coin");
    const nonCoinSnapshots = result.draw.rewards.filter((reward) => reward.rewardTier !== "coin");

    expect(draw.guaranteeApplied).toBe(true);
    expect(nonCoinResults).toHaveLength(1);
    expect(nonCoinResults[0]?.rewardTier).toBe("utility");
    expect(result.draw.guaranteeApplied).toBe(true);
    expect(nonCoinSnapshots).toHaveLength(1);
    expect(nonCoinSnapshots[0]?.rewardTier).toBe("utility");
  });

  it("grants inventory for item rewards", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 1 },
    });

    await drawLottery({
      userId,
      drawType: "SINGLE",
      rng: sequenceRng([0.6]),
    });

    const inventory = await prisma.inventoryItem.findMany({ where: { userId } });
    expect(inventory.reduce((sum, item) => sum + item.quantity, 0)).toBeGreaterThanOrEqual(1);
  });

  it("grants inventory for the GM-16 season sprint rare reward", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { ticketBalance: 1 },
    });

    const result = await drawLottery({
      userId,
      drawType: "SINGLE",
      rng: sequenceRng([0.985]),
    });

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({
      where: {
        userId_itemId: {
          userId,
          itemId: "season_sprint_coupon",
        },
      },
    });

    expect(result.draw.rewards[0]).toMatchObject({
      rewardId: "reward_season_sprint",
      rewardTier: "rare",
      rewardKind: "inventory_item",
    });
    expect(inventory.quantity).toBe(1);
  });
});
