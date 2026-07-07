import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedDatabase } from "@/lib/db-seed";
import { convertSupplyTicketsToCoins } from "@/scripts/convert-supply-tickets-to-coins";
import { prisma } from "@/lib/prisma";

describe("convertSupplyTicketsToCoins", () => {
  beforeEach(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("dry-runs without mutating users", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    await prisma.user.update({ where: { id: user.id }, data: { coins: 100, ticketBalance: 3 } });

    const result = await convertSupplyTicketsToCoins({ apply: false });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(result).toMatchObject({ convertedUserCount: 1, ticketCount: 3, coinGrantTotal: 150 });
    expect(after.coins).toBe(100);
    expect(after.ticketBalance).toBe(3);
  });

  it("applies conversion idempotently", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    await prisma.user.update({ where: { id: user.id }, data: { coins: 100, ticketBalance: 3 } });

    await convertSupplyTicketsToCoins({ apply: true });
    const first = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    await convertSupplyTicketsToCoins({ apply: true });
    const second = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

    expect(first.coins).toBe(250);
    expect(first.ticketBalance).toBe(0);
    expect(second.coins).toBe(250);
    expect(second.ticketBalance).toBe(0);
  });
});
