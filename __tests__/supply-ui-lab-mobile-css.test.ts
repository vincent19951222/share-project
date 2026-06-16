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
    expectMobileRule(".supply-ui-lab-panel.supply-dashboard-quest-panel", /position:\s*relative/);
  });

  it("keeps a compact Dashboard hero in the narrow mobile flow", () => {
    expectMobileRule(".supply-dashboard-hero-stage", /display:\s*none/);
    expectMobileRule(".supply-dashboard-mobile-hero", /display:\s*grid/);
    expectMobileRule(".supply-dashboard-mobile-hero", /grid-template-columns:\s*auto\s+minmax\(0,\s*1fr\)/);
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
    expectMobileRule(".supply-ui-lab-topbar--breadcrumb .supply-ui-lab-close", /justify-self:\s*end/);
  });

  it("keeps the shared topbar readable as a three-row mobile header", () => {
    expectMobileRule(
      ".supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb)",
      [/grid-template-rows:\s*auto\s+auto\s+auto/, /overflow:\s*hidden/],
    );
    expectMobileRule(
      ".supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-resource-strip",
      /overflow-x:\s*auto/,
    );
    expectMobileRule(
      ".supply-ui-lab-topbar:not(.supply-ui-lab-topbar--breadcrumb) .supply-ui-lab-resource strong",
      /text-overflow:\s*ellipsis/,
    );
  });

  it("prioritizes the embedded dashboard task flow on phones", () => {
    expectMobileRule(".supply-dashboard-scene--embedded .supply-dashboard-stage", /gap:\s*0\.65rem/);
    expectMobileRule(
      ".supply-dashboard-scene--embedded .supply-dashboard-quest-panel",
      [/order:\s*2/, /padding:\s*0\.75rem/],
    );
    expectMobileRule(
      ".supply-dashboard-scene--embedded .supply-dashboard-quest-list",
      [/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, /gap:\s*0\.6rem/],
    );
    expectMobileRule(".supply-dashboard-scene--embedded .supply-dashboard-status-panel", /order:\s*3/);
    expectMobileRule(
      ".supply-dashboard-scene--embedded .supply-dashboard-shortcut-dock",
      [/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/, /gap:\s*0\.55rem/],
    );
    expectMobileRule(
      ".supply-dashboard-scene--embedded .supply-dashboard-shortcut-card",
      [/min-height:\s*4\.75rem/, /padding:\s*0\.55rem/],
    );
    expectMobileRule(
      ".supply-dashboard-task-confirm",
      [/max-height:\s*calc\(100svh\s*-\s*2rem\)/, /overflow-y:\s*auto/],
    );
    expectMobileRule(".supply-dashboard-task-confirm-body", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

  it("contains every embedded production panel inside the phone viewport", () => {
    for (const selector of [
      ".supply-dashboard-scene--embedded",
      ".supply-shop-scene--embedded",
      ".supply-task-record-scene--embedded",
      ".supply-backpack-scene--embedded",
      ".supply-draw-pool-scene--embedded",
    ]) {
      expectMobileRule(selector, [/max-width:\s*100%/, /overflow-x:\s*hidden/]);
    }

    expectMobileRule(".supply-backpack-content", [/width:\s*100%/, /min-width:\s*0/, /max-width:\s*100%/]);
    expectMobileRule(".supply-backpack-shell", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expectMobileRule(".supply-shop-scene--embedded .supply-shop-shell", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expectMobileRule(".supply-task-record-scene--embedded .supply-task-record-shell", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expectMobileRule(".supply-draw-pool-scene--embedded .supply-draw-pool-layout", /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });
});
