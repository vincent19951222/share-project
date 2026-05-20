import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

describe("supply draw pool scene CSS", () => {
  it("styles the guarantee and local result panels instead of long-term pity", () => {
    expect(css).toContain(".supply-draw-pool-guarantee");
    expect(css).toContain(".supply-draw-pool-result");
    expect(css).toContain(".supply-draw-pool-ticket-shortage");
    expect(css).toContain(".supply-draw-pool-action:disabled");
    expect(css).not.toContain(".supply-draw-pool-pity");
  });
});
