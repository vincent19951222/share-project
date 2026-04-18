import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/login/route";
import { prisma } from "@/lib/prisma";
import { seedDatabase } from "@/lib/db-seed";

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await seedDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should return 200 and set cookie for valid credentials", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "li", password: "0000" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.username).toBe("li");
    expect(body.user).not.toHaveProperty("password");

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("userId=");
    expect(setCookie).toContain("HttpOnly");
  });

  it("should return 401 for wrong password", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "li", password: "wrong" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("should return 400 for non-existent user without avatarKey", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "nobody", password: "0000" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should return 400 for missing fields", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it("should register new user when username does not exist", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "newuser", password: "1234", avatarKey: "male1" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.username).toBe("newuser");
    expect(body.user.avatarKey).toBe("male1");
    expect(body.user).not.toHaveProperty("password");

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).toContain("userId=");
  });

  it("should return 400 when registering without avatarKey", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "another", password: "1234" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("should return 400 when registering with invalid avatarKey", async () => {
    const request = new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "another2", password: "1234", avatarKey: "nonexistent" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
