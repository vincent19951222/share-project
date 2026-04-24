import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("p3 responsive CSS", () => {
  it("adds the mobile safety rules for the team header and dropdown", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toMatch(/\.team-header[\s\S]*flex-direction:\s*column/);
    expect(css).toMatch(/\.team-header-account[\s\S]*width:\s*100%/);
    expect(css).toMatch(/\.dropdown-menu[\s\S]*max-width:\s*calc\(100vw - 2rem\)/);
  });
});
