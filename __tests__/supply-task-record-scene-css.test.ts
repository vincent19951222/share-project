import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply task record scene css", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("defines isolated task-record scene and semantic component surfaces", () => {
    expect(css).toContain(".supply-task-record-scene");
    expect(css).toContain(".supply-task-record-content");
    expect(css).toContain(".supply-ui-lab-topbar");
    expect(css).toContain(".supply-task-record-shell");
    expect(css).not.toContain(".supply-task-record-panel-image");
    expect(css).not.toContain(".supply-task-record-topbar-hotspot--task-record");
    expect(css).not.toContain(".supply-task-record-sidebar-hotspot--today");
    expect(css).toContain(".supply-task-record-sidebar");
    expect(css).toContain(".supply-task-record-sidebar-card");
    expect(css).toContain(".supply-task-record-menu");
    expect(css).toContain(".supply-task-record-menu-icon");
    expect(css).toContain(".supply-task-record-menu-badge");
    expect(css).toContain(".supply-task-record-timeline-panel");
    expect(css).toContain(".supply-task-record-timeline-card");
    expect(css).not.toContain(".supply-task-record-aside");
    expect(css).not.toContain(".supply-task-record-radar-card");
    expect(css).not.toContain(".supply-task-record-redemptions-card");
    expect(css).not.toContain(".supply-task-record-view-all");
    expect(css).toContain(".supply-task-record-date-tabs");
    expect(css).toContain(".supply-task-record-empty");
    expect(css).toContain(".supply-task-record-draw-list");
    expect(css).toContain(".supply-task-record-draw");
    expect(css).toContain(".supply-task-record-reward-grid");
    expect(css).toContain(".supply-task-record-full-list");
    expect(css).toContain(".supply-task-record-rules-list");
    expect(css).toContain("width: 100vw");
  });

  it("includes responsive min-width scaling and reduced-motion safeguards", () => {
    expect(css).toContain("@media (max-width: 1320px)");
    expect(css).toContain("@media (max-width: 960px)");
    expect(css).toContain("@media (max-width: 768px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
