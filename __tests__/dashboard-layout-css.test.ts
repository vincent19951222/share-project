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

describe("dashboard layout CSS", () => {
  it("keeps heatmap legend and calendar tooltips inside visible dashboard space", () => {
    const css = readFileSync("app/globals.css", "utf8");

    const heatmapPanelRule = extractRuleBody(css, ".dashboard-heatmap-panel");
    const heatmapRule = extractRuleBody(css, ".dashboard-heatmap");
    const heatmapLegendRule = extractRuleBody(css, ".dashboard-heatmap-legend");
    const monthTableRule = extractRuleBody(css, ".dashboard-month-calendar .calendar-month-table");
    const monthGridRule = extractRuleBody(css, ".dashboard-month-calendar .calendar-month-grid");
    const tooltipBelowRule = extractRuleBody(
      css,
      ".dashboard-month-calendar .calendar-day-cell-tooltip-below .dashboard-day-tooltip",
    );
    const tooltipBelowArrowRule = extractRuleBody(
      css,
      ".dashboard-month-calendar .calendar-day-cell-tooltip-below .dashboard-day-tooltip-arrow",
    );

    expect(heatmapPanelRule).toMatch(/overflow:\s*visible/);
    expect(heatmapPanelRule).toMatch(/flex:\s*0 0 auto/);
    expect(heatmapPanelRule).toMatch(/min-height:\s*18\.75rem/);
    expect(heatmapRule).toMatch(/padding-bottom:\s*1\.35rem/);
    expect(heatmapLegendRule).toMatch(/min-height:\s*1\.5rem/);
    expect(heatmapLegendRule).toMatch(/padding-top:\s*0\.15rem/);
    expect(monthTableRule).toMatch(/overflow:\s*visible/);
    expect(monthGridRule).toMatch(/overflow:\s*visible/);
    expect(tooltipBelowRule).toMatch(/top:\s*calc\(100% \+ 0\.5rem\)/);
    expect(tooltipBelowRule).toMatch(/bottom:\s*auto/);
    expect(tooltipBelowArrowRule).toMatch(/top:\s*-0\.5rem/);
    expect(tooltipBelowArrowRule).toMatch(/bottom:\s*auto/);
  });
});
