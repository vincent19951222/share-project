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

describe("home punch scene CSS", () => {
  it("styles the punch scene as a framed gym shell with readable foreground panels", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const propsRule = extractRuleBody(css, ".punch-scene-props {");
    const contentRule = extractRuleBody(css, ".punch-scene-content");
    const cardRule = extractRuleBody(css, ".punch-scene .soft-card");
    const heatmapRule = extractRuleBody(css, ".punch-scene .heatmap-shell");
    const dumbbellRule = extractRuleBody(css, ".punch-scene-dumbbell {");
    const towelRule = extractRuleBody(css, ".punch-scene-towel {");
    const mobileBlock = extractBlock(css, "@media (max-width: 760px)");
    const mobileContentRule = extractRuleBody(mobileBlock, ".punch-scene-content");

    expect(css).toMatch(/\.punch-scene\s*\{[\s\S]*isolation:\s*isolate/);
    expect(css).toMatch(/\.punch-scene\s*\{[\s\S]*padding:\s*clamp\(0\.75rem,\s*1\.5vw,\s*1\.25rem\)/);
    expect(propsRule).toMatch(/z-index:\s*1/);
    expect(contentRule).toMatch(/min-height:\s*0/);
    expect(contentRule).toMatch(/position:\s*relative/);
    expect(contentRule).toMatch(/z-index:\s*2/);
    expect(contentRule).toMatch(/padding-inline:\s*clamp\(7\.5rem,\s*10vw,\s*12\.5rem\)/);
    expect(cardRule).toMatch(/border-color:\s*#111827/);
    expect(cardRule).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.97\)/);
    expect(cardRule).toMatch(/box-shadow:\s*0 6px 0 0 #111827/);
    expect(heatmapRule).toMatch(/backdrop-filter:\s*blur\(2px\)/);
    expect(dumbbellRule).toMatch(/left:\s*clamp/);
    expect(towelRule).toMatch(/right:\s*clamp/);
    expect(mobileContentRule).toMatch(/gap:\s*0\.75rem/);
    expect(mobileContentRule).toMatch(/padding-inline:\s*0/);
  });

  it("styles the team header as a pinned bulletin board", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const bulletinRule = extractRuleBody(css, ".team-header-bulletin");
    const pinRule = extractRuleBody(css, ".team-header-pin");
    const vaultVisualRule = extractRuleBody(css, ".team-header-vault-visual");
    const ledgerRule = extractRuleBody(css, ".team-header-ledger");
    const mobileBlock = extractBlock(css, "@media (max-width: 760px)");
    const mobileVaultNoteRule = extractRuleBody(mobileBlock, ".team-header-vault-note");

    expect(bulletinRule).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.97\)/);
    expect(bulletinRule).toMatch(/border-color:\s*#111827/);
    expect(bulletinRule).toMatch(/box-shadow:\s*0 6px 0 0 #111827/);
    expect(pinRule).toMatch(/background:\s*#fde047/);
    expect(pinRule).toMatch(/border:\s*2px solid #111827/);
    expect(vaultVisualRule).toMatch(/width:\s*clamp\(3\.75rem,\s*6vw,\s*5\.5rem\)/);
    expect(vaultVisualRule).toMatch(/background:\s*#fef3c7/);
    expect(ledgerRule).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.86\)/);
    expect(ledgerRule).toMatch(/border-left:\s*3px dashed #111827/);
    expect(mobileVaultNoteRule).toMatch(/align-items:\s*center/);
  });

  it("styles the heatmap as a gym training tracker", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const panelRule = extractRuleBody(css, ".heatmap-training-panel");
    const railRule = extractRuleBody(css, ".heatmap-member-rail");
    const rulerRule = extractRuleBody(css, ".heatmap-day-ruler");
    const trackRule = extractRuleBody(css, ".heatmap-grid-track");
    const headingRule = extractRuleBody(css, ".heatmap-members-heading,\n.heatmap-days-header");
    const rowStackRule = extractRuleBody(css, ".heatmap-members-list,\n.heatmap-grid-rows");
    const rowRule = extractRuleBody(css, ".heatmap-member-item,\n.heatmap-grid-row");
    const todayCellRule = extractRuleBody(css, ".heatmap-cell-today");
    const todayButtonRule = extractRuleBody(css, ".heatmap-cell-today.my-punch-btn");
    const mobileBlock = extractBlock(css, "@media (max-width: 760px)");
    const mobileMemberRule = extractRuleBody(mobileBlock, ".heatmap-mobile-member {");

    expect(panelRule).toMatch(/--heatmap-desktop-header-height:\s*2\.5rem/);
    expect(panelRule).toMatch(/--heatmap-desktop-row-height:\s*3\.75rem/);
    expect(panelRule).toMatch(/border-color:\s*#111827/);
    expect(panelRule).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)/);
    expect(railRule).toMatch(/border-right:\s*3px solid #111827/);
    expect(railRule).toMatch(/background:\s*#fef3c7/);
    expect(rulerRule).toMatch(/background:\s*#111827/);
    expect(rulerRule).toMatch(/color:\s*#f8fafc/);
    expect(trackRule).toMatch(/background-color:\s*rgba\(255,\s*255,\s*255,\s*0\.58\)/);
    expect(trackRule).not.toMatch(/background-image/);
    expect(trackRule).not.toMatch(/background-size/);
    expect(headingRule).toMatch(/flex:\s*0 0 var\(--heatmap-desktop-header-height\)/);
    expect(headingRule).toMatch(/height:\s*var\(--heatmap-desktop-header-height\)/);
    expect(rowStackRule).toMatch(/justify-content:\s*flex-start/);
    expect(rowRule).toMatch(/flex:\s*0 0 var\(--heatmap-desktop-row-height\)/);
    expect(rowRule).toMatch(/height:\s*var\(--heatmap-desktop-row-height\)/);
    expect(todayCellRule).toMatch(/background:\s*#fef08a/);
    expect(todayCellRule).toMatch(/border-color:\s*#fde047/);
    expect(todayButtonRule).toMatch(/background:\s*#111827/);
    expect(todayButtonRule).toMatch(/color:\s*#fde047/);
    expect(mobileMemberRule).toMatch(/background:\s*#fef3c7/);
  });

  it("styles the activity stream as a high-contrast training log", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const consoleRule = extractRuleBody(css, ".activity-stream-console");
    const headerRule = extractRuleBody(css, ".activity-stream-header");
    const listRule = extractRuleBody(css, ".activity-stream-list");
    const emptyRule = extractRuleBody(css, ".activity-stream-empty");
    const mobileBlock = extractBlock(css, "@media (max-width: 760px)");
    const mobileConsoleRule = extractRuleBody(mobileBlock, ".activity-stream-console");

    expect(consoleRule).toMatch(/border-color:\s*#111827/);
    expect(consoleRule).toMatch(/background:\s*#111827/);
    expect(consoleRule).toMatch(/color:\s*#f8fafc/);
    expect(headerRule).toMatch(/background:\s*#fde047/);
    expect(headerRule).toMatch(/color:\s*#111827/);
    expect(listRule).toMatch(/background:\s*rgba\(248,\s*250,\s*252,\s*0\.96\)/);
    expect(emptyRule).toMatch(/border:\s*2px dashed #111827/);
    expect(mobileConsoleRule).toMatch(/border-width:\s*4px/);
  });
});
