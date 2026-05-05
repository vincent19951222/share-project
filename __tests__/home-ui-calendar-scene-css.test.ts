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
    const backgroundRule = extractRuleBody(css, ".calendar-scene-background", /calendar-desk-bg\.webp/);
    const propsRule = extractRuleBody(css, ".calendar-scene-props", /z-index:\s*1/);
    const contentRule = extractRuleBody(css, ".calendar-scene-content");

    expect(sceneRule).toMatch(/position:\s*relative/);
    expect(sceneRule).toMatch(/isolation:\s*isolate/);
    expect(sceneRule).toMatch(/border-radius:\s*1\.65rem/);
    expect(backgroundRule).toMatch(/calendar-desk-bg\.webp/);
    expect(backgroundRule).toMatch(/z-index:\s*0/);
    expect(propsRule).toMatch(/pointer-events:\s*none/);
    expect(propsRule).toMatch(/z-index:\s*1/);
    expect(contentRule).toMatch(/position:\s*relative/);
    expect(contentRule).toMatch(/z-index:\s*2/);
  });

  it("styles the paper surface, summary chips, table grid, and day states", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const paperRule = extractRuleBody(css, ".calendar-paper-surface");
    const summaryRule = extractRuleBody(css, ".calendar-summary-chip", /border:\s*3px solid #111827/);
    const tableRule = extractRuleBody(css, ".calendar-month-table");
    const todayRule = extractRuleBody(css, ".calendar-day-cell-today", /background:\s*#fef3c7/);
    const neighborRule = extractRuleBody(css, ".calendar-neighbor-cell");

    expect(paperRule).toMatch(/border:\s*4px solid #111827/);
    expect(paperRule).toMatch(/binder-paper-texture\.webp/);
    expect(summaryRule).toMatch(/border:\s*3px solid #111827/);
    expect(tableRule).toMatch(/border:\s*2px solid #d1d5db/);
    expect(todayRule).toMatch(/background:\s*#fef3c7/);
    expect(neighborRule).toMatch(/color:\s*#a3a3a3/);
  });

  it("includes responsive and reduced-motion coverage for the calendar scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const mobileBlocks = extractBlocks(css, "@media (max-width: 760px)");
    const reducedMotionBlocks = extractBlocks(css, "@media (prefers-reduced-motion: reduce)");

    expect(
      mobileBlocks.some(
        (block) => block.includes(".calendar-scene-props") && block.includes(".calendar-paper-surface"),
      ),
    ).toBe(true);
    expect(
      reducedMotionBlocks.some(
        (block) => block.includes(".calendar-scene *") && /transition-duration:\s*0\.01ms/.test(block),
      ),
    ).toBe(true);
  });
});
