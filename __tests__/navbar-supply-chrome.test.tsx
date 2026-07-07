import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar/Navbar";
import type { SupplyNavContext } from "@/lib/navigation-routes";
import type { AppTab } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routerPushMock = vi.fn();
const routerPrefetchMock = vi.fn();
const { preloadBoardTabComponentMock, preloadSupplyPanelComponentMock } = vi.hoisted(() => ({
  preloadBoardTabComponentMock: vi.fn(),
  preloadSupplyPanelComponentMock: vi.fn(),
}));

let activeTab: AppTab = "supply";

vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: {
      activeTab,
      currentUserId: "u1",
      currentUser: {
        assetBalance: 440,
        currentStreak: 12,
        nextReward: 10,
        seasonIncome: 120,
        isAdmin: false,
      },
      members: [{ id: "u1", name: "li", avatarKey: "male1" }],
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerPushMock,
    prefetch: routerPrefetchMock,
  }),
}));

vi.mock("@/components/board/tab-component-loaders", () => ({
  preloadBoardTabComponent: preloadBoardTabComponentMock,
  preloadSupplyPanelComponent: preloadSupplyPanelComponentMock,
}));

vi.mock("@/components/navbar/TeamDynamicsBell", () => ({
  TeamDynamicsBell: () => <button aria-label="团队动态，未读 4 条">铃铛</button>,
}));

vi.mock("@/components/profile/EditProfileModal", () => ({
  EditProfileModal: () => <div data-testid="edit-profile-modal" />,
}));

