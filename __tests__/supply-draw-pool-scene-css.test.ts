import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

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
});
