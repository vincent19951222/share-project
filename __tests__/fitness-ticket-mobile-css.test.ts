import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function extractBlock(css: string, marker: string, fromEnd = false) {
  const markerIndex = fromEnd ? css.lastIndexOf(marker) : css.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const blockStart = css.indexOf("{", markerIndex);
  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < css.length) {
    const char = css[cursor];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
    }

    cursor += 1;
  }

  return css.slice(blockStart + 1, cursor - 1);
}

function extractRuleBody(css: string, selector: string) {
  const selectorIndex = css.indexOf(selector);
  expect(selectorIndex).toBeGreaterThanOrEqual(0);

  const blockStart = css.indexOf("{", selectorIndex);
  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < css.length) {
    const char = css[cursor];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
    }

    cursor += 1;
  }

  return css.slice(blockStart + 1, cursor - 1);
}

describe("fitness ticket mobile CSS", () => {
  it("compresses the training ticket only inside mobile breakpoints", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const tabletBlock = extractBlock(css, "@media (max-width: 920px)");
    const phoneBlock = extractBlock(css, "@media (max-width: 430px)", true);

    const tabletDialogRule = extractRuleBody(tabletBlock, ".fitness-ticket-modal-dialog");

    expect(tabletDialogRule).toMatch(/display:\s*grid/);
    expect(tabletDialogRule).toMatch(/min-height:\s*calc\(100dvh - 1\.25rem\)/);
    expect(tabletDialogRule).toMatch(/align-items:\s*safe center/);
    expect(tabletDialogRule).toMatch(/justify-items:\s*center/);
    expect(extractRuleBody(tabletBlock, ".fitness-ticket-frame")).toMatch(/max-width:\s*30rem/);
    expect(extractRuleBody(tabletBlock, ".fitness-ticket-header h1")).toMatch(
      /font-size:\s*clamp\(1\.5rem,\s*7vw,\s*2\.15rem\)/,
    );
    expect(extractRuleBody(tabletBlock, ".fitness-ticket-option,\n  .fitness-ticket-option-active")).toMatch(
      /min-height:\s*2\.75rem/,
    );
    expect(extractRuleBody(tabletBlock, ".fitness-ticket-strength-card")).toMatch(/min-height:\s*5\.25rem/);
    expect(extractRuleBody(tabletBlock, ".fitness-ticket-part-icon")).toMatch(/height:\s*2\.75rem/);
    expect(extractRuleBody(tabletBlock, ".fitness-ticket-footer")).toMatch(/gap:\s*0\.625rem/);

    expect(extractRuleBody(phoneBlock, ".fitness-ticket-frame")).toMatch(/max-width:\s*24rem/);
    expect(extractRuleBody(phoneBlock, ".fitness-ticket-modal-dialog")).toMatch(
      /min-height:\s*calc\(100dvh - 0\.75rem\)/,
    );
    expect(extractRuleBody(phoneBlock, ".fitness-ticket-strength-grid")).toMatch(
      /grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/,
    );
    expect(extractRuleBody(phoneBlock, ".fitness-ticket-duration")).toMatch(
      /grid-template-columns:\s*2\.75rem minmax\(0,\s*1fr\) 2\.75rem/,
    );
    expect(extractRuleBody(phoneBlock, ".fitness-ticket-cancel,\n  .fitness-ticket-confirm")).toMatch(
      /min-height:\s*2\.875rem/,
    );
  });
});
