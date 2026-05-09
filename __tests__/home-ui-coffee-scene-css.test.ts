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

function extractRuleBody(css: string, selector: string) {
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
  return matchingBodies.join("\n");
}

describe("home coffee scene CSS", () => {
  it("styles the coffee tab as a layered receipt counter scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const sceneRule = extractRuleBody(css, ".coffee-scene");
    const backgroundRule = extractRuleBody(css, ".coffee-scene-background");
    const propsRule = extractRuleBody(css, ".coffee-scene-props");
    const contentRule = extractRuleBody(css, ".coffee-scene-content");

    expect(sceneRule).toMatch(/position:\s*relative/);
    expect(sceneRule).toMatch(/isolation:\s*isolate/);
    expect(sceneRule).toMatch(/border-radius:\s*1\.65rem/);
    expect(backgroundRule).toMatch(/border-radius:\s*inherit/);
    expect(backgroundRule).toMatch(/z-index:\s*0/);
    expect(propsRule).toMatch(/pointer-events:\s*none/);
    expect(propsRule).toMatch(/border-radius:\s*inherit/);
    expect(propsRule).toMatch(/z-index:\s*1/);
    expect(contentRule).toMatch(/position:\s*relative/);
    expect(contentRule).toMatch(/z-index:\s*2/);
  });

  it("styles receipt, realtime feed, calendar paper, and coffee dialog surfaces", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const desktopShellRule = extractRuleBody(css, ".coffee-grid-desktop-shell");
    const daysHeaderRule = extractRuleBody(css, ".coffee-days-header");
    const dayHeadingRule = extractRuleBody(css, ".coffee-day-heading");
    const rowRule = extractRuleBody(css, ".coffee-calendar-row");
    const cellRule = extractRuleBody(css, ".coffee-calendar-cell");
    const gridBodyRule = extractRuleBody(css, ".coffee-grid-body");
    const receiptRule = extractRuleBody(css, ".coffee-receipt-ticket");
    const feedRule = extractRuleBody(css, ".coffee-activity-ticket");
    const calendarRule = extractRuleBody(css, ".coffee-calendar-paper");
    const todayColumnRule = extractRuleBody(css, ".coffee-day-column-today");
    const dialogRule = extractRuleBody(css, ".coffee-dialog-ticket");

    expect(desktopShellRule).toMatch(/--coffee-grid-cell-size:\s*2\.75rem/);
    expect(desktopShellRule).toMatch(/--coffee-grid-col-gap:\s*0\.5rem/);
    expect(desktopShellRule).toMatch(/--coffee-grid-inline-pad:\s*0\.8rem/);
    expect(daysHeaderRule).toMatch(/gap:\s*var\(--coffee-grid-col-gap\)/);
    expect(daysHeaderRule).toMatch(/padding-inline:\s*var\(--coffee-grid-inline-pad\)/);
    expect(dayHeadingRule).toMatch(/width:\s*var\(--coffee-grid-cell-size\)/);
    expect(dayHeadingRule).toMatch(/flex:\s*0 0 var\(--coffee-grid-cell-size\)/);
    expect(rowRule).toMatch(/gap:\s*var\(--coffee-grid-col-gap\)/);
    expect(cellRule).toMatch(/width:\s*var\(--coffee-grid-cell-size\)/);
    expect(cellRule).toMatch(/flex:\s*0 0 var\(--coffee-grid-cell-size\)/);
    expect(gridBodyRule).toMatch(/padding:\s*0\.65rem var\(--coffee-grid-inline-pad\)/);
    expect(receiptRule).toMatch(/border:\s*4px solid #111827/);
    expect(receiptRule).toMatch(/background-image:[\s\S]*receipt-paper-texture\.webp/);
    expect(feedRule).toMatch(/border:\s*4px solid #111827/);
    expect(feedRule).toMatch(/background-image:[\s\S]*receipt-paper-texture\.webp/);
    expect(calendarRule).toMatch(/border:\s*4px solid #111827/);
    expect(calendarRule).toMatch(/background-image:[\s\S]*receipt-paper-texture\.webp/);
    expect(todayColumnRule).toMatch(/background:\s*rgba\(20,\s*184,\s*166,\s*0\.16\)/);
    expect(dialogRule).toMatch(/border:\s*4px solid #111827/);
  });

  it("includes responsive and reduced-motion coverage for the coffee scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const mobileBlocks = extractBlocks(css, "@media (max-width: 980px)");
    const reducedMotionBlocks = extractBlocks(css, "@media (prefers-reduced-motion: reduce)");

    expect(
      mobileBlocks.some(
        (block) => block.includes(".coffee-counter-layout") && block.includes(".coffee-scene-props"),
      ),
    ).toBe(true);
    expect(
      reducedMotionBlocks.some(
        (block) => block.includes(".coffee-scene *") && /transition-duration:\s*0\.01ms/.test(block),
      ),
    ).toBe(true);
  });
});
