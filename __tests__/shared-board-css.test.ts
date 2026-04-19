import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("shared board CSS", () => {
  it("keeps own-note delete buttons visible on touch devices", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("@media (hover: none)");
    expect(css).toMatch(/@media \(hover: none\)[\s\S]*\.note-close-btn[\s\S]*opacity:\s*1/);
  });
});
