import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply shop scene css", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("defines isolated semantic shop scene layers", () => {
    expect(css).toContain(".supply-shop-scene");
    expect(css).toContain(".supply-shop-content");
    expect(css).toContain(".supply-ui-lab-topbar");
    expect(css).toContain(".supply-shop-shell");
    expect(css).toContain(".supply-shop-sidebar");
    expect(css).toContain(".supply-shop-catalog");
    expect(css).toContain(".supply-shop-detail");
    expect(css).not.toContain(".supply-shop-panel-image");
    expect(css).not.toContain(".supply-shop-topbar-hotspot");
    expect(css).not.toContain(".supply-shop-sidebar-hotspot");
    expect(css).toContain(".supply-shop-category-list");
    expect(css).toContain(".supply-shop-product-image");
    expect(css).toContain(".supply-shop-product-card");
    expect(css).not.toContain(".supply-shop-detail-redeem-hotspot");
    expect(css).toContain("width: 100vw");
  });

  it("includes responsive and reduced-motion safeguards", () => {
    expect(css).toContain("@media (max-width: 1320px)");
    expect(css).toContain("@media (max-width: 960px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
