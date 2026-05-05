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

function extractRuleBody(css: string, selector: string) {
  const selectorIndex = css.indexOf(selector);
  expect(selectorIndex).toBeGreaterThanOrEqual(0);

  const blockStart = css.indexOf("{", selectorIndex);
  expect(blockStart).toBeGreaterThan(selectorIndex);

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

describe("home coffee scene CSS", () => {
  it("styles the coffee tab as a layered receipt counter scene", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const sceneRule = extractRuleBody(css, ".coffee-scene {");
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
    const receiptRule = extractRuleBody(css, ".coffee-receipt-ticket");
    const feedRule = extractRuleBody(css, ".coffee-activity-ticket");
    const calendarRule = extractRuleBody(css, ".coffee-calendar-paper");
    const todayColumnRule = extractRuleBody(css, ".coffee-day-column-today");
    const dialogRule = extractRuleBody(css, ".coffee-dialog-ticket");

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
    const mobileBlock = extractBlock(css, "@media (max-width: 980px)");
    const reducedMotionBlock = extractBlock(css, "@media (prefers-reduced-motion: reduce)");

    expect(mobileBlock).toContain(".coffee-counter-layout");
    expect(mobileBlock).toContain(".coffee-scene-props");
    expect(reducedMotionBlock).toContain(".coffee-scene *");
    expect(reducedMotionBlock).toMatch(/transition-duration:\s*0\.01ms/);
  });
});
