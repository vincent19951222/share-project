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
    const dashboardCard = extractRuleBody(css, ".supply-task-card--dashboard");
    const dashboardShell = extractRuleBody(css, ".supply-dashboard-quest-card-shell");
    const dashboardCompleteOverlay = extractRuleBody(css, ".supply-dashboard-quest-card-complete-overlay");
    const dashboardStampOverlay = extractRuleBody(css, ".supply-dashboard-quest-card-complete-overlay[data-visual=\"stamp\"]");
    const dashboardStampSeal = extractRuleBody(css, ".supply-dashboard-quest-card-complete-overlay[data-visual=\"stamp\"]::before");
    const dashboardStampTexture = extractRuleBody(css, ".supply-dashboard-quest-card-complete-overlay[data-visual=\"stamp\"]::after");
    const dashboardActionMeta = extractRuleBody(css, ".supply-task-card-meta--actions");
    const dashboardActionButton = extractRuleBody(css, ".supply-task-card-action");
    const dashboardCompleteAction = extractRuleBody(css, ".supply-task-card-action--complete");
    const dashboardConfirmBackdrop = extractRuleBody(css, ".supply-dashboard-task-confirm-backdrop");
    const dashboardConfirm = extractRuleBody(css, ".supply-dashboard-task-confirm");
    const reviewGrid = extractRuleBody(css, ".supply-task-card-review-grid");

    expect(card).toMatch(/aspect-ratio:\s*3\s*\/\s*4/);
    expect(card).toMatch(/display:\s*grid/);
    expect(card).toMatch(/overflow:\s*hidden/);
    expect(dashboardCard).toMatch(/overflow:\s*visible/);
    expect(dashboardShell).toMatch(/--dashboard-quest-card-width:\s*9\.85rem/);
    expect(dashboardShell).toMatch(/position:\s*relative/);
    expect(dashboardShell).toMatch(/display:\s*grid/);
    expect(dashboardShell).toMatch(/width:\s*var\(--dashboard-quest-card-width\)/);
    expect(dashboardShell).toMatch(/aspect-ratio:\s*3\s*\/\s*4/);
    expect(dashboardShell).toMatch(/overflow:\s*visible/);
    expect(dashboardCompleteOverlay).toMatch(/position:\s*absolute/);
    expect(dashboardCompleteOverlay).toMatch(/inset:\s*0/);
    expect(dashboardCompleteOverlay).toMatch(/z-index:\s*8/);
    expect(dashboardCompleteOverlay).toMatch(/display:\s*grid/);
    expect(dashboardCompleteOverlay).toMatch(/place-items:\s*center/);
    expect(dashboardCompleteOverlay).toMatch(/pointer-events:\s*none/);
    expect(dashboardStampOverlay).toMatch(/border:\s*0/);
    expect(dashboardStampOverlay).toMatch(/background:\s*radial-gradient/);
    expect(dashboardStampOverlay).toMatch(/transform:\s*none/);
    expect(dashboardStampSeal).toMatch(/border-radius:\s*999px/);
    expect(dashboardStampSeal).toMatch(/aspect-ratio:\s*1/);
    expect(dashboardStampSeal).toMatch(/outline:\s*2px solid/);
    expect(dashboardStampTexture).toMatch(/border-radius:\s*999px/);
    expect(dashboardStampTexture).toMatch(/repeating-radial-gradient/);
    expect(css).not.toContain(".supply-dashboard-quest-card-hitbox");
    expect(css).not.toContain(".supply-dashboard-quest-card-actions");
    expect(css).toContain(".supply-task-card-meta > span");
    expect(dashboardActionMeta).toMatch(/grid-template-columns:\s*minmax\(1\.38rem,\s*auto\)\s*minmax\(0,\s*1fr\)\s*minmax\(0,\s*1fr\)/);
    expect(dashboardActionMeta).toMatch(/position:\s*relative/);
    expect(dashboardActionMeta).toMatch(/z-index:\s*5/);
    expect(dashboardActionButton).toMatch(/display:\s*inline-flex/);
    expect(dashboardActionButton).toMatch(/min-width:\s*0/);
    expect(dashboardActionButton).toMatch(/white-space:\s*nowrap/);
    expect(dashboardCompleteAction).toMatch(/background:\s*#22c55e/);
    expect(dashboardConfirmBackdrop).toMatch(/position:\s*absolute/);
    expect(dashboardConfirmBackdrop).toMatch(/inset:\s*0/);
    expect(dashboardConfirmBackdrop).toMatch(/z-index:\s*50/);
    expect(dashboardConfirm).toMatch(/display:\s*grid/);
    expect(dashboardConfirm).toMatch(/border:\s*4px solid #111827/);
    expect(css).not.toContain(".supply-task-card-icon-action");
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
