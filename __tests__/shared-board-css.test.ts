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

    expect(css).toContain("office-wall-bg.webp");
    expect(css).toContain("cork-board-bg.webp");
    expect(css).toContain(".shared-board-note-wall");
    expect(css).toContain(".note-announcement-ribbon");
    expect(css).toContain(".note-announcement-rule");
    expect(css).toContain(".note-fold");
    expect(css).toContain(".note-pin");
    const noteCardBlock = css.match(/\.note-card\s*\{[^}]*\}/)?.[0] ?? "";
    expect(noteCardBlock).not.toContain("border-radius: 1rem");
  });
});
