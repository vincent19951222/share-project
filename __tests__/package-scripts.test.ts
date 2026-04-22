import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("package scripts", () => {
  it("runs prisma generate after install", () => {
    expect(packageJson.scripts.postinstall).toBe("prisma generate");
  });
});
