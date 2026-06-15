import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("fitness ticket runtime assets", () => {
  const projectRoot = process.cwd();
  const globalsCss = readFileSync(join(projectRoot, "app/globals.css"), "utf8");
  const muscleMapSource = readFileSync(
    join(projectRoot, "components/ui/FitnessMuscleMap.tsx"),
    "utf8",
  );

  it("ships the CSS classes used by the fitness ticket modal", () => {
    expect(globalsCss).toContain(".fitness-ticket-modal-layer");
    expect(globalsCss).toContain(".fitness-ticket-frame");
    expect(globalsCss).toContain(".fitness-ticket-option-active");
    expect(globalsCss).toContain(".fitness-ticket-muscle-map");
    expect(globalsCss).toContain(".fitness-ticket-muscle-image");
    expect(globalsCss).toContain(".fitness-ticket-footer-editing");
    expect(globalsCss).toContain(".fitness-ticket-confirm");
  });

  it("uses the original png illustration for the muscle map", () => {
    expect(muscleMapSource).toContain("muscle-map.png");
    expect(muscleMapSource).not.toContain("data-muscle-part");
    expect(muscleMapSource).not.toContain("<svg");
    expect(
      existsSync(join(projectRoot, "public/assets/ui-prototypes/fitness-punch-ticket/generated/muscle-map.png")),
    ).toBe(true);
  });

  it("ships generated png icons for every visible strength part", () => {
    for (const part of ["chest", "back", "shoulder", "arms", "abs", "legs"]) {
      expect(
        existsSync(
          join(projectRoot, `public/assets/ui-prototypes/fitness-punch-ticket/generated/part-icons/${part}.png`),
        ),
      ).toBe(true);
    }
  });

});
