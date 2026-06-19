import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("login page cache policy", () => {
  it("keeps login out of static prerender cache so mobile refreshes do not reuse stale css hashes", () => {
    const source = readFileSync("app/(auth)/login/page.tsx", "utf8");

    expect(source).toContain('export const dynamic = "force-dynamic";');
  });
});
