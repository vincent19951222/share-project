import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

function cssBlock(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector} \\{([\\s\\S]*?)\\n\\}`, "m"));

  expect(match).not.toBeNull();

  return match?.[1] ?? "";
}

describe("supply draw pool scene CSS", () => {
  it("styles the guarantee and modal draw results instead of long-term pity", () => {
    expect(css).toContain(".supply-draw-pool-guarantee");
    expect(css).toContain(".supply-draw-pool-result-backdrop");
    expect(css).toContain(".supply-draw-pool-result-modal");
    expect(css).toContain(".supply-draw-pool-result-actions");
    expect(css).toContain(".supply-draw-pool-ticket-shortage");
    expect(css).toContain(".supply-draw-pool-action:disabled");
    expect(css).toContain('.supply-draw-pool-machine-controls[data-control-style="arcade"]');
    expect(css).toContain('.supply-draw-pool-action[data-priority="primary"]');
    expect(css).toContain('.supply-draw-pool-result-reveal[data-result-reveal="rarity"]');
    expect(css).toContain('.supply-draw-pool-drop[data-rarity="SSR"]');
    expect(css).not.toContain(".supply-draw-pool-pity");
  });

  it("keeps draw-pool side panels compact and visually grouped", () => {
    expect(cssBlock(".supply-draw-pool-left-rail")).toContain(
      "grid-template-rows: auto auto minmax(11.4rem, 1fr)",
    );

    const guidePanel = cssBlock(".supply-draw-pool-guide");

    expect(guidePanel).toContain("grid-template-rows: auto");
    expect(guidePanel).toContain("align-items: center");
    expect(guidePanel).toContain("align-content: start");
  });

  it("renders probability rows as one preview module instead of detached cards", () => {
    const ratesList = cssBlock(".supply-draw-pool-rates ol");
    const rateRow = cssBlock(".supply-draw-pool-rate");

    expect(ratesList).toContain("gap: 0");
    expect(ratesList).toContain("border: 2px solid rgba(250, 204, 21, 0.42)");
    expect(ratesList).toContain("background:");
    expect(rateRow).toContain("border: 0");
    expect(rateRow).toContain("border-bottom: 1px solid rgba(248, 250, 252, 0.14)");
    expect(css).toContain(".supply-draw-pool-rate:last-child");
  });

  it("makes reward rarity badges readable on recent drop cards", () => {
    const dropBadge = cssBlock(".supply-draw-pool-drop > .supply-ui-lab-status");

    expect(dropBadge).toContain("min-width: 1.62rem");
    expect(dropBadge).toContain("min-height: 1.42rem");
    expect(dropBadge).toContain("border-radius: 0.28rem");
    expect(dropBadge).toContain("background: #fffef8");
    expect(dropBadge).toContain("font-size: 0.74rem");
    expect(dropBadge).toContain("line-height: 1");
  });
});
