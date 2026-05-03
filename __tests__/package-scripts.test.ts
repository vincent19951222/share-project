import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

describe("package scripts", () => {
  it("runs prisma generate after install", () => {
    expect(packageJson.scripts.postinstall).toBe("prisma generate");
  });

  it("regenerates prisma client before dev, build, and test", () => {
    expect(packageJson.scripts["prepare:prisma"]).toBe("prisma generate");
    expect(packageJson.scripts.predev).toBe("npm run prepare:prisma");
    expect(packageJson.scripts.prebuild).toBe("npm run prepare:prisma");
    expect(packageJson.scripts.pretest).toBe("npm run prepare:prisma");
  });

  it("exposes a reward icon compression command", () => {
    expect(packageJson.scripts["compress:reward-icons"]).toBe(
      "node scripts/compress-reward-icons.mjs",
    );
  });
});
