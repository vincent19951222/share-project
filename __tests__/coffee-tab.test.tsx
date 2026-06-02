import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const dispatch = vi.fn();
const routerPush = vi.fn();
const routerPrefetch = vi.fn();

const boardState: BoardState = {
  members: [{ id: "u1", name: "li", avatarKey: "male1" }],
  gridData: [[false]],
  teamVaultTotal: 0,
  currentUser: {
    assetBalance: 0,
    currentStreak: 0,
    nextReward: 10,
    seasonIncome: 0,
    isAdmin: false,
  },
  activeSeason: null,
  today: 1,
  totalDays: 1,
  currentUserId: "u1",
  logs: [],
  activeTab: "punch",
};

vi.mock("@/lib/store", () => ({
  useBoard: () => ({ state: boardState, dispatch }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush, prefetch: routerPrefetch }),
}));

describe("coffee tab navigation", () => {
  let container: HTMLDivElement;
  let root: Root;
  const setViewportWidth = (width: number) => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: width,
    });
  };

  beforeEach(() => {
    dispatch.mockClear();
    routerPush.mockClear();
    routerPrefetch.mockClear();
    setViewportWidth(1280);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("navigates to the water shop without dispatching a duplicate tab state update", async () => {
    const { Navbar } = await import("@/components/navbar/Navbar");

    await act(async () => {
      root.render(<Navbar />);
    });

    const drinkButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("牛马水铺"),
    );

    expect(drinkButton).toBeDefined();
    expect(
      drinkButton!.querySelector('img[src*="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_coffee_pixel.svg"]'),
    ).not.toBeNull();

    await act(async () => {
      drinkButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith("/drink");
  });

  it("navigates to supply station without dispatching a duplicate tab state update", async () => {
    const { Navbar } = await import("@/components/navbar/Navbar");

    await act(async () => {
      root.render(<Navbar />);
    });

    const supplyButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("牛马补给站"),
    );

    expect(supplyButton).toBeDefined();
    expect(
      supplyButton!.querySelector('img[src*="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_supply_pixel.svg"]'),
    ).not.toBeNull();

    await act(async () => {
      supplyButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith("/dashboard/status");
  });

  it("prefetches the primary tab routes after the navbar mounts", async () => {
    const { Navbar } = await import("@/components/navbar/Navbar");

    await act(async () => {
      root.render(<Navbar />);
    });

    expect(routerPrefetch.mock.calls.map(([route]) => route)).toEqual([
      "/",
      "/board",
      "/drink",
      "/calendar",
      "/report",
      "/dashboard/status",
    ]);
  });

  it("uses managed pixel SVG assets for the primary navigation tabs", async () => {
    const { Navbar } = await import("@/components/navbar/Navbar");

    await act(async () => {
      root.render(<Navbar />);
    });

    const desktopTabs = Array.from(container.querySelectorAll(".calendar-tab-strip .tab-btn"));
    const tabLabels = desktopTabs.map((button) => button.textContent?.trim());
    const tabIconSources = Array.from(container.querySelectorAll(".calendar-tab-strip .tab-btn img")).map((image) =>
      image.getAttribute("src"),
    );

    expect(tabLabels).toEqual([
      "健身打卡",
      "共享看板",
      "牛马水铺",
      "牛马日历",
      "战报中心",
      "牛马补给站",
    ]);
    expect(tabIconSources).toEqual([
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_workout_pixel.svg",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_board_pixel.svg",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_coffee_pixel.svg",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_calendar_pixel.svg",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_report_pixel.svg",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_icons_supply_pixel.svg",
    ]);
  });

  it("keeps mobile navigation collapsed until the toggle is opened", async () => {
    setViewportWidth(390);
    const { Navbar } = await import("@/components/navbar/Navbar");

    await act(async () => {
      root.render(<Navbar />);
    });

    const toggleButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.getAttribute("aria-label") === "展开导航",
    );

    expect(toggleButton).toBeDefined();
    expect(toggleButton?.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".mobile-tab-panel")).toBeNull();

    await act(async () => {
      toggleButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(toggleButton?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector(".mobile-tab-panel")).not.toBeNull();

    const drinkButton = Array.from(container.querySelectorAll(".mobile-tab-panel button")).find(
      (button) => button.textContent?.includes("牛马水铺"),
    );
    expect(drinkButton).toBeDefined();

    await act(async () => {
      drinkButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(routerPush).toHaveBeenCalledWith("/drink");
    expect(container.querySelector(".mobile-tab-panel")).toBeNull();
  });

  it("uses the managed vault safe asset in the team header", async () => {
    const { TeamHeader } = await import("@/components/punch-board/TeamHeader");

    await act(async () => {
      root.render(<TeamHeader />);
    });

    expect(
      container.querySelector('img[src*="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_punch_vault_safe.webp"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("全队个人银子总和");
    expect(container.textContent).toContain("个人长期累计资产");
  });
});
