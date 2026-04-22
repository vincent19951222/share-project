import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import {
  BOARD_TOTAL_DAYS,
  PUNCH_REWARD_COINS,
  buildBoardSnapshotForUser,
  getCurrentBoardDay,
} from "@/lib/board-state";

describe("board-state", () => {
  let userId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({
      where: { username: "li" },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("derives the current board day in Asia/Shanghai and clamps to total days", () => {
    expect(getCurrentBoardDay(new Date("2026-04-05T01:00:00Z"))).toBe(5);
    expect(getCurrentBoardDay(new Date("2026-05-30T20:00:00Z"))).toBe(
      BOARD_TOTAL_DAYS,
    );
  });

  it("builds a normalized snapshot for the authenticated user's team", async () => {
    const snapshot = await buildBoardSnapshotForUser(
      userId,
      new Date("2026-04-18T09:00:00+08:00"),
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot!.currentUserId).toBe(userId);
    expect(snapshot!.members.length).toBe(5);
    expect(snapshot!.gridData).toHaveLength(snapshot!.members.length);
    expect(snapshot!.today).toBe(18);
    expect(snapshot!.totalDays).toBe(BOARD_TOTAL_DAYS);
    expect(snapshot!.teamCoins).toBeGreaterThan(PUNCH_REWARD_COINS);

    const currentUserRowIndex = snapshot!.members.findIndex(
      (member) => member.id === snapshot!.currentUserId,
    );

    expect(currentUserRowIndex).toBeGreaterThanOrEqual(0);
    expect(snapshot!.gridData[currentUserRowIndex]).toHaveLength(BOARD_TOTAL_DAYS);
    expect(snapshot!.gridData[currentUserRowIndex][snapshot!.today - 1]).toBe(
      false,
    );
    expect(snapshot!.gridData[currentUserRowIndex][snapshot!.today]).toBeNull();
  });

  it("returns null when the user does not exist", async () => {
    const snapshot = await buildBoardSnapshotForUser(
      "missing-user",
      new Date("2026-04-18T09:00:00+08:00"),
    );
    expect(snapshot).toBeNull();
  });
});
