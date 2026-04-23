import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/board-notes/route";
import { DELETE } from "@/app/api/board-notes/[id]/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";
import { createCookieValue } from "@/lib/auth";

function request(method: string, userId?: string, body?: unknown) {
  return new NextRequest("http://localhost/api/board-notes", {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { Cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
  });
}

describe("/api/board-notes", () => {
  let userId: string;
  let otherUserId: string;
  let crossTeamUserId: string;
  let teamId: string;

  beforeAll(async () => {
    await seedDatabase();
    await prisma.boardNote.deleteMany();

    const user = await prisma.user.findUnique({
      where: { username: "li" },
      include: { team: true },
    });
    const otherUser = await prisma.user.findUnique({ where: { username: "luo" } });

    userId = user!.id;
    teamId = user!.teamId;
    otherUserId = otherUser!.id;

    const crossTeam = await prisma.team.upsert({
      where: { code: "BOARD-X" },
      update: { name: "外部小队" },
      create: { code: "BOARD-X", name: "外部小队" },
    });

    const crossUser = await prisma.user.upsert({
      where: { username: "board_cross_user" },
      update: { teamId: crossTeam.id, avatarKey: "male4", password: "test", coins: 0 },
      create: {
        username: "board_cross_user",
        password: "test",
        avatarKey: "male4",
        coins: 0,
        teamId: crossTeam.id,
      },
    });

    crossTeamUserId = crossUser.id;
  });

  afterAll(async () => {
    await prisma.boardNote.deleteMany();
    await prisma.user.deleteMany({ where: { username: "board_cross_user" } });
    await prisma.team.deleteMany({ where: { code: "BOARD-X" } });
    await prisma.$disconnect();
  });

  it("creates a free note", async () => {
    const response = await POST(request("POST", userId, {
      type: "FREE",
      content: "今天练背，明天约跑。",
      color: "GREEN",
    }));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.note.type).toBe("FREE");
    expect(body.note.content).toBe("今天练背，明天约跑。");
    expect(body.note.color).toBe("GREEN");
    expect(body.note.author.id).toBe(userId);
    expect(body.note.canDelete).toBe(true);
  });

  it("creates an announcement and stores null color", async () => {
    const response = await POST(request("POST", userId, {
      type: "ANNOUNCEMENT",
      content: "周五团队聚餐。",
      color: "PINK",
    }));

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.note.type).toBe("ANNOUNCEMENT");
    expect(body.note.color).toBeNull();
  });

  it("rejects empty content", async () => {
    const response = await POST(request("POST", userId, {
      type: "FREE",
      content: "   ",
      color: "YELLOW",
    }));

    expect(response.status).toBe(400);
  });

  it("rejects invalid type", async () => {
    const response = await POST(request("POST", userId, {
      type: "TASK",
      content: "不要混进任务系统。",
      color: "YELLOW",
    }));

    expect(response.status).toBe(400);
  });

  it("rejects invalid color", async () => {
    const response = await POST(request("POST", userId, {
      type: "FREE",
      content: "颜色不对。",
      color: "PURPLE",
    }));

    expect(response.status).toBe(400);
  });

  it("rejects content longer than 1000 characters", async () => {
    const response = await POST(request("POST", userId, {
      type: "FREE",
      content: "牛".repeat(1001),
      color: "YELLOW",
    }));

    expect(response.status).toBe(400);
  });

  it("returns only notes from the current user's team", async () => {
    await prisma.boardNote.create({
      data: {
        teamId,
        authorId: userId,
        type: "FREE",
        content: "本队便签",
        color: "BLUE",
      },
    });

    const crossUser = await prisma.user.findUnique({ where: { id: crossTeamUserId } });
    await prisma.boardNote.create({
      data: {
        teamId: crossUser!.teamId,
        authorId: crossTeamUserId,
        type: "FREE",
        content: "外队便签",
        color: "PINK",
      },
    });

    const response = await GET(request("GET", userId));
    expect(response.status).toBe(200);

    const body = await response.json();
    const contents = body.notes.map((note: { content: string }) => note.content);

    expect(contents).toContain("本队便签");
    expect(contents).not.toContain("外队便签");
  });

  it("marks teammate notes as deletable for admins", async () => {
    const note = await prisma.boardNote.create({
      data: {
        teamId,
        authorId: otherUserId,
        type: "FREE",
        content: "admin can delete teammate note",
        color: "GREEN",
      },
    });

    const response = await GET(request("GET", userId));
    const body = await response.json();
    const returnedNote = body.notes.find((item: { id: string }) => item.id === note.id);

    expect(returnedNote.canDelete).toBe(true);
  });

  it("does not mark teammate notes as deletable for regular members", async () => {
    const note = await prisma.boardNote.create({
      data: {
        teamId,
        authorId: userId,
        type: "FREE",
        content: "member cannot delete teammate note",
        color: "BLUE",
      },
    });

    const response = await GET(request("GET", otherUserId));
    const body = await response.json();
    const returnedNote = body.notes.find((item: { id: string }) => item.id === note.id);

    expect(returnedNote.canDelete).toBe(false);
  });

  it("excludes soft-deleted notes", async () => {
    await prisma.boardNote.create({
      data: {
        teamId,
        authorId: userId,
        type: "FREE",
        content: "已经删掉的便签",
        color: "YELLOW",
        isDeleted: true,
      },
    });

    const response = await GET(request("GET", userId));
    const body = await response.json();
    const contents = body.notes.map((note: { content: string }) => note.content);

    expect(contents).not.toContain("已经删掉的便签");
  });

  it("soft-deletes the author's own note", async () => {
    const note = await prisma.boardNote.create({
      data: {
        teamId,
        authorId: userId,
        type: "FREE",
        content: "我自己删",
        color: "GREEN",
      },
    });

    const response = await DELETE(request("DELETE", userId), { params: Promise.resolve({ id: note.id }) });
    expect(response.status).toBe(200);

    const deleted = await prisma.boardNote.findUnique({ where: { id: note.id } });
    expect(deleted!.isDeleted).toBe(true);
  });

  it("soft-deletes another team member's note for admins", async () => {
    const note = await prisma.boardNote.create({
      data: {
        teamId,
        authorId: otherUserId,
        type: "FREE",
        content: "admin deletes teammate note",
        color: "GREEN",
      },
    });

    const response = await DELETE(request("DELETE", userId), { params: Promise.resolve({ id: note.id }) });
    expect(response.status).toBe(200);

    const deleted = await prisma.boardNote.findUnique({ where: { id: note.id } });
    expect(deleted!.isDeleted).toBe(true);
  });

  it("rejects deletion by another user", async () => {
    const note = await prisma.boardNote.create({
      data: {
        teamId,
        authorId: userId,
        type: "FREE",
        content: "别人不能删",
        color: "BLUE",
      },
    });

    const response = await DELETE(request("DELETE", otherUserId), { params: Promise.resolve({ id: note.id }) });

    expect(response.status).toBe(403);
  });

  it("requires authentication", async () => {
    const response = await GET(request("GET"));
    expect(response.status).toBe(401);
  });
});
