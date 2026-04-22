import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("shared board CSS", () => {
  it("keeps own-note delete buttons visible on touch devices", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("@media (hover: none)");
    expect(css).toMatch(/@media \(hover: none\)[\s\S]*\.note-close-btn[\s\S]*opacity:\s*1/);
  });

  it("gives announcement notes a stronger high-contrast visual treatment", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toMatch(/\.note-announcement\s*\{[\s\S]*background-color:\s*#facc15/);
    expect(css).toMatch(/\.note-announcement\s*\{[\s\S]*border-color:\s*#1f2937/);
    expect(css).toMatch(/\.note-announcement\s*\{[\s\S]*box-shadow:\s*0 6px 0 0 #1f2937/);
    expect(css).toMatch(/\.note-announcement[\s\S]*\.text-main\s*\{[\s\S]*color:\s*#111827/);
    expect(css).toMatch(/\.note-announcement[\s\S]*\.text-sub\s*\{[\s\S]*color:\s*#78350f/);
  });
});
