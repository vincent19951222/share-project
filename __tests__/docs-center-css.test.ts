import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function extractBlock(css: string, marker: string) {
  const markerIndex = css.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const blockStart = css.indexOf("{", markerIndex);
  expect(blockStart).toBeGreaterThan(markerIndex);

  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < css.length) {
    const char = css[cursor];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    cursor += 1;
  }

  expect(depth).toBe(0);
  return css.slice(blockStart + 1, cursor - 1);
}

describe("docs center CSS", () => {
  it("adds a restrained docs shell and responsive docs layout", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const tabletBlock = extractBlock(css, "@media (max-width: 980px)");

    expect(css).toMatch(/\.docs-center-shell\s*\{[\s\S]*border:\s*1px solid #dbe4ee/);
    expect(css).toMatch(/\.docs-center-shell\s*\{[\s\S]*box-shadow:\s*0 18px 40px rgba\(15,\s*23,\s*42,\s*0\.06\)/);
    expect(css).toMatch(/\.docs-center-header\s*\{[\s\S]*border-bottom:\s*1px solid #e2e8f0/);
    expect(css).toMatch(/\.docs-center-title\s*\{[\s\S]*font-size:\s*clamp\(1\.85rem,\s*3vw,\s*2\.5rem\)/);
    expect(css).toMatch(/\.docs-center-meta\s*\{[\s\S]*font-size:\s*0\.82rem/);
    expect(css).toMatch(/\.docs-tab-active\s*\{[\s\S]*border-color:\s*#94a3b8/);
    expect(css).toMatch(/\.docs-tab-active\s*\{[\s\S]*background-color:\s*#ffffff/);
    expect(css).toMatch(/\.docs-tab-active\s*\{[\s\S]*box-shadow:\s*inset 0 -2px 0 0 #1f2937/);
    expect(css).toMatch(/\.docs-toc-link\s*\{[\s\S]*font-size:\s*0\.86rem/);
    expect(css).toMatch(/\.docs-toc-link\s*\{[\s\S]*letter-spacing:\s*normal/);
    expect(css).toMatch(/\.docs-toc-list\s*\{[\s\S]*counter-reset:\s*docs-toc/);
    expect(css).toMatch(/\.docs-toc-list li\s*\{[\s\S]*counter-increment:\s*docs-toc/);
    expect(css).toMatch(
      /\.docs-toc-link::before\s*\{[\s\S]*content:\s*counter\(docs-toc,\s*decimal-leading-zero\)\s*"\."/,
    );

    expect(tabletBlock).toMatch(/\.docs-center-body\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.docs-tabs\s*\{[\s\S]*overflow-x:\s*auto/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.docs-tabs\s*\{[\s\S]*white-space:\s*nowrap/);
  });
});
