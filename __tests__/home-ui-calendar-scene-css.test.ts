import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function extractBlocks(css: string, marker: string) {
  const blocks: string[] = [];
  let markerIndex = css.indexOf(marker);

  while (markerIndex >= 0) {
    blocks.push(extractBlockAt(css, marker, markerIndex));
    markerIndex = css.indexOf(marker, markerIndex + marker.length);
  }

  expect(blocks.length).toBeGreaterThan(0);
  return blocks;
}

function extractBlockAt(css: string, marker: string, markerIndex: number) {
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

function extractRuleBody(css: string, selector: string, bodyPattern?: RegExp) {
  const matchingBodies: string[] = [];
  let blockStart = css.indexOf("{");

  while (blockStart >= 0) {
    const previousClose = css.lastIndexOf("}", blockStart);
    const previousOpen = css.lastIndexOf("{", blockStart - 1);
    const selectorStart = Math.max(previousClose, previousOpen) + 1;
    const selectorList = css.slice(selectorStart, blockStart).trim();
    const selectors = selectorList.split(",").map((item) => item.trim());

    if (!selectorList.startsWith("@") && selectors.includes(selector)) {
      matchingBodies.push(extractBlockAt(css, selector, css.lastIndexOf(selector, blockStart)));
    }

    blockStart = css.indexOf("{", blockStart + 1);
  }

  expect(matchingBodies.length).toBeGreaterThan(0);

  if (bodyPattern) {
    const matchingBody = matchingBodies.find((body) => bodyPattern.test(body));
    expect(matchingBody).toBeDefined();
  }

  return matchingBodies.join("\n");
}

describe("home calendar scene CSS", () => {
  it("styles the calendar tab as a layered desk binder scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const sceneRule = extractRuleBody(css, ".calendar-scene");
    const backgroundRule = extractRuleBody(css, ".calendar-scene-background", /calendar_desk_bg\.webp/);
    const propsRule = extractRuleBody(css, ".calendar-scene-props", /z-index:\s*1/);
    const contentRule = extractRuleBody(css, ".calendar-scene-content");

    expect(sceneRule).toMatch(/position:\s*relative/);
    expect(sceneRule).toMatch(/isolation:\s*isolate/);
    expect(sceneRule).toMatch(/border-radius:\s*1\.65rem/);
    expect(backgroundRule).toMatch(/calendar_desk_bg\.webp/);
    expect(backgroundRule).toMatch(/z-index:\s*0/);
    expect(backgroundRule).toMatch(/clip-path:\s*inset\(0 round 1\.65rem\)/);
    expect(propsRule).toMatch(/pointer-events:\s*none/);
    expect(propsRule).toMatch(/z-index:\s*1/);
    expect(contentRule).toMatch(/position:\s*relative/);
    expect(contentRule).toMatch(/z-index:\s*2/);
    expect(contentRule).toMatch(/padding-inline:\s*clamp\(7\.5rem,\s*10vw,\s*12\.5rem\)/);
  });

  it("styles the paper surface, summary chips, table grid, and day states", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const paperRule = extractRuleBody(css, ".calendar-paper-surface");
    const summaryRule = extractRuleBody(css, ".calendar-summary-chip", /border:\s*3px solid #111827/);
    const tableRule = extractRuleBody(css, ".calendar-month-table");
    const weekdayRule = extractRuleBody(css, ".calendar-weekday");
    const todayRule = extractRuleBody(css, ".calendar-day-cell-today", /background:\s*#fef3c7/);
    const neighborRule = extractRuleBody(css, ".calendar-neighbor-cell");

    expect(paperRule).toMatch(/border:\s*4px solid #111827/);
    expect(paperRule).toMatch(/binder_paper_texture\.webp/);
    expect(paperRule).toMatch(/overflow:\s*hidden/);
    expect(paperRule).toMatch(/background-clip:\s*padding-box/);
    expect(summaryRule).toMatch(/border:\s*3px solid #111827/);
    expect(tableRule).toMatch(/border:\s*2px solid #d1d5db/);
    expect(weekdayRule).toMatch(/display:\s*inline-flex/);
    expect(weekdayRule).toMatch(/white-space:\s*nowrap/);
    expect(todayRule).toMatch(/background:\s*#fef3c7/);
    expect(neighborRule).toMatch(/color:\s*#a3a3a3/);
  });

  it("includes responsive and reduced-motion coverage for the calendar scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const tabletBlocks = extractBlocks(css, "@media (max-width: 1024px)");
    const mobileBlocks = extractBlocks(css, "@media (max-width: 760px)");
    const reducedMotionBlocks = extractBlocks(css, "@media (prefers-reduced-motion: reduce)");
    const disabledReturnRule = extractRuleBody(css, ".calendar-return-btn:disabled");

    expect(disabledReturnRule).toMatch(/cursor:\s*not-allowed/);

    expect(
      tabletBlocks.some(
        (block) => block.includes(".calendar-scene") && /margin-top:\s*clamp/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) => block.includes(".calendar-scene-props") && block.includes(".calendar-paper-surface"),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          /\.calendar-binder-shell\s*\{[^}]*height:\s*auto/.test(block) &&
          /\.calendar-paper-surface\s*\{[^}]*height:\s*auto/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".calendar-summary-chip") &&
          /grid-template-columns:\s*auto auto minmax\(1\.4rem,\s*auto\) auto/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".calendar-scene") &&
          /margin-top:\s*0/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".calendar-board-viewport") &&
          /overflow-y:\s*auto/.test(block) &&
          /overflow-x:\s*hidden/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".calendar-month-table") &&
          /min-width:\s*0/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".calendar-month-grid") &&
          /grid-auto-rows:\s*minmax\(2\.75rem,\s*2\.75rem\)/.test(block) &&
          /flex:\s*0 0 auto/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          !block.includes("@media (max-width: 430px)") &&
          block.includes(".calendar-summary-row") &&
          /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(block),
      ),
    ).toBe(true);
    expect(
      reducedMotionBlocks.some(
        (block) => block.includes(".calendar-scene *") && /transition-duration:\s*0\.01ms/.test(block),
      ),
    ).toBe(true);
    expect(
      reducedMotionBlocks.some(
        (block) =>
          block.includes(".calendar-day-cell-today:hover") &&
          /transform:\s*none/.test(block),
      ),
    ).toBe(true);
  });
});
