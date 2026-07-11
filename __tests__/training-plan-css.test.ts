import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

describe("training plan CSS contract", () => {
  it("styles the compact card, dialogs and independently scrolling session list", () => {
    expect(css).toContain(".training-plan-card");
    expect(css).toContain("max-height: 88px");
    expect(css).toContain(".training-plan-dialog");
    expect(css).toContain("max-width: 920px");
    expect(css).toContain(".training-plan-session-list");
    expect(css).toMatch(/\.training-plan-session-list\s*\{[\s\S]*?overflow-y:\s*auto/);
  });

  it("includes mobile, focus and reduced-motion treatment", () => {
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toMatch(/\.training-plan-card[\s\S]*?font-size:\s*0\.875rem/);
    expect(css).toMatch(/\.training-plan-dialog[\s\S]*?env\(safe-area-inset-bottom/);
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
