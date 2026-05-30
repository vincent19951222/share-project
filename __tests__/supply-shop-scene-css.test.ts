import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function extractRuleBody(css: string, selector: string) {
  const marker = `${selector} {`;
  const markerIndex = css.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const blockStart = css.indexOf("{", markerIndex);
  expect(blockStart).toBeGreaterThan(markerIndex);

  let depth = 1;
  let cursor = blockStart + 1;
  while (depth > 0 && cursor < css.length) {
    if (css[cursor] === "{") depth += 1;
    if (css[cursor] === "}") depth -= 1;
    cursor += 1;
  }
  expect(depth).toBe(0);

  return css.slice(blockStart + 1, cursor - 1);
}

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
    expect(css).toContain('.supply-shop-product-card[data-selected-visual="focus"]');
    expect(css).toContain(".supply-shop-detail-attributes");
    expect(css).toContain('.supply-shop-redeem-button[data-action-state="insufficient"]');
    expect(css).toContain('.supply-shop-redeem-button[data-action-state="limitReached"]');
    expect(css).not.toContain(".supply-shop-detail-redeem-hotspot");
    expect(css).toContain("width: 100vw");
  });

  it("includes responsive and reduced-motion safeguards", () => {
    expect(css).toContain("@media (max-width: 1320px)");
    expect(css).toContain("@media (max-width: 960px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("keeps shop product cards fixed height when filtered to a single row", () => {
    const productGrid = extractRuleBody(css, ".supply-shop-product-grid");
    const productCard = extractRuleBody(css, ".supply-shop-product-card");

    expect(productGrid).toMatch(/--supply-shop-product-card-height:\s*14\.35rem/);
    expect(productGrid).toMatch(/grid-auto-rows:\s*var\(--supply-shop-product-card-height\)/);
    expect(productGrid).toMatch(/align-content:\s*start/);
    expect(productGrid).toMatch(/align-items:\s*start/);
    expect(productCard).toMatch(/height:\s*var\(--supply-shop-product-card-height\)/);
    expect(productCard).toMatch(/min-height:\s*0/);
  });
});
