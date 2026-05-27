import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("supply backpack scene css", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("defines backpack scene layers and empty inventory states", () => {
    expect(css).toContain(".supply-backpack-scene");
    expect(css).toContain(".supply-backpack-shell");
    expect(css).toContain(".supply-ui-lab-topbar--breadcrumb");
    expect(css).toContain(".supply-backpack-sidebar-card");
    expect(css).toContain(".supply-backpack-grid");
    expect(css).toContain(".supply-backpack-detail");
    expect(css).toContain('.supply-backpack-detail-card[data-inspection="item-card"]');
    expect(css).toContain('.supply-backpack-slot[data-selected-visual="focus"]');
    expect(css).toContain(".supply-backpack-detail-result-preview");
    expect(css).toContain('.supply-backpack-use-button[data-action-state="unavailable"]');
    expect(css).toContain(".supply-backpack-hint");
    expect(css).toContain(".supply-backpack-slot.is-selected");
    expect(css).toContain(".supply-backpack-slot.is-empty");
    expect(css).toContain(".supply-backpack-action-feedback");
    expect(css).not.toContain(".supply-backpack-slot.is-locked");
  });

  it("keeps css scoped and includes responsive and reduced-motion rules", () => {
    const backpackBlock = css.slice(css.indexOf(".supply-backpack-scene"));

    expect(backpackBlock).toContain("grid-template-columns");
    expect(backpackBlock).not.toContain("supply-backpack-expand-control");
    expect(backpackBlock).not.toContain("supply-backpack-info-control");
    expect(backpackBlock).not.toContain("is-locked");
    expect(backpackBlock).toContain("@media (max-width: 900px)");
    expect(backpackBlock).toContain("@media (max-width: 520px)");
    expect(backpackBlock).toContain("@media (prefers-reduced-motion: reduce)");
    expect(backpackBlock).not.toContain("design/ui-assets/背包.png");
    expect(backpackBlock).not.toContain(".supply-backpack-panel-image");
    expect(backpackBlock).not.toContain(".supply-backpack-header");
    expect(backpackBlock).not.toContain(".supply-backpack-main-layout");
    expect(backpackBlock).not.toContain(".supply-backpack-resource-strip");
    expect(backpackBlock).not.toContain("supply-backpack-expand-hotspot");
    expect(backpackBlock).not.toContain("supply-backpack-sidebar-hotspot");
    expect(backpackBlock).not.toContain("supply-backpack-effects-info-hotspot");
  });
});
