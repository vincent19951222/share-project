// @vitest-environment node

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/ai-image/themes/draw/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
import * as themeUnlocksService from "@/lib/gamification/ai-image/theme-unlocks";
import { prisma } from "@/lib/prisma";

function request(userId?: string) {
  return new NextRequest("http://localhost/api/gamification/ai-image/themes/draw", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userId ? { cookie: `userId=${createCookieValue(userId)}` } : {}),
    },
    body: JSON.stringify({}),
  });
}

describe("AI image theme draw API", () => {
  let userId: string;

  beforeEach(async () => {
    await seedDatabase();
    const user = await prisma.user.findUniqueOrThrow({ where: { username: "li" } });
    userId = user.id;
    await prisma.user.update({ where: { id: userId }, data: { coins: 1000 } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requires login", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "未登录" });
  });

  it("keeps the legacy draw endpoint as an all-collected business response", async () => {
    const response = await POST(request(userId));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "主题已集齐" });
    expect(JSON.stringify(body)).not.toContain("promptTemplate");
  });

  it("does not charge users when every theme is already available", async () => {
    await prisma.user.update({ where: { id: userId }, data: { coins: 0 } });

    const response = await POST(request(userId));
    const body = await response.json();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "主题已集齐" });
    expect(user.coins).toBe(0);
  });

  it("maps no remaining themes to a user-facing business error", async () => {
    const response = await POST(request(userId));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ error: "主题已集齐" });
  });

  it("sanitizes unexpected theme draw errors", async () => {
    vi.spyOn(themeUnlocksService, "drawAiImageTheme").mockRejectedValue(new Error("secret boom"));

    const response = await POST(request(userId));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: "服务器错误" });
  });
});
