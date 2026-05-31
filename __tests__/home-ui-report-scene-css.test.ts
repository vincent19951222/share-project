import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function normalizeCss(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripMediaBlocks(css: string) {
  let output = "";
  let cursor = 0;

  while (cursor < css.length) {
    if (css.startsWith("@media", cursor)) {
      const blockStart = css.indexOf("{", cursor);
      expect(blockStart).toBeGreaterThan(cursor);

      let depth = 1;
      cursor = blockStart + 1;

      while (depth > 0 && cursor < css.length) {
        const char = css[cursor];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        cursor += 1;
      }

      expect(depth).toBe(0);
      continue;
    }

    output += css[cursor];
    cursor += 1;
  }

  return output;
}

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

function extractRuleBodies(css: string, selector: string) {
  const matchingBodies: string[] = [];
  let blockStart = css.indexOf("{");

  while (blockStart >= 0) {
    const previousClose = css.lastIndexOf("}", blockStart);
    const previousOpen = css.lastIndexOf("{", blockStart - 1);
    const selectorStart = Math.max(previousClose, previousOpen) + 1;
    const selectorList = css.slice(selectorStart, blockStart).trim();
    const selectors = selectorList.split(",").map((item) => item.trim());

    if (!selectorList.startsWith("@") && selectors.includes(selector)) {
      let depth = 1;
      let cursor = blockStart + 1;

      while (depth > 0 && cursor < css.length) {
        const char = css[cursor];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        cursor += 1;
      }

      expect(depth).toBe(0);
      matchingBodies.push(css.slice(blockStart + 1, cursor - 1));
    }

    blockStart = css.indexOf("{", blockStart + 1);
  }

  return matchingBodies;
}

function extractSingleRuleBody(css: string, selector: string) {
  const matchingBodies = extractRuleBodies(css, selector);

  expect(matchingBodies.length).toBeGreaterThan(0);
  return matchingBodies.join("\n");
}

describe("home report scene CSS", () => {
  it("styles the report tab as a layered editorial desk scene", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const rootCss = stripMediaBlocks(css);
    expect(extractRuleBodies(rootCss, ".report-board")).toHaveLength(1);
    const boardRule = extractSingleRuleBody(rootCss, ".report-board");
    const sceneRule = extractSingleRuleBody(rootCss, ".report-scene");
    const backgroundRule = extractSingleRuleBody(rootCss, ".report-scene-background");
    const propsRule = extractSingleRuleBody(rootCss, ".report-scene-props");
    const contentRule = extractSingleRuleBody(rootCss, ".report-scene-content");

    expect(boardRule).toMatch(/overflow-y:\s*auto/);
    expect(boardRule).toMatch(/overflow-x:\s*hidden/);
    expect(boardRule).toMatch(/background:\s*transparent/);
    expect(boardRule).toMatch(/border:\s*0/);
    expect(sceneRule).toMatch(/position:\s*relative/);
    expect(sceneRule).toMatch(/isolation:\s*isolate/);
    expect(sceneRule).toMatch(/height:\s*auto/);
    expect(sceneRule).toMatch(/min-height:\s*100%/);
    expect(sceneRule).toMatch(/border-radius:\s*1\.65rem/);
    expect(backgroundRule).toMatch(/z-index:\s*0/);
    expect(backgroundRule).toMatch(/clip-path:\s*inset\(0 round 1\.65rem\)/);
    expect(propsRule).toMatch(/pointer-events:\s*none/);
    expect(propsRule).toMatch(/z-index:\s*1/);
    expect(propsRule).toMatch(/clip-path:\s*inset\(0 round 1\.65rem\)/);
    expect(contentRule).toMatch(/position:\s*relative/);
    expect(contentRule).toMatch(/z-index:\s*2/);
    expect(contentRule).toMatch(/display:\s*flex/);
    expect(contentRule).toMatch(/flex-direction:\s*column/);
    expect(contentRule).toMatch(/height:\s*auto/);
    expect(contentRule).toMatch(/overflow:\s*visible/);
    expect(contentRule).toMatch(/padding-inline:\s*clamp\(7\.5rem,\s*10vw,\s*12\.5rem\)/);
  });

  it("styles the report paper surfaces, inset appendix, and admin proof sheet", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const rootCss = stripMediaBlocks(css);
    const headerRule = extractSingleRuleBody(rootCss, ".report-header-strip");
    const chartPaperRule = extractSingleRuleBody(rootCss, ".report-analysis-paper");
    const metricRule = extractSingleRuleBody(rootCss, ".report-metric-tile");
    const bodyGridRule = extractSingleRuleBody(rootCss, ".report-analysis-body-grid");
    const todayMarkerRule = extractSingleRuleBody(rootCss, ".report-prototype-today-marker");
    const coffeeInsetRule = extractSingleRuleBody(rootCss, ".coffee-report-inset-shell");
    const coffeeCupArtboardRule = extractSingleRuleBody(rootCss, ".coffee-report-cup-artboard");
    const coffeeCupTitleRule = extractSingleRuleBody(rootCss, ".coffee-report-cup-label-title");
    const coffeeReceiptFooterRule = extractSingleRuleBody(rootCss, ".coffee-report-receipt-footer");
    const weeklyPaperRule = extractSingleRuleBody(rootCss, ".game-weekly-report-paper");
    const weeklyRailRule = extractSingleRuleBody(rootCss, ".game-weekly-report-highlights-rail");
    const adminSheetRule = extractSingleRuleBody(rootCss, ".weekly-report-admin-sheet");

    expect(headerRule).toMatch(/border:\s*4px solid #111827/);
    expect(headerRule).toMatch(/box-shadow:\s*6px 6px 0 #1f2937/);
    expect(chartPaperRule).toMatch(/min-height:\s*0/);
    expect(metricRule).toMatch(/border:\s*4px solid #111827/);
    expect(metricRule).toMatch(/box-shadow:\s*6px 6px 0 #1f2937/);
    expect(bodyGridRule).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(todayMarkerRule).toMatch(/fill:\s*#fde047/);
    expect(todayMarkerRule).toMatch(/stroke:\s*#f59e0b/);
    expect(coffeeInsetRule).toMatch(/border:\s*4px solid #b45309/);
    expect(coffeeInsetRule).toMatch(/box-shadow:\s*6px 6px 0 rgba\(120,\s*53,\s*15,\s*0\.18\)/);
    expect(coffeeInsetRule).toMatch(/height:\s*auto/);
    expect(coffeeInsetRule).toMatch(/min-height:\s*clamp\(30rem,\s*58vh,\s*36rem\)/);
    expect(coffeeCupArtboardRule).toMatch(/container-type:\s*inline-size/);
    expect(coffeeCupTitleRule).toMatch(/white-space:\s*nowrap/);
    expect(coffeeReceiptFooterRule).toMatch(/grid-template-columns:\s*47% 53%/);
    expect(weeklyPaperRule).toMatch(/border:\s*3px solid #111827/);
    expect(weeklyRailRule).toMatch(/border:\s*4px solid #111827/);
    expect(adminSheetRule).toMatch(/border:\s*4px solid #111827/);
  });

  it("includes responsive and reduced-motion coverage for the report scene", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const mobileBlocks = extractBlocks(css, "@media (max-width: 760px)");
    const reducedMotionBlocks = extractBlocks(css, "@media (prefers-reduced-motion: reduce)");
    const mobileCss = mobileBlocks.join("\n");
    expect(extractRuleBodies(mobileCss, ".report-board")).toHaveLength(1);
    const mobileBoardRule = extractSingleRuleBody(mobileCss, ".report-board");

    expect(mobileBoardRule).toMatch(/height:\s*auto/);
    expect(mobileBoardRule).toMatch(/overflow:\s*visible/);
    expect(mobileBoardRule).toMatch(/padding:\s*0\.75rem/);
    expect(
      mobileBlocks.some(
        (block) => block.includes(".report-scene-props") && /opacity:\s*0\.45/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".report-scene-content") &&
          /padding:\s*0\.75rem/.test(block) &&
          /gap:\s*0\.8rem/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".report-scene-analysis") &&
          /grid-template-columns:\s*1fr/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".report-header-strip") &&
          /min-height:\s*0/.test(block) &&
          /padding:\s*0\.75rem/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".report-header-decor-row") &&
          /display:\s*none/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".coffee-report-inset-shell") &&
          /min-height:\s*0/.test(block),
      ),
    ).toBe(true);
    expect(
      mobileBlocks.some(
        (block) =>
          block.includes(".game-weekly-report-desk") &&
          /max-height:\s*42rem/.test(block) &&
          /overflow-y:\s*auto/.test(block),
      ),
    ).toBe(true);
    expect(
      reducedMotionBlocks.some(
        (block) =>
          block.includes(".report-scene *") &&
          /scroll-behavior:\s*auto/.test(block) &&
          /transition-duration:\s*0\.01ms/.test(block),
      ),
    ).toBe(true);
  });
});
