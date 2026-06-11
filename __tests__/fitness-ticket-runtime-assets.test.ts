import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("fitness ticket runtime assets", () => {
  const projectRoot = process.cwd();
  const globalsCss = readFileSync(join(projectRoot, "app/globals.css"), "utf8");

  it("ships the CSS classes used by the fitness ticket modal", () => {
    expect(globalsCss).toContain(".fitness-ticket-modal-layer");
    expect(globalsCss).toContain(".fitness-ticket-frame");
    expect(globalsCss).toContain(".fitness-ticket-option-active");
    expect(globalsCss).toContain(".fitness-ticket-muscle-map");
    expect(globalsCss).toContain(".fitness-ticket-confirm");
  });

  it("ships the muscle map image referenced by FitnessPunchTicket", () => {
    expect(
      existsSync(
        join(
          projectRoot,
          "public/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.png",
        ),
      ),
    ).toBe(true);
  });
});
