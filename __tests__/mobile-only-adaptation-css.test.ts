import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function extractBlockAt(marker: string, markerIndex: number) {
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

function extractBlocks(marker: string) {
  const blocks: string[] = [];
  let markerIndex = css.indexOf(marker);

  while (markerIndex >= 0) {
    blocks.push(extractBlockAt(marker, markerIndex));
    markerIndex = css.indexOf(marker, markerIndex + marker.length);
  }

  expect(blocks.length).toBeGreaterThan(0);
  return blocks;
}

function stripMediaBlocks(source: string) {
  let output = "";
  let cursor = 0;

  while (cursor < source.length) {
    if (source.startsWith("@media", cursor)) {
      const blockStart = source.indexOf("{", cursor);
      expect(blockStart).toBeGreaterThan(cursor);

      let depth = 1;
      cursor = blockStart + 1;

      while (depth > 0 && cursor < source.length) {
        if (source[cursor] === "{") depth += 1;
        if (source[cursor] === "}") depth -= 1;
        cursor += 1;
      }

      expect(depth).toBe(0);
      continue;
    }

    output += source[cursor];
    cursor += 1;
  }

  return output;
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

function expectMobileRule(selector: string, patterns: RegExp | RegExp[]) {
  const expectedPatterns = Array.isArray(patterns) ? patterns : [patterns];
  const mobileBlocks = extractBlocks("@media (max-width: 760px)");
  const hasMatchingRule = mobileBlocks.some((block) => {
    if (!block.includes(selector)) return false;
    const body = extractRuleBody(block, selector);
    return expectedPatterns.every((pattern) => pattern.test(body));
  });

  expect(hasMatchingRule, selector).toBe(true);
}

describe("mobile-only adaptation CSS", () => {
  it("keeps the fixed desktop page shell out of the mobile flow", () => {
    const rootCss = stripMediaBlocks(css);

    expect(rootCss).not.toMatch(/body\s*\{[^}]*100svh/);
    expectMobileRule("body", [
      /min-height:\s*100svh/,
      /height:\s*auto/,
      /width:\s*100%/,
      /overflow-x:\s*hidden/,
      /padding:\s*0\.75rem/,
      /gap:\s*0\.75rem/,
    ]);
    expectMobileRule(".board-tab-stage", [
      /min-height:\s*0/,
      /overflow-x:\s*hidden/,
      /overflow-y:\s*auto/,
    ]);
    expectMobileRule(".board-tab-panel-active", [
      /position:\s*relative/,
      /inset:\s*auto/,
      /min-height:\s*100%/,
    ]);
  });

  it("keeps mobile navigation and supply rails inside the phone viewport", () => {
    expectMobileRule(".app-top-nav", [
      /position:\s*sticky/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".app-top-nav > div:first-child", [
      /grid-template-areas:\s*"brand actions"\s*"wallet wallet"/,
      /min-width:\s*0/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".app-supply-mobile-wallet", [
      /grid-area:\s*wallet/,
      /width:\s*100%/,
      /min-height:\s*44px/,
    ]);
    expectMobileRule(".app-supply-secondary-nav", [
      /max-width:\s*100%/,
      /overflow-x:\s*auto/,
    ]);
    expectMobileRule(".app-supply-secondary-tab", [
      /min-height:\s*44px/,
      /flex:\s*0 0 auto/,
    ]);
  });

  it("turns punch and shared board scenes into mobile vertical flows", () => {
    expectMobileRule(".punch-board-shell", [
      /position:\s*relative/,
      /min-height:\s*auto/,
      /overflow:\s*visible/,
    ]);
    expectMobileRule(".punch-scene-content", [
      /padding-inline:\s*0/,
      /gap:\s*0\.75rem/,
    ]);
    expectMobileRule(".heatmap-mobile-scroll", [
      /max-width:\s*100%/,
      /overflow-x:\s*auto/,
    ]);
    expectMobileRule(".activity-stream-list", [
      /padding-inline:\s*0\.75rem/,
    ]);
    expectMobileRule(".shared-board-scene", [
      /height:\s*auto/,
      /min-height:\s*100%/,
      /overflow-x:\s*hidden/,
    ]);
    expectMobileRule(".shared-board-content", [
      /width:\s*100%/,
      /padding-inline:\s*0\.75rem/,
    ]);
    expectMobileRule(".shared-board-note-wall", [
      /column-count:\s*1/,
      /gap:\s*0\.85rem/,
    ]);
  });

  it("contains water shop wide content inside mobile containers", () => {
    expectMobileRule(".drink-checkin-shell", [
      /padding:\s*0\.75rem/,
      /overflow-x:\s*hidden/,
    ]);
    expectMobileRule(".drink-checkin-content", [
      /width:\s*100%/,
      /max-width:\s*100%/,
      /min-width:\s*0/,
      /overflow-x:\s*hidden/,
    ]);
    expectMobileRule(".drink-checkin-content > *", [
      /min-width:\s*0/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".drink-receipt-layout", [
      /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".drink-receipt-card", [
      /min-width:\s*0/,
      /max-width:\s*100%/,
      /overflow:\s*hidden/,
    ]);
    expectMobileRule(".drink-options-grid", [
      /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
      /gap:\s*0\.75rem/,
    ]);
    expectMobileRule(".drink-option-card", [
      /min-width:\s*0/,
      /padding:\s*0\.65rem/,
    ]);
    expectMobileRule(".drink-option-art", [
      /max-height:\s*9rem/,
      /overflow:\s*hidden/,
    ]);
    expectMobileRule(".drink-option-image", [
      /max-width:\s*7\.5rem/,
      /max-height:\s*7\.5rem/,
    ]);
    expectMobileRule(".drink-checkin-secondary-grid", [
      /grid-template-columns:\s*minmax\(0,\s*1fr\)/,
      /min-width:\s*0/,
      /max-width:\s*100%/,
      /gap:\s*0\.75rem/,
    ]);
    expectMobileRule(".drink-checkin-secondary-grid > *", [
      /min-width:\s*0/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".drink-status-card", [
      /min-width:\s*0/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".drink-team-board", [
      /min-width:\s*0/,
      /max-width:\s*100%/,
      /overflow:\s*hidden/,
    ]);
    expectMobileRule(".drink-team-scroll", [
      /width:\s*100%/,
      /max-width:\s*100%/,
      /overflow-x:\s*auto/,
    ]);
    expectMobileRule(".drink-team-table", [
      /min-width:\s*38rem/,
    ]);
  });

  it("keeps dynamics and docs long pages readable on phones", () => {
    expectMobileRule(".team-dynamics-page", [
      /padding:\s*0\.85rem/,
      /max-width:\s*100%/,
    ]);
    expectMobileRule(".team-dynamic-filter", [
      /min-height:\s*44px/,
    ]);
    expectMobileRule(".docs-center-shell", [
      /max-width:\s*100%/,
      /overflow-x:\s*hidden/,
    ]);
    expectMobileRule(".docs-tabs", [
      /overflow-x:\s*auto/,
    ]);
    expectMobileRule(".docs-tab", [
      /min-width:\s*min\(11\.5rem,\s*80vw\)/,
    ]);
  });
});
