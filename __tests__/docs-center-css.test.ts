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
  it("adds the editorial manual shell treatments and responsive docs layout", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const tabletBlock = extractBlock(css, "@media (max-width: 980px)");

    expect(css).toMatch(/\.docs-center-shell\s*\{[\s\S]*border:\s*4px solid #1f2937/);
    expect(css).toMatch(/\.docs-center-shell\s*\{[\s\S]*box-shadow:\s*0 10px 0 0 #1f2937/);

    expect(css).toMatch(
      /\.docs-center-header\s*\{[\s\S]*background:\s*(?:linear-gradient|repeating-linear-gradient)/,
    );

    expect(css).toMatch(/\.docs-tab-active\s*\{[\s\S]*background-color:\s*#fde047/);
    expect(css).toMatch(/\.docs-tab-active\s*\{[\s\S]*box-shadow:\s*0 4px 0 0 #1f2937/);

    expect(css).toMatch(/\.docs-toc-link\s*\{[\s\S]*text-transform:\s*uppercase/);
    expect(css).toMatch(/\.docs-toc-link\s*\{[\s\S]*letter-spacing:\s*0\.12em/);

    expect(tabletBlock).toMatch(/\.docs-center-body\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.docs-tabs\s*\{[\s\S]*overflow-x:\s*auto/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.docs-tabs\s*\{[\s\S]*white-space:\s*nowrap/);
  });
});
