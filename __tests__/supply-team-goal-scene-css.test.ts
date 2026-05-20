import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

function expectRule(selector: string) {
  expect(css).toContain(selector);
}

describe("supply team goal scene css", () => {
  it("defines scene, topbar, panels, road, task, and reward layers", () => {
    [
      ".supply-team-goal-scene",
      ".supply-team-goal-background",
      ".supply-team-goal-content",
      ".supply-ui-lab-topbar",
      ".supply-team-goal-raid-panel",
      ".supply-team-goal-road",
      ".supply-team-goal-milestone",
      ".supply-team-goal-lower-grid",
      ".supply-team-goal-task",
      ".supply-team-goal-reward",
      ".supply-team-goal-announcement",
    ].forEach(expectRule);

    expect(css).not.toContain(".supply-team-goal-panel-image");
    expect(css).not.toContain(".supply-team-goal-hotspot");
    expect(css).not.toMatch(/team-goal-(raid|road|tasks|rewards|announcement)-panel\.(png|webp|jpe?g)/);
  });

  it("keeps responsive and reduced-motion safeguards", () => {
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain(".supply-team-goal-road-track");
    expect(css).toContain(".supply-ui-lab-tabs");
    expect(css).toContain(".supply-ui-lab-statusbar");
    expect(css).not.toContain(".supply-team-goal-topbar .supply-dashboard-top-tabs");
    expect(css).not.toContain(".supply-team-goal-topbar .supply-dashboard-resource-list");
  });
});
