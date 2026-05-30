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
  it("adds an official-docs shell and responsive docs layout", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const tabletBlock = extractBlock(css, "@media (max-width: 980px)");

    expect(css).toMatch(/\.docs-center-shell\s*\{[\s\S]*--docs-ink:\s*#18202f/);
    expect(css).toMatch(/\.docs-center-body\s*\{[\s\S]*grid-template-columns:\s*minmax\(13rem,\s*15rem\)\s+minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.docs-center-sidebar\s*\{[\s\S]*position:\s*sticky/);
    expect(css).toMatch(/\.docs-center-title\s*\{[\s\S]*font-size:\s*2\.35rem/);
    expect(css).toMatch(/\.docs-center-title\s*\{[\s\S]*letter-spacing:\s*0/);
    expect(css).toMatch(/\.docs-nav-primary-active\s*\{[\s\S]*border-color:\s*var\(--docs-ink\)/);
    expect(css).toMatch(/\.docs-nav-primary-active\s*\{[\s\S]*box-shadow:\s*3px 3px 0 var\(--docs-ink\)/);
    expect(css).toMatch(/\.docs-nav-children\s*\{/);
    expect(css).toMatch(/\.docs-nav-child-link\s*\{/);
    expect(css).toMatch(/\.docs-nav-child-link\[aria-current="page"\]\s*\{/);
    expect(css).toMatch(/\.docs-rule-group\s*\{/);
    expect(css).toMatch(/\.docs-probability-table\s*\{/);
    expect(css).toMatch(/\.docs-toc-link\s*\{[\s\S]*font-size:\s*0\.86rem/);
    expect(css).toMatch(/\.docs-toc-link\s*\{[\s\S]*letter-spacing:\s*0/);
    expect(css).toMatch(/\.docs-toc-list\s*\{[\s\S]*counter-reset:\s*docs-toc/);
    expect(css).toMatch(/\.docs-toc-list li\s*\{[\s\S]*counter-increment:\s*docs-toc/);
    expect(css).toMatch(
      /\.docs-toc-link::before\s*\{[\s\S]*content:\s*counter\(docs-toc,\s*decimal-leading-zero\)\s*"\."/,
    );

    expect(tabletBlock).toMatch(/\.docs-center-body\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.docs-nav-tree\s*\{[\s\S]*display:\s*grid/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.docs-nav-primary\s*\{[\s\S]*min-width:\s*0/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.docs-nav-children\s*\{[\s\S]*max-height:\s*9rem/);
  });
});
