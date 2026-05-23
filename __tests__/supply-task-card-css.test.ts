import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function normalizeCss(css: string) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractRuleBody(css: string, selector: string) {
  const marker = `${selector} {`;
  const markerIndex = css.indexOf(marker);
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

describe("supply task-card CSS", () => {
  it("locks task cards to 3:4 and keeps art as a cropped layer", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const card = extractRuleBody(css, ".supply-task-card");
    const art = extractRuleBody(css, ".supply-task-card-art");
    const artImage = extractRuleBody(css, ".supply-task-card-art img");
    const reviewGrid = extractRuleBody(css, ".supply-task-card-review-grid");

    expect(card).toMatch(/aspect-ratio:\s*3\s*\/\s*4/);
    expect(card).toMatch(/display:\s*grid/);
    expect(card).toMatch(/overflow:\s*hidden/);
    expect(art).toMatch(/position:\s*relative/);
    expect(art).toMatch(/overflow:\s*hidden/);
    expect(artImage).toMatch(/object-fit:\s*cover/);
    expect(reviewGrid).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*18\.75rem\)\)/);
  });

  it("defines both Dashboard placement review variants", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const compact = extractRuleBody(css, ".supply-task-card-dashboard-preview--compact");
    const cardFirst = extractRuleBody(css, ".supply-task-card-dashboard-preview--card-first");
    const placementGrid = extractRuleBody(css, ".supply-task-card-dashboard-preview-grid");

    expect(compact).toMatch(/max-width:\s*34\.25rem/);
    expect(cardFirst).toMatch(/max-width:\s*42rem/);
    expect(placementGrid).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(placementGrid).toMatch(/place-items:\s*center/);
  });
});
