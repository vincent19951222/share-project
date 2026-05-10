import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SupplyDashboardScene } from "@/components/gamification/ui-lab/supply-dashboard/SupplyDashboardScene";
import { supplyDashboardAssetPaths, supplyDashboardMock } from "@/components/gamification/ui-lab/supply-dashboard/mock-data";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("supply dashboard static scene", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("renders the isolated layered Dashboard scene from static mock data", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    expect(container.querySelector(".supply-dashboard-scene")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-background")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-content")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-status-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-stage")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-panel")).not.toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-quest-card")).toHaveLength(4);
    expect(container.querySelector(".supply-dashboard-shortcut-dock")).not.toBeNull();
    expect(container.textContent).toContain("牛马补给站");
    expect(container.textContent).toContain("角色状态");
    expect(container.textContent).toContain("今日主线");
    expect(container.textContent).toContain("任务记录");
  });

  it("uses final media assets plus existing raw task-card images", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources).toEqual(
      expect.arrayContaining([
        supplyDashboardAssetPaths.hero,
        supplyDashboardAssetPaths.dockBackpack,
        supplyDashboardAssetPaths.dockSupplyMachine,
        supplyDashboardAssetPaths.dockTaskRecord,
        supplyDashboardAssetPaths.taskCards.hydration,
        supplyDashboardAssetPaths.taskCards.movement,
        supplyDashboardAssetPaths.taskCards.social,
        supplyDashboardAssetPaths.taskCards.learning,
      ]),
    );
  });
});
