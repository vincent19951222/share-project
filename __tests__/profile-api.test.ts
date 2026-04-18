import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/user/profile/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

describe("PATCH /api/user/profile", () => {
  let userId: string;

  beforeAll(async () => {
    await seedDatabase();
    const user = await prisma.user.findUnique({ where: { username: "li" } });
    userId = user!.id;
  });

  afterAll(async () => {
    // Restore original seed data for other test files
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { username: "li", avatarKey: "male1" },
      });
    } catch {
      // User may have been deleted by another test
    }
    await prisma.$disconnect();
  });

  it("should update avatarKey", async () => {
    const request = new NextRequest("http://localhost/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ avatarKey: "female3" }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `userId=${userId}`,
      },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.user.avatarKey).toBe("female3");
  });

  it("should update username", async () => {
    const request = new NextRequest("http://localhost/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "li_updated" }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `userId=${userId}`,
      },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.user.username).toBe("li_updated");
  });

  it("should return 401 without cookie", async () => {
    const request = new NextRequest("http://localhost/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: "hack" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(401);
  });

  it("should return 400 for invalid avatarKey", async () => {
    const request = new NextRequest("http://localhost/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ avatarKey: "nonexistent" }),
      headers: {
        "Content-Type": "application/json",
        Cookie: `userId=${userId}`,
      },
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
  });
});
