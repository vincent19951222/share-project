// @vitest-environment node

import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/gamification/ai-image/themes/draw/route";
import { createCookieValue } from "@/lib/auth";
import { seedDatabase } from "@/lib/db-seed";
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

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("requires login", async () => {
    const response = await POST(request());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "未登录" });
  });

  it("draws a locked theme with coins and returns a client-safe theme snapshot", async () => {
    const response = await POST(request(userId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.theme).toMatchObject({
      id: expect.any(String),
      unlocked: true,
      defaultUnlocked: false,
      enabled: true,
    });
    expect(Object.keys(body)).toEqual(["theme"]);
    expect(JSON.stringify(body)).not.toContain("promptTemplate");
  });
});
