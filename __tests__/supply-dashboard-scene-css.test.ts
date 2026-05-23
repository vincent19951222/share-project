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
  it("defines a shared-topbar Dashboard stage for componentized prototype alignment", () => {
    const rawCss = readFileSync("app/globals.css", "utf8");
    expect(rawCss).not.toContain("Dashboard UI Lab prototype image-layer scene");
    expect(rawCss).not.toMatch(/\.supply-dashboard-quest-card\s*{[\s\S]*color:\s*transparent\s*!important/);
    const dashboardCss = normalizeCss(rawCss.slice(rawCss.indexOf("Dashboard UI Lab componentized prototype scene")));
    const scene = extractRuleBody(dashboardCss, ".supply-dashboard-scene");
    const background = extractRuleBody(dashboardCss, ".supply-dashboard-background");
    const content = extractRuleBody(dashboardCss, ".supply-dashboard-content");
    const stage = extractRuleBody(dashboardCss, ".supply-dashboard-stage");

    expect(scene).toMatch(/position:\s*fixed/);
    expect(scene).toMatch(/inset:\s*0/);
    expect(scene).toMatch(/width:\s*100vw/);
    expect(scene).toMatch(/height:\s*100svh/);
    expect(scene).toMatch(/isolation:\s*isolate/);
    expect(scene).toMatch(/min-height:\s*100svh/);
    expect(scene).toMatch(/overflow:\s*auto/);
    expect(background).toMatch(/position:\s*absolute/);
    expect(background).toMatch(/z-index:\s*0/);
    expect(background).toMatch(/pointer-events:\s*none/);
    expect(content).toMatch(/position:\s*relative/);
    expect(content).toMatch(/z-index:\s*1/);
    expect(content).toMatch(/min-width:\s*1280px/);
    expect(content).toMatch(/padding:\s*var\(--supply-ui-lab-topbar-height\)\s*0\s*0/);
    expect(stage).toMatch(/position:\s*relative/);
    expect(stage).toMatch(/aspect-ratio:\s*1536\s*\/\s*946/);
    expect(dashboardCss).toMatch(/\.supply-dashboard-status-panel\s*{[\s\S]*left:\s*0\.52%/);
    expect(dashboardCss).toMatch(/\.supply-dashboard-hero-stage\s*{[\s\S]*left:\s*24\.35%/);
    expect(dashboardCss).toMatch(/\.supply-dashboard-quest-panel\s*{[\s\S]*left:\s*63\.15%/);
    expect(dashboardCss).not.toContain(".supply-dashboard-panel-image");
  });

  it("styles semantic dashboard components instead of transparent screenshot hotspots", () => {
    const rawCss = readFileSync("app/globals.css", "utf8");
    const dashboardCss = normalizeCss(rawCss.slice(rawCss.indexOf("Dashboard UI Lab componentized prototype scene")));
    const questHotspot = extractRuleBody(dashboardCss, ".supply-dashboard-quest-card");
    const questCardOne = extractRuleBody(dashboardCss, ".supply-dashboard-quest-card--1");
    const shortcutDock = extractRuleBody(dashboardCss, ".supply-dashboard-shortcut-dock");
    const shortcutCard = extractRuleBody(dashboardCss, ".supply-dashboard-shortcut-card");
    const shortcutTitle = extractRuleBody(dashboardCss, ".supply-dashboard-shortcut-copy strong");

    expect(questHotspot).toMatch(/max-height:\s*100%/);
    expect(dashboardCss).toMatch(/\.supply-dashboard-quest-list\s*{[\s\S]*place-items:\s*center/);
    expect(rawCss).toMatch(/\.supply-task-card\s*{[\s\S]*aspect-ratio:\s*3\s*\/\s*4/);
    expect(questCardOne).toMatch(/top:\s*auto/);
    expect(questCardOne).toMatch(/left:\s*auto/);
    expect(questCardOne).toMatch(/width:\s*auto/);
    expect(questCardOne).toMatch(/height:\s*auto/);
    expect(shortcutDock).toMatch(/margin:\s*0/);
    expect(shortcutDock).toMatch(/aspect-ratio:\s*auto/);
    expect(shortcutCard).toMatch(/display:\s*grid/);
    expect(shortcutCard).toMatch(/border:\s*4px solid #111827/);
    expect(shortcutCard).not.toMatch(/background:\s*transparent/);
    expect(shortcutTitle).toMatch(/border:\s*0/);
    expect(shortcutTitle).toMatch(/background:\s*transparent/);
    expect(dashboardCss).toMatch(/\.supply-dashboard-shortcut-card--task-record\s*{[\s\S]*left:\s*66\.73%/);
  });

  it("includes static-stage responsive and reduced-motion coverage", () => {
    const css = normalizeCss(readFileSync("app/globals.css", "utf8"));
    const wideBlocks = extractBlocks(css, "@media (max-width: 1320px)");
    const tabletBlocks = extractBlocks(css, "@media (max-width: 960px)");
    const mobileBlocks = extractBlocks(css, "@media (max-width: 768px)");
    const reducedMotionCss = extractBlocks(css, "@media (prefers-reduced-motion: reduce)").join("\n");
    const wideContent = extractNestedRuleBody(wideBlocks, ".supply-dashboard-content");
    const tabletContent = extractNestedRuleBody(tabletBlocks, ".supply-dashboard-content");
    const mobileContent = extractNestedRuleBody(mobileBlocks, ".supply-dashboard-content");
    const mobilePanels = extractNestedRuleBody(mobileBlocks, ".supply-dashboard-status-panel");

    expect(wideContent).toMatch(/min-width:\s*1180px/);
    expect(tabletContent).toMatch(/min-width:\s*1040px/);
    expect(mobileContent).toMatch(/min-width:\s*960px/);
    expect(mobilePanels).toMatch(/box-shadow/);
    expect(reducedMotionCss).toContain(".supply-dashboard-scene *");
    expect(reducedMotionCss).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
  });
});
