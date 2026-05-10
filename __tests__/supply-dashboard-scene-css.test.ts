import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function normalizeCss(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractBlocks(css: string, marker: string) {
  const blocks: string[] = [];
  let markerIndex = css.indexOf(marker);

  while (markerIndex >= 0) {
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
    blocks.push(css.slice(blockStart + 1, cursor - 1));
    markerIndex = css.indexOf(marker, markerIndex + marker.length);
  }

  expect(blocks.length).toBeGreaterThan(0);
  return blocks;
}

function extractRuleBody(css: string, selector: string) {
  const markerIndex = css.indexOf(selector);
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

function extractNestedRuleBody(blocks: string[], selector: string) {
  const block = blocks.find((candidate) => candidate.includes(selector));
  expect(block).toBeDefined();
  return extractRuleBody(block ?? "", selector);
}

describe("supply dashboard scene CSS", () => {
  it("defines a layered Dashboard scene shell", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const scene = extractRuleBody(css, ".supply-dashboard-scene");
    const background = extractRuleBody(css, ".supply-dashboard-background");
    const content = extractRuleBody(css, ".supply-dashboard-content");
    const main = extractRuleBody(css, ".supply-dashboard-main");

    expect(scene).toMatch(/position:\s*relative/);
    expect(scene).toMatch(/isolation:\s*isolate/);
    expect(scene).toMatch(/min-height:\s*100vh/);
    expect(scene).toMatch(/overflow:\s*hidden/);
    expect(background).toMatch(/position:\s*absolute/);
    expect(background).toMatch(/z-index:\s*0/);
    expect(background).toMatch(/pointer-events:\s*none/);
    expect(content).toMatch(/position:\s*relative/);
    expect(content).toMatch(/z-index:\s*1/);
    expect(main).toMatch(/grid-template-columns:\s*minmax\(16rem,\s*0\.72fr\)\s+minmax\(22rem,\s*1fr\)\s+minmax\(24rem,\s*1\.1fr\)/);
  });

  it("includes responsive and reduced-motion coverage", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const tabletBlocks = extractBlocks(css, "@media (max-width: 1100px)");
    const mobileBlocks = extractBlocks(css, "@media (max-width: 760px)");
    const reducedMotionCss = extractBlocks(css, "@media (prefers-reduced-motion: reduce)").join("\n");
    const tabletScene = extractNestedRuleBody(tabletBlocks, ".supply-dashboard-scene");
    const tabletMain = extractNestedRuleBody(tabletBlocks, ".supply-dashboard-main");
    const mobileScene = extractNestedRuleBody(mobileBlocks, ".supply-dashboard-scene");
    const mobileMain = extractNestedRuleBody(mobileBlocks, ".supply-dashboard-main");

    expect(tabletScene).toMatch(/overflow-y:\s*auto/);
    expect(tabletScene).toMatch(/(?:height|max-height):\s*100svh/);
    expect(tabletScene).toMatch(/min-height:\s*(?:100svh|0)/);
    expect(tabletScene).not.toMatch(/min-height:\s*100vh/);
    expect(tabletMain).toMatch(/grid-template-columns:\s*1fr/);
    expect(tabletMain).toMatch(/overflow-y:\s*auto/);
    expect(mobileScene).toMatch(/overflow-y:\s*auto/);
    expect(mobileScene).toMatch(/(?:height|max-height):\s*100svh/);
    expect(mobileScene).toMatch(/min-height:\s*(?:100svh|0)/);
    expect(mobileScene).not.toMatch(/min-height:\s*100vh/);
    expect(mobileMain).toMatch(/grid-template-columns:\s*1fr/);
    expect(mobileMain).toMatch(/overflow-y:\s*auto/);
    expect(reducedMotionCss).toContain(".supply-dashboard-scene *");
    expect(reducedMotionCss).toMatch(/transition-duration:\s*0\.01ms/);
  });
});
