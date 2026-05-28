import { existsSync } from "fs";
import { join } from "path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar/Navbar";
import type { SupplyNavContext } from "@/lib/navigation-routes";
import type { AppTab } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routerPushMock = vi.fn();
const routerPrefetchMock = vi.fn();

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

vi.mock("@/components/navbar/TeamDynamicsBell", () => ({
  TeamDynamicsBell: () => <button aria-label="团队动态，未读 4 条">铃铛</button>,
}));

vi.mock("@/components/profile/EditProfileModal", () => ({
  EditProfileModal: () => <div data-testid="edit-profile-modal" />,
}));

const supplyNavContext: SupplyNavContext = {
  resources: [
    { id: "coins", label: "银子", value: 440, iconImage: "/assets/home-scenes/supply/shared/supply-resource-coins.png" },
    { id: "ticket", label: "抽奖券", value: 7, iconImage: "/assets/home-scenes/supply/shared/supply-resource-ticket.png" },
    {
      id: "backpack",
      label: "背包",
      value: 12,
      maxValue: 60,
      iconImage: "/assets/home-scenes/supply/shared/supply-resource-backpack.png",
    },
  ],
  profile: { username: "li", avatarKey: "male1" },
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
    activeTab = "supply";
    vi.useRealTimers();
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
      "/assets/home-scenes/supply/nav-icons/supply-nav-status.png",
      "/assets/home-scenes/supply/nav-icons/supply-nav-shop.png",
      "/assets/home-scenes/supply/nav-icons/supply-nav-task-record.png",
      "/assets/home-scenes/supply/nav-icons/supply-nav-backpack.png",
      "/assets/home-scenes/supply/nav-icons/supply-nav-draw-pool.png",
    ]);
    Array.from(container.querySelectorAll<HTMLImageElement>(".app-supply-secondary-tab img")).forEach((image) => {
      const src = image.getAttribute("src");
      expect(src).toBeTruthy();
      expect(existsSync(join(process.cwd(), "public", src!))).toBe(true);
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
    expect(container.querySelector('img[src="/avatars/male1.png"]')).not.toBeNull();
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

    const calendarTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".tab-btn")).find((button) =>
      button.textContent?.includes("牛马日历"),
    );
    const drawPoolTab = Array.from(container.querySelectorAll<HTMLButtonElement>(".app-supply-secondary-tab")).find(
      (button) => button.textContent?.includes("抽奖池"),
    );

    await act(async () => {
      calendarTab?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      drawPoolTab?.focus();
    });

    expect(routerPrefetchMock).toHaveBeenCalledWith("/calendar");
    expect(routerPrefetchMock).toHaveBeenCalledWith("/dashboard/cards");
  });
});
