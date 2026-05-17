import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply draw pool scene css", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("defines isolated draw-pool scene layers and machine styles", () => {
    expect(css).toContain(".supply-draw-pool-scene");
    expect(css).toContain(".supply-draw-pool-background");
    expect(css).toContain(".supply-draw-pool-content");
    expect(css).toContain(".supply-draw-pool-topbar");
    expect(css).not.toContain(".supply-draw-pool-topbar-image");
    expect(css).not.toContain("topbar-close-hotspot");
    expect(css).toContain(".supply-draw-pool-left-rail");
    expect(css).not.toContain(".supply-draw-pool-wallet-image");
    expect(css).not.toContain(".supply-draw-pool-wallet-hotspot");
    expect(css).not.toContain(".supply-draw-pool-guide-hotspot");
    expect(css).not.toContain(".supply-draw-pool-rates-image");
    expect(css).not.toContain(".supply-draw-pool-probability-image");
    expect(css).toContain(".supply-draw-pool-machine");
    expect(css).toContain(".supply-draw-pool-machine-stage");
    expect(css).not.toContain(".supply-draw-pool-machine-hotspot");
    expect(css).toContain(".supply-draw-pool-right-rail");
    expect(css).not.toContain(".supply-draw-pool-pity-image");
    expect(css).not.toContain(".supply-draw-pool-rules-image");
    expect(css).not.toContain(".supply-draw-pool-rules-hotspot");
    expect(css).toContain(".supply-draw-pool-recent");
    expect(css).not.toContain(".supply-draw-pool-recent-image");
    expect(css).not.toContain(".supply-draw-pool-recent-hotspot");
    expect(css).toContain("border: 4px solid");
  });

  it("includes responsive and reduced-motion safeguards", () => {
    expect(css).toContain("@media (max-width: 1200px)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
