import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

function stripMediaBlocks(css: string) {
  let output = "";
  let cursor = 0;

  while (cursor < css.length) {
    if (css.startsWith("@media", cursor)) {
      const blockStart = css.indexOf("{", cursor);
      expect(blockStart).toBeGreaterThan(cursor);

      let depth = 1;
      cursor = blockStart + 1;

      while (depth > 0 && cursor < css.length) {
        const char = css[cursor];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        cursor += 1;
      }

      expect(depth).toBe(0);
      continue;
    }

    output += css[cursor];
    cursor += 1;
  }

  return output;
}

function extractRuleBody(css: string, selector: string) {
  const normalizedCss = stripMediaBlocks(css.replace(/\/\*[\s\S]*?\*\//g, ""));
  const matchingBodies: string[] = [];
  let blockStart = normalizedCss.indexOf("{");

  while (blockStart >= 0) {
    const previousClose = normalizedCss.lastIndexOf("}", blockStart);
    const previousOpen = normalizedCss.lastIndexOf("{", blockStart - 1);
    const selectorStart = Math.max(previousClose, previousOpen) + 1;
    const selectorList = normalizedCss.slice(selectorStart, blockStart).trim();
    const selectors = selectorList.split(",").map((item) => item.trim());

    if (!selectorList.startsWith("@") && selectors.includes(selector)) {
      let depth = 1;
      let cursor = blockStart + 1;

      while (depth > 0 && cursor < normalizedCss.length) {
        const char = normalizedCss[cursor];
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
        cursor += 1;
      }

      expect(depth).toBe(0);
      matchingBodies.push(normalizedCss.slice(blockStart + 1, cursor - 1));
    }

    blockStart = normalizedCss.indexOf("{", blockStart + 1);
  }

  expect(matchingBodies.length).toBeGreaterThan(0);
  return matchingBodies.join("\n");
}

describe("home tab density contract", () => {
  it("keeps the coffee scene on the same one-screen stage model as punch board", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const coffeeGridSource = readFileSync("components/coffee-checkin/CoffeeGrid.tsx", "utf8");

    const sceneRule = extractRuleBody(css, ".coffee-scene");
    const contentRule = extractRuleBody(css, ".coffee-scene-content");
    const layoutRule = extractRuleBody(css, ".coffee-counter-layout");
    const receiptRule = extractRuleBody(css, ".coffee-receipt-ticket");
    const receiptBodyRule = extractRuleBody(css, ".coffee-receipt-body");
    const activityRule = extractRuleBody(css, ".coffee-activity-ticket");
    const activityListRule = extractRuleBody(css, ".coffee-activity-list");
    const statRule = extractRuleBody(css, ".coffee-stat-tile");
    const actionRule = extractRuleBody(css, ".coffee-cup-action");
    const calendarRule = extractRuleBody(css, ".coffee-calendar-paper");
    const headerRule = extractRuleBody(css, ".coffee-calendar-header");
    const dayRule = extractRuleBody(css, ".coffee-day-heading");
    const cellRule = extractRuleBody(css, ".coffee-calendar-cell");
    const gridBodyRule = extractRuleBody(css, ".coffee-grid-body");
    const rowRule = extractRuleBody(css, ".coffee-calendar-row");

    expect(sceneRule).toMatch(/height:\s*100%/);
    expect(sceneRule).toMatch(/overflow:\s*hidden/);
    expect(contentRule).toMatch(/height:\s*100%/);
    expect(contentRule).toMatch(/padding-inline:\s*clamp\(7\.5rem,\s*10vw,\s*12\.5rem\)/);
    expect(layoutRule).toMatch(/height:\s*100%/);
    expect(layoutRule).toMatch(/grid-template-columns:\s*minmax\(280px,\s*0\.82fr\)\s*minmax\(480px,\s*1\.6fr\)/);
    expect(receiptRule).toMatch(/height:\s*100%/);
    expect(receiptBodyRule).toMatch(/flex:\s*1/);
    expect(receiptBodyRule).toMatch(/grid-template-rows:\s*auto minmax\(0,\s*1fr\)/);
    expect(activityRule).toMatch(/min-height:\s*0/);
    expect(activityListRule).toMatch(/flex:\s*1/);
    expect(activityListRule).toMatch(/max-height:\s*none/);
    expect(statRule).toMatch(/min-height:\s*4\.6rem/);
    expect(actionRule).toMatch(/min-height:\s*2\.75rem/);
    expect(calendarRule).toMatch(/height:\s*100%/);
    expect(headerRule).toMatch(/min-height:\s*4rem/);
    expect(dayRule).toMatch(/width:\s*var\(--coffee-grid-cell-size\)/);
    expect(cellRule).toMatch(/width:\s*var\(--coffee-grid-cell-size\)/);
    expect(gridBodyRule).toMatch(/overflow-y:\s*auto/);
    expect(rowRule).toMatch(/height:\s*3rem/);
    expect(coffeeGridSource).toContain("coffee-grid-body");
    expect(coffeeGridSource).toContain("coffee-calendar-row");
  });

  it("keeps shared board composition inside the stage with an internally scrolling cork board", () => {
    const css = readFileSync("app/globals.css", "utf8");

    const sceneRule = extractRuleBody(css, ".shared-board-scene");
    const contentRule = extractRuleBody(css, ".shared-board-content");
    const wallSetRule = extractRuleBody(css, ".shared-board-wall-set");
    const corkRule = extractRuleBody(css, ".shared-board-cork");
    const composerRule = extractRuleBody(css, ".shared-board-composer");
    const composerGridRule = extractRuleBody(css, ".shared-board-composer-grid");
    const controlsRule = extractRuleBody(css, ".shared-board-controls-panel");
    const noteRule = extractRuleBody(css, ".note-card");

    expect(sceneRule).toMatch(/height:\s*100%/);
    expect(contentRule).toMatch(/height:\s*100%/);
    expect(contentRule).toMatch(/padding:\s*clamp\(2\.65rem,\s*4\.4vw,\s*3\.45rem\)\s*clamp\(7\.5rem,\s*10vw,\s*12\.5rem\)\s*clamp\(0\.9rem,\s*1\.6vw,\s*1\.35rem\)/);
    expect(wallSetRule).toMatch(/display:\s*flex/);
    expect(wallSetRule).toMatch(/height:\s*100%/);
    expect(corkRule).toMatch(/flex:\s*1/);
    expect(corkRule).toMatch(/min-height:\s*0/);
    expect(corkRule).toMatch(/overflow-y:\s*auto/);
    expect(corkRule).toMatch(/padding:\s*clamp\(1\.15rem,\s*1\.8vw,\s*1\.65rem\)/);
    expect(composerRule).toMatch(/padding:\s*1\.35rem 1\.2rem 1rem/);
    expect(composerGridRule).toMatch(/grid-template-columns:\s*3\.4rem minmax\(20rem,\s*1fr\) minmax\(18rem,\s*0\.72fr\)/);
    expect(controlsRule).toMatch(/min-height:\s*6\.25rem/);
    expect(noteRule).toMatch(/min-height:\s*10\.75rem/);
  });

  it("keeps the calendar binder inside the same one-screen stage model", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const calendarSource = readFileSync("components/calendar/CalendarBoard.tsx", "utf8");

    const viewportRule = extractRuleBody(css, ".calendar-board-viewport");
    const sceneRule = extractRuleBody(css, ".calendar-scene");
    const contentRule = extractRuleBody(css, ".calendar-scene-content");
    const binderRule = extractRuleBody(css, ".calendar-binder-shell");
    const paperRule = extractRuleBody(css, ".calendar-paper-surface");
    const gridSectionRule = extractRuleBody(css, ".calendar-grid-section");
    const tableRule = extractRuleBody(css, ".calendar-month-table");
    const monthGridRule = extractRuleBody(css, ".calendar-month-grid");
    const dayRule = extractRuleBody(css, ".calendar-day-cell");
    const summaryRule = extractRuleBody(css, ".calendar-summary-chip");

    expect(calendarSource).toContain('className="calendar-board-viewport absolute inset-0"');
    expect(viewportRule).toMatch(/height:\s*100%/);
    expect(viewportRule).toMatch(/overflow:\s*hidden/);
    expect(sceneRule).toMatch(/height:\s*100%/);
    expect(sceneRule).toMatch(/min-height:\s*100%/);
    expect(contentRule).toMatch(/height:\s*100%/);
    expect(contentRule).toMatch(/min-height:\s*0/);
    expect(contentRule).toMatch(/padding-inline:\s*clamp\(7\.5rem,\s*10vw,\s*12\.5rem\)/);
    expect(binderRule).toMatch(/height:\s*100%/);
    expect(binderRule).toMatch(/min-height:\s*0/);
    expect(paperRule).toMatch(/height:\s*100%/);
    expect(paperRule).toMatch(/min-height:\s*0/);
    expect(gridSectionRule).toMatch(/overflow:\s*hidden/);
    expect(tableRule).toMatch(/height:\s*100%/);
    expect(tableRule).toMatch(/display:\s*flex/);
    expect(monthGridRule).toMatch(/flex:\s*1/);
    expect(monthGridRule).toMatch(/overflow-y:\s*auto/);
    expect(dayRule).toMatch(/min-height:\s*clamp\(3\.75rem,\s*6\.2vh,\s*5\.6rem\)/);
    expect(summaryRule).toMatch(/min-height:\s*3\.45rem/);
  });
});
