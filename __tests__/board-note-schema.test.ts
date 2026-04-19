import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

describe("BoardNote schema", () => {
  let teamId: string;
  let authorId: string;

  beforeAll(async () => {
    await seedDatabase();
    await prisma.boardNote.deleteMany();

    const user = await prisma.user.findUnique({
      where: { username: "li" },
      include: { team: true },
    });

    authorId = user!.id;
    teamId = user!.teamId;
  });

  afterAll(async () => {
    await prisma.boardNote.deleteMany();
    await prisma.$disconnect();
  });

  it("creates a shared-board note connected to a team and author", async () => {
    const note = await prisma.boardNote.create({
      data: {
        teamId,
        authorId,
        type: "FREE",
        content: "今天 5km，腿还在。",
        color: "YELLOW",
      },
      include: {
        team: true,
        author: true,
      },
    });

    expect(note.id).toBeTruthy();
    expect(note.team.id).toBe(teamId);
    expect(note.author.id).toBe(authorId);
    expect(note.isDeleted).toBe(false);
    expect(note.pinned).toBe(false);
    expect(note.expiresAt).toBeNull();
  });
});