const supplyNavContext: SupplyNavContext = {
  resources: [
    { id: "coins", label: "银子", value: 440, iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_resource_coins.png" },
    { id: "ticket", label: "抽奖券", value: 7, iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_resource_ticket.png" },
    {
      id: "backpack",
      label: "背包",
      value: 12,
      maxValue: 60,
      iconImage: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_shared_supply_resource_backpack.png",
    },
  ],
  profile: { username: "li", avatarKey: "male1" },
  social: { pendingCount: 0, latestLabel: null },
};

const supplyNavContextWithSocial: SupplyNavContext = {
  ...supplyNavContext,
  social: {
    pendingCount: 2,
    latestLabel: "luo 邀请你喝水",
  },
};

describe("Navbar supply chrome", () => {
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
    routerPushMock.mockClear();
    routerPrefetchMock.mockClear();
    preloadBoardTabComponentMock.mockClear();
    preloadSupplyPanelComponentMock.mockClear();
    activeTab = "supply";
    vi.useRealTimers();
  });

  it("keeps the drink tab second in desktop and mobile primary navigation", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    const expectedOrder = ["健身打卡", "牛马水铺", "共享看板", "数据看板", "牛马补给站"];
    expect(
      Array.from(container.querySelectorAll(".home-tab-strip .tab-btn")).map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(expectedOrder);
    expect(container.textContent).not.toContain("牛马日历");
    expect(container.textContent).not.toContain("战报中心");

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".mobile-nav-toggle")?.click();
    });

    expect(
      Array.from(container.querySelectorAll(".mobile-tab-panel .tab-btn")).map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(expectedOrder);
  });

  it("renders the supply secondary tabs when the supply primary tab is active", async () => {
    await act(async () => {
      root.render(<Navbar activeSupplyPanel="dashboard" activeTabOverride="supply" supplyNavContext={supplyNavContext} />);
    });

    expect(container.querySelector(".app-supply-secondary-nav")).not.toBeNull();
    expect(container.querySelector(".app-top-nav--with-supply-menu")).not.toBeNull();
    expect(container.querySelector(".app-top-nav--supply")).not.toBeNull();
    expect(container.querySelector(".app-supply-primary-tab")).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll(".app-supply-secondary-tab")).map((tab) => tab.textContent?.trim()),
    ).toEqual(["我的状态", "补给商店", "任务记录", "背包", "抽奖池"]);
    expect(
      Array.from(container.querySelectorAll<HTMLImageElement>(".app-supply-secondary-tab img")).map((image) =>
        image.getAttribute("src"),
      ),
    ).toEqual([
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_status.png",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_shop.png",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_task_record.png",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_backpack.png",
      "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_assets_home_scenes_supply_nav_icons_supply_nav_draw_pool.png",
    ]);
    Array.from(container.querySelectorAll<HTMLImageElement>(".app-supply-secondary-tab img")).forEach((image) => {
      const src = image.getAttribute("src");
      expect(src).toBeTruthy();
      expect(src).toContain("share_project_public_assets_home_scenes_supply_nav_icons_");
    });
    expect(container.querySelector(".app-supply-secondary-tab[aria-current='page']")?.textContent).toContain("我的状态");
  });

  it("pushes formal dashboard routes from secondary tabs", async () => {
    await act(async () => {
      root.render(<Navbar activeSupplyPanel="dashboard" activeTabOverride="supply" supplyNavContext={supplyNavContext} />);
    });

    const backpackTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".app-supply-secondary-tab")).find(
      (button) => button.textContent?.includes("背包"),
    );

    await act(async () => {
      backpackTab?.click();
    });

    expect(routerPushMock).toHaveBeenCalledWith("/dashboard/backpack");
  });

  it("renders supply resources in the right context slot", async () => {
    await act(async () => {
      root.render(<Navbar activeSupplyPanel="dashboard" activeTabOverride="supply" supplyNavContext={supplyNavContext} />);
    });

    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("银子");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("440");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("抽奖券");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("7");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("背包");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("12/60");
    expect(container.querySelector('img[src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male1.png"]')).not.toBeNull();
  });

  it("surfaces social invitation pending count in supply navigation", async () => {
    activeTab = "data";

    await act(async () => {
      root.render(<Navbar activeTabOverride="data" supplyNavContext={supplyNavContextWithSocial} />);
    });

    expect(container.querySelector(".app-supply-social-badge")?.textContent).toBe("2");
    expect(container.querySelector(".app-supply-primary-tab")?.getAttribute("aria-label")).toContain(
      "2 个队友邀请待响应",
    );
    expect(
      Array.from(container.querySelectorAll(".app-supply-secondary-tab")).find((tab) =>
        tab.textContent?.includes("任务记录"),
      )?.textContent,
    ).toContain("2");
    expect(container.querySelector(".app-supply-mobile-wallet")?.getAttribute("aria-label")).toContain(
      "luo 邀请你喝水",
    );
  });

  it("keeps supply assets and the hoverable supply secondary tabs available on regular primary tabs", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    expect(container.querySelector(".app-top-nav--with-supply-menu")).not.toBeNull();
    expect(container.querySelector(".app-top-nav--supply")).toBeNull();
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("440");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("7");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("12/60");
    expect(container.querySelector(".app-supply-secondary-nav")).not.toBeNull();
    expect(container.querySelector(".app-supply-secondary-tab[aria-current='page']")?.textContent).toContain("我的状态");
  });

  it("keeps a stable asset placeholder before supply resources load", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={null} />);
    });

    expect(container.querySelector(".app-supply-assets")).not.toBeNull();
    expect(container.querySelector(".app-supply-assets--loading")).not.toBeNull();
    expect(container.querySelectorAll(".app-supply-asset-skeleton")).toHaveLength(3);
  });

  it("renders a compact mobile wallet while preserving desktop supply asset chips", async () => {
    activeTab = "data";

    await act(async () => {
      root.render(<Navbar activeTabOverride="data" supplyNavContext={supplyNavContext} />);
    });

    const wallet = container.querySelector<HTMLButtonElement>(".app-supply-mobile-wallet");
    const navShell = container.querySelector(".app-top-nav > div:first-child");
    expect(wallet).not.toBeNull();
    expect(wallet?.parentElement).toBe(navShell);
    expect(container.querySelector(".app-top-nav-actions")).not.toBeNull();
    expect(container.querySelector(".mobile-tab-panel")).toBeNull();
    expect(wallet?.getAttribute("aria-label")).toBe("补给站资产：银子 440，抽奖券 7，背包 12/60");
    expect(wallet?.textContent).toContain("440");
    expect(wallet?.textContent).toContain("7");
    expect(wallet?.textContent).toContain("12/60");

    expect(container.querySelectorAll(".app-supply-asset-chip")).toHaveLength(3);
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("银子");
  });

  it("uses a centered drawn icon for the mobile nav toggle in both states", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    const toggle = container.querySelector<HTMLButtonElement>(".mobile-nav-toggle");
    expect(toggle).not.toBeNull();
    expect(toggle?.querySelector(".mobile-nav-toggle-icon")).not.toBeNull();
    expect(toggle?.textContent).not.toContain("≡");
    expect(toggle?.getAttribute("data-state")).toBe("closed");

    await act(async () => {
      toggle?.click();
    });

    expect(toggle?.getAttribute("data-state")).toBe("open");
    expect(toggle?.querySelector(".mobile-nav-toggle-icon")).not.toBeNull();
    expect(toggle?.textContent).not.toContain("×");
  });

  it("keeps the secondary supply tabs reachable while moving from the primary tab to the flyout", async () => {
    vi.useFakeTimers();
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    const topNav = container.querySelector(".app-top-nav");
    const primarySupplyTab = container.querySelector(".app-supply-primary-tab");
    const secondaryNav = container.querySelector(".app-supply-secondary-nav");
    const backpackTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".app-supply-secondary-tab")).find(
      (button) => button.textContent?.includes("背包"),
    );

    expect(topNav).not.toBeNull();
    expect(primarySupplyTab).not.toBeNull();
    expect(secondaryNav).not.toBeNull();
    expect(backpackTab).not.toBeUndefined();

    await act(async () => {
      primarySupplyTab?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    expect(topNav?.classList.contains("app-supply-menu-open")).toBe(true);

    await act(async () => {
      primarySupplyTab?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      vi.advanceTimersByTime(120);
    });

    expect(topNav?.classList.contains("app-supply-menu-open")).toBe(true);

    await act(async () => {
      secondaryNav?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      vi.advanceTimersByTime(300);
    });

    expect(topNav?.classList.contains("app-supply-menu-open")).toBe(true);

    await act(async () => {
      backpackTab?.click();
    });

    expect(routerPushMock).toHaveBeenCalledWith("/dashboard/backpack");
  });

  it("marks a primary tab as pending immediately after click and clears when it becomes active", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    const boardTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("共享看板"),
    );

    await act(async () => {
      boardTab?.click();
    });

    expect(routerPushMock).toHaveBeenCalledWith("/board");
    expect(boardTab?.classList.contains("pending")).toBe(true);
    expect(boardTab?.getAttribute("aria-busy")).toBe("true");

    activeTab = "board";

    await act(async () => {
      root.render(<Navbar activeTabOverride="board" supplyNavContext={supplyNavContext} />);
    });

    const activeBoardTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("共享看板"),
    );

    expect(activeBoardTab?.classList.contains("pending")).toBe(false);
    expect(activeBoardTab?.getAttribute("aria-busy")).toBeNull();
  });

  it("does not mark the current primary tab as pending", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    const punchTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("健身打卡"),
    );

    await act(async () => {
      punchTab?.click();
    });

    expect(routerPushMock).not.toHaveBeenCalled();
    expect(punchTab?.classList.contains("pending")).toBe(false);
  });

  it("prefetches primary and supply secondary routes on hover or focus", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    routerPrefetchMock.mockClear();

    const dataTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("数据看板"),
    );
    const drawPoolTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".app-supply-secondary-tab")).find(
      (button) => button.textContent?.includes("抽奖池"),
    );

    await act(async () => {
      dataTab?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      drawPoolTab?.focus();
    });

    expect(routerPrefetchMock).toHaveBeenCalledWith("/calendar");
    expect(routerPrefetchMock).toHaveBeenCalledWith("/dashboard/cards");
    expect(preloadBoardTabComponentMock).toHaveBeenCalledWith("data");
    expect(preloadSupplyPanelComponentMock).toHaveBeenCalledWith("drawPool");
  });
});
