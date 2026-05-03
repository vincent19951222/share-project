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
    const contentRule = extractRuleBody(css, ".punch-scene-content");
    const cardRule = extractRuleBody(css, ".punch-scene .soft-card");
    const heatmapRule = extractRuleBody(css, ".punch-scene .heatmap-shell");
    const mobileBlock = extractBlock(css, "@media (max-width: 760px)");
    const mobileContentRule = extractRuleBody(mobileBlock, ".punch-scene-content");

    expect(css).toMatch(/\.punch-scene\s*\{[\s\S]*isolation:\s*isolate/);
    expect(css).toMatch(/\.punch-scene\s*\{[\s\S]*padding:\s*clamp\(0\.75rem,\s*1\.5vw,\s*1\.25rem\)/);
    expect(contentRule).toMatch(/min-height:\s*0/);
    expect(cardRule).toMatch(/border-color:\s*#111827/);
    expect(cardRule).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.93\)/);
    expect(cardRule).toMatch(/box-shadow:\s*0 6px 0 0 #111827/);
    expect(heatmapRule).toMatch(/backdrop-filter:\s*blur\(2px\)/);
    expect(mobileContentRule).toMatch(/gap:\s*0\.75rem/);
  });

  it("styles the team header as a pinned bulletin board", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const bulletinRule = extractRuleBody(css, ".team-header-bulletin");
    const pinRule = extractRuleBody(css, ".team-header-pin");
    const vaultVisualRule = extractRuleBody(css, ".team-header-vault-visual");
    const ledgerRule = extractRuleBody(css, ".team-header-ledger");
    const mobileBlock = extractBlock(css, "@media (max-width: 760px)");
    const mobileVaultNoteRule = extractRuleBody(mobileBlock, ".team-header-vault-note");

    expect(bulletinRule).toMatch(/background:[\s\S]*#fff7cc/);
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
    const mobileBlock = extractBlock(css, "@media (max-width: 760px)");
    const mobileMemberRule = extractRuleBody(mobileBlock, ".heatmap-mobile-member {");

    expect(panelRule).toMatch(/border-color:\s*#111827/);
    expect(panelRule).toMatch(/background:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)/);
    expect(railRule).toMatch(/border-right:\s*3px solid #111827/);
    expect(railRule).toMatch(/background:\s*#fef3c7/);
    expect(rulerRule).toMatch(/background:\s*#111827/);
    expect(rulerRule).toMatch(/color:\s*#f8fafc/);
    expect(trackRule).toMatch(/background-image:[\s\S]*linear-gradient\(90deg,\s*rgba\(17,\s*24,\s*39,\s*0\.08\)/);
    expect(mobileMemberRule).toMatch(/background:\s*#fef3c7/);
  });
});
