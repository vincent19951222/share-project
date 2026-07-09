import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar/Navbar";
import type { SupplyNavContext } from "@/lib/navigation-routes";
import type { AppTab } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routerPushMock = vi.fn();
const routerPrefetchMock = vi.fn();
const { preloadBoardTabComponentMock } = vi.hoisted(() => ({
  preloadBoardTabComponentMock: vi.fn(),
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
    activeTab = "supply";
    vi.useRealTimers();
  });

  it("keeps the drink tab second in desktop and mobile primary navigation", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    const expectedOrder = ["健身打卡", "牛马水铺", "共享看板", "数据看板"];
    expect(
      Array.from(container.querySelectorAll(".home-tab-strip .tab-btn")).map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(expectedOrder);
    expect(container.textContent).not.toContain("牛马日历");
    expect(container.textContent).not.toContain("战报中心");
    expect(container.querySelector(".app-supply-primary-tab")).toBeNull();

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".mobile-nav-toggle")?.click();
    });

    expect(
      Array.from(container.querySelectorAll(".mobile-tab-panel .tab-btn")).map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(expectedOrder);
  });

  it("does not render the redundant supply secondary tabs when the supply primary tab is active", async () => {
    await act(async () => {
      root.render(<Navbar activeSupplyPanel="studio" activeTabOverride="supply" supplyNavContext={supplyNavContext} />);
    });

    expect(container.querySelector(".app-top-nav--supply")).not.toBeNull();
    expect(container.querySelector(".app-supply-primary-tab")).toBeNull();
    expect(container.querySelector(".app-top-nav--with-supply-menu")).toBeNull();
    expect(container.querySelector(".app-supply-secondary-nav")).toBeNull();
    expect(container.querySelectorAll(".app-supply-secondary-tab")).toHaveLength(0);
    expect(container.textContent).not.toContain("主题扭蛋");
    expect(container.textContent).not.toContain("作品库");
    expect(container.textContent).not.toContain("旧补给归档");
  });

  it("keeps the experimental supply entry out of primary navigation", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    expect(container.querySelector(".app-supply-primary-tab")).toBeNull();
    expect(container.querySelector(".home-tab-strip")?.textContent).not.toContain("牛马补给站");
    expect(routerPushMock).not.toHaveBeenCalledWith("/dashboard/status");
  });

  it("renders supply resources in the right context slot", async () => {
    await act(async () => {
      root.render(<Navbar activeSupplyPanel="studio" activeTabOverride="supply" supplyNavContext={supplyNavContext} />);
    });

    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("银子");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("440");
    expect(container.querySelector(".app-supply-assets")?.textContent).not.toContain("抽奖券");
    expect(container.querySelector(".app-supply-assets")?.textContent).not.toContain("背包");
    expect(container.querySelector('img[src="https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male1.png"]')).not.toBeNull();
  });

  it("keeps social invitation context on the compact supply wallet", async () => {
    activeTab = "data";

    await act(async () => {
      root.render(<Navbar activeTabOverride="data" supplyNavContext={supplyNavContextWithSocial} />);
    });

    expect(container.querySelector(".app-supply-primary-tab")).toBeNull();
    expect(container.querySelector(".app-supply-mobile-wallet")?.getAttribute("aria-label")).toContain(
      "luo 邀请你喝水",
    );
  });

  it("keeps supply assets available on regular primary tabs without rendering the redundant secondary tabs", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    expect(container.querySelector(".app-top-nav--with-supply-menu")).toBeNull();
    expect(container.querySelector(".app-top-nav--supply")).toBeNull();
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("440");
    expect(container.querySelector(".app-supply-assets")?.textContent).not.toContain("抽奖券");
    expect(container.querySelector(".app-supply-assets")?.textContent).not.toContain("背包");
    expect(container.querySelector(".app-supply-secondary-nav")).toBeNull();
    expect(container.textContent).not.toContain("主题扭蛋");
  });

  it("keeps a stable asset placeholder before supply resources load", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={null} />);
    });

    expect(container.querySelector(".app-supply-assets")).not.toBeNull();
    expect(container.querySelector(".app-supply-assets--loading")).not.toBeNull();
    expect(container.querySelectorAll(".app-supply-asset-skeleton")).toHaveLength(1);
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
    expect(wallet?.getAttribute("aria-label")).toBe("补给站资产：银子 440");
    expect(wallet?.textContent).toContain("440");
    expect(wallet?.textContent).not.toContain("抽奖券");
    expect(wallet?.textContent).not.toContain("背包");

    expect(container.querySelectorAll(".app-supply-asset-chip")).toHaveLength(1);
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

  it("does not expose a redundant desktop supply flyout", async () => {
    vi.useFakeTimers();
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    const topNav = container.querySelector(".app-top-nav");
    const primarySupplyTab = container.querySelector(".app-supply-primary-tab");

    expect(topNav).not.toBeNull();
    expect(primarySupplyTab).toBeNull();
    expect(container.querySelector(".app-supply-secondary-nav")).toBeNull();

    await act(async () => {
      primarySupplyTab?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    expect(topNav?.classList.contains("app-supply-menu-open")).toBe(false);

    await act(async () => {
      primarySupplyTab?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
      vi.advanceTimersByTime(300);
    });

    expect(topNav?.classList.contains("app-supply-menu-open")).toBe(false);
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

  it("prefetches primary routes on hover or focus", async () => {
    activeTab = "punch";

    await act(async () => {
      root.render(<Navbar activeTabOverride="punch" supplyNavContext={supplyNavContext} />);
    });

    routerPrefetchMock.mockClear();

    const dataTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("数据看板"),
    );

    await act(async () => {
      dataTab?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    expect(routerPrefetchMock).toHaveBeenCalledWith("/calendar");
    expect(preloadBoardTabComponentMock).toHaveBeenCalledWith("data");
  });
});
