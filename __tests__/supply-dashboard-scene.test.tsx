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
    expect(container.querySelector(".supply-dashboard-stage")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-topbar")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-tabs")).not.toBeNull();
    const tabs = Array.from(container.querySelectorAll(".supply-ui-lab-topbar-tab")).map((tab) =>
      tab.textContent?.trim(),
    );

    expect(tabs).toEqual(["⌂我的状态", "◎团队目标", "▤补给商店", "▣任务记录"]);
    expect(container.textContent).not.toContain("排行榜");
    expect(container.querySelector('a[href="#"]')).toBeNull();
    expect(
      container.querySelector(".supply-ui-lab-tabs a[aria-selected='true']")?.textContent,
    ).toContain("我的状态");
    expect(
      container
        .querySelector(".supply-ui-lab-tabs a[href='/ui-lab/supply-dashboard/team-goal']")
        ?.textContent,
    ).toContain("团队目标");
    expect(container.querySelector(".supply-ui-lab-user-menu")).not.toBeNull();
    expect(container.querySelector(".supply-ui-lab-resource--coins")?.textContent).toContain("银子");
    expect(container.querySelector(".supply-ui-lab-resource--ticket")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".supply-ui-lab-resource--backpack")?.textContent).toContain("18/60");
    expect(container.querySelector(".supply-dashboard-status-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-status-panel.supply-ui-lab-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-title-card")).not.toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-effect-card")).toHaveLength(2);
    expect(container.textContent).toContain("牛马等级");
    expect(container.textContent).toContain("今日待生效");
    expect(container.textContent).toContain("今日已生效");
    expect(container.textContent).toContain("今日 23:59");
    expect(container.textContent).not.toContain("补给券");
    expect(container.textContent).not.toContain("生命票");
    expect(container.textContent).not.toContain("体力");
    expect(container.textContent).not.toContain("帮助中心");
    expect(container.textContent).not.toContain("意见反馈");
    expect(container.textContent).not.toContain("设置");
    expect(container.querySelector('a[href="#help"]')).toBeNull();
    expect(container.querySelector('a[href="#feedback"]')).toBeNull();
    expect(container.querySelector(".supply-dashboard-streak-card")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-stage")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-image")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-status")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-hero-progress [role='progressbar']")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-panel")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-panel.supply-ui-lab-panel")).not.toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-quest-card")).toHaveLength(4);
    expect(container.querySelector(".supply-dashboard-quest-progress")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-footer")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-quest-footer .supply-ui-lab-action")).not.toBeNull();
    expect(container.querySelector(".supply-dashboard-shortcut-dock")).not.toBeNull();
    expect(container.querySelectorAll(".supply-dashboard-shortcut-card")).toHaveLength(4);
    expect(container.querySelector(".supply-dashboard-panel-image")).toBeNull();
    expect(container.textContent).toContain("牛马补给站");
    expect(container.textContent).toContain("我的状态");
    expect(container.textContent).toContain("补给商店");
    expect(container.textContent).toContain("角色状态");
    expect(container.textContent).toContain("今日主线");
    expect(container.textContent).toContain("任务记录");
  });

  it("uses atomic art assets plus the shared topbar logo", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    const imageSources = Array.from(container.querySelectorAll("img")).map((image) => image.getAttribute("src"));

    expect(imageSources).toEqual(
      expect.arrayContaining([
        supplyDashboardAssetPaths.background,
        supplyDashboardAssetPaths.hero,
        supplyDashboardAssetPaths.dockBackpack,
        supplyDashboardAssetPaths.dockSupplyMachine,
        supplyDashboardAssetPaths.dockTaskRecord,
        supplyDashboardAssetPaths.taskCards.hydration,
        supplyDashboardAssetPaths.taskCards.movement,
        supplyDashboardAssetPaths.taskCards.social,
        supplyDashboardAssetPaths.taskCards.learning,
        "/assets/home-scenes/supply/shared/supply-topbar-cow-logo.png",
      ]),
    );
    expect(imageSources.join("\n")).not.toMatch(/dashboard-(status|hero|quests|shortcut|announcement)-panel/);
  });

  it("shows local mock feedback for reroll and reward claim actions", async () => {
    await act(async () => {
      root.render(<SupplyDashboardScene data={supplyDashboardMock} />);
    });

    const feedback = container.querySelector("[data-dashboard-feedback]");
    expect(feedback?.textContent).toContain("本地预览");

    const rerollButton = container.querySelector<HTMLButtonElement>(".supply-dashboard-quest-reroll");
    expect(rerollButton).not.toBeNull();

    await act(async () => {
      rerollButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-dashboard-feedback]")?.textContent).toContain("已触发换班预览");

    const claimButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("领取奖励"),
    );
    expect(claimButton).toBeDefined();

    await act(async () => {
      claimButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.querySelector("[data-dashboard-feedback]")?.textContent).toContain("奖励领取预览");
  });
});
