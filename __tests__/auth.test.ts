import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, createCookieValue, parseCookieValue } from "@/lib/auth";

describe("hashPassword & verifyPassword", () => {
  it("should hash a password and verify it correctly", async () => {
    const hash = await hashPassword("0000");
    expect(hash).not.toBe("0000");
    expect(await verifyPassword("0000", hash)).toBe(true);
  });

  it("should reject wrong password", async () => {
    const hash = await hashPassword("0000");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("createCookieValue & parseCookieValue", () => {
  it("should create and parse cookie value", () => {
    const userId = "clx12345abcde";
    const cookieValue = createCookieValue(userId);
    expect(cookieValue).toBe(userId);
    expect(parseCookieValue(cookieValue)).toBe(userId);
  });

  it("should return null for empty cookie value", () => {
    expect(parseCookieValue("")).toBeNull();
    expect(parseCookieValue(undefined as unknown as string)).toBeNull();
  });
});
