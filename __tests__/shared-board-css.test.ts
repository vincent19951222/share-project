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

  it("uses the same rounded scene-shell clipping model as the punch scene", () => {
    const css = readFileSync("app/globals.css", "utf8");

    const sceneBlock = css.match(/\.shared-board-scene\s*\{[^}]*\}/)?.[0] ?? "";
    const backgroundBlock = css.match(/\.shared-board-background\s*\{[^}]*\}/)?.[0] ?? "";
    const propsBlock = css.match(/\.shared-board-props\s*\{[^}]*\}/)?.[0] ?? "";

    expect(sceneBlock).toMatch(/border-radius:\s*1\.\d+rem/);
    expect(backgroundBlock).toContain("border-radius: inherit");
    expect(propsBlock).toContain("border-radius: inherit");
  });

  it("rounds the main shared board content surfaces like punch scene cards", () => {
    const css = readFileSync("app/globals.css", "utf8");

    const corkBlock = css.match(/\.shared-board-cork\s*\{[^}]*\}/)?.[0] ?? "";
    const composerBlock = css.match(/\.shared-board-composer\s*\{[^}]*\}/)?.[0] ?? "";

    expect(corkBlock).toMatch(/border-radius:\s*1\.\d+rem/);
    expect(composerBlock).toMatch(/border-radius:\s*1\.\d+rem/);
  });
});
