import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function extractBlocks(marker: string) {
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

function extractRuleBody(block: string, selector: string) {
  const markerIndex = block.indexOf(selector);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const blockStart = block.indexOf("{", markerIndex);
  expect(blockStart).toBeGreaterThan(markerIndex);

  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < block.length) {
    if (block[cursor] === "{") depth += 1;
    if (block[cursor] === "}") depth -= 1;
    cursor += 1;
  }

  expect(depth).toBe(0);
  return block.slice(blockStart + 1, cursor - 1);
}

function extractMobileRules(selector: string) {
  const mobileBlocks = extractBlocks("@media (max-width: 768px)");
  const bodies = mobileBlocks.flatMap((block) => {
    const matchingBodies: string[] = [];
    let markerIndex = block.indexOf(selector);

    while (markerIndex >= 0) {
      matchingBodies.push(extractRuleBody(block.slice(markerIndex), selector));
      markerIndex = block.indexOf(selector, markerIndex + selector.length);
    }

    return matchingBodies;
  });

  expect(bodies.length).toBeGreaterThan(0);
  return bodies;
}

function expectMobileRule(selector: string, patterns: RegExp | RegExp[]) {
  const expectedPatterns = Array.isArray(patterns) ? patterns : [patterns];
  const hasMatchingRule = extractMobileRules(selector).some((body) =>
    expectedPatterns.every((pattern) => pattern.test(body)),
  );

  expect(hasMatchingRule, selector).toBe(true);
}

describe("Supply UI Lab mobile CSS", () => {
  it("lets every non-backpack Supply UI Lab page fit the mobile viewport", () => {
    for (const selector of [
      ".supply-dashboard-content",
      ".supply-shop-content",
      ".supply-task-record-content",
      ".supply-draw-pool-content",
    ]) {
      expectMobileRule(selector, [/width:\s*100%/, /min-width:\s*0/, /max-width:\s*100%/]);
    }
  });

  it("stacks wide static UI Lab shells into one mobile column", () => {
    expectMobileRule(".supply-shop-shell", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expectMobileRule(".supply-task-record-shell", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expectMobileRule(".supply-draw-pool-layout", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expectMobileRule(".supply-dashboard-stage", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it("removes the Dashboard character stage from the narrow mobile flow", () => {
    expectMobileRule(".supply-dashboard-hero-stage", /display:\s*none/);
    expectMobileRule(".supply-dashboard-quest-list", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it("compresses shared topbar resources into the mobile viewport", () => {
    expectMobileRule(
      ".supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-statusbar",
      /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)\s*minmax\(2\.25rem,\s*auto\)/,
    );
    expectMobileRule(
      ".supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-resource em",
      /clip:\s*rect\(0\s+0\s+0\s+0\)/,
    );
    expectMobileRule(
      ".supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-resource b",
      /display:\s*none/,
    );
    expectMobileRule(".supply-ui-lab-topbar--breadcrumb .supply-ui-lab-close", /justify-self:\s*end/);
  });
});
