import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppTab } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { dispatchMock, fetchSupplyStationStateMock, navbarPropsMock, supplyContextReports } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
  fetchSupplyStationStateMock: vi.fn(),
  navbarPropsMock: vi.fn(),
  supplyContextReports: { current: 0 },
}));

const routerPushMock = vi.fn();
let activeTab: AppTab = "punch";
let currentUserId = "u1";

vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: { activeTab, currentUserId },
    dispatch: dispatchMock,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock("@/lib/api", () => ({
  fetchSupplyStationState: fetchSupplyStationStateMock,
}));

vi.mock("@/components/navbar/Navbar", () => ({
  Navbar: (props: Record<string, unknown>) => {
    navbarPropsMock(props);
    return <nav data-testid="home-navbar">首页导航</nav>;
  },
}));

vi.mock("@/components/punch-board/PunchBoard", () => ({
  PunchBoard: () => <section data-testid="punch-board">健身打卡</section>,
}));

vi.mock("@/components/board/dynamic-tabs", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  function createSupplyNavContext() {
    return {
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
  }

  return {
    DynamicSharedBoard: ({ isActive }: { isActive?: boolean }) => (
      <section data-active={String(isActive)} data-testid="shared-board">
        共享看板
      </section>
    ),
    DynamicDrinkCheckin: () => <section data-testid="drink-checkin">牛马水铺</section>,
    DynamicDataDashboard: ({ initialView }: { initialView?: "personal" | "team" }) => (
      <section data-initial-view={initialView} data-testid="data-dashboard">
        数据看板
      </section>
    ),
    DynamicSupplyStation: ({
      initialPanel,
      onBackToPunch,
      onNavContextChange,
      onPanelChange,
    }: {
      initialPanel?: string;
      onBackToPunch?: () => void;
      onNavContextChange?: (context: unknown) => void;
      onPanelChange?: (panel: "shop" | "taskRecord") => void;
    }) => {
      React.useEffect(() => {
        supplyContextReports.current += 1;
        if (supplyContextReports.current > 5) {
          throw new Error("supply nav context callback is unstable");
        }

        onNavContextChange?.(createSupplyNavContext());
      }, [onNavContextChange]);

      return (
        <section data-testid="supply-station">
          牛马补给站
          <span data-testid="supply-panel">{initialPanel}</span>
          <button onClick={onBackToPunch} type="button">
            回到打卡
          </button>
          <button onClick={() => onPanelChange?.("shop")} type="button">
            去商店
          </button>
          <button onClick={() => onPanelChange?.("taskRecord")} type="button">
            去任务记录
          </button>
        </section>
      );
    },
  };
});

vi.mock("@/lib/drink-store", () => ({
  DrinkProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drink-provider">{children}</div>
  ),
}));

vi.mock("@/lib/coffee-store", () => ({
  CoffeeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="coffee-provider">{children}</div>
  ),
}));

describe("Home supply navigation", () => {
  let container: HTMLDivElement;
  let root: Root;
  const supplySnapshot = {
    resources: {
      coins: { label: "银子", value: 440 },
      ticket: { label: "抽奖券", value: 7 },
      backpack: { label: "背包", value: 12, maxValue: 60 },
    },
    profile: { username: "li", avatarKey: "male1" },
    social: {
      pendingSentCount: 0,
      pendingReceivedCount: 0,
      teamWidePendingCount: 0,
      received: [],
      teamWide: [],
    },
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    fetchSupplyStationStateMock.mockResolvedValue(supplySnapshot);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    activeTab = "punch";
    currentUserId = "u1";
    dispatchMock.mockClear();
    fetchSupplyStationStateMock.mockClear();
    navbarPropsMock.mockClear();
    routerPushMock.mockClear();
    supplyContextReports.current = 0;
    vi.resetModules();
  });

  it("keeps the home navbar while the dashboard status route is active", async () => {
    const { default: SupplyStatusPage } = await import("@/app/(board)/dashboard/status/page");

    await act(async () => {
      root.render(<SupplyStatusPage />);
    });

    expect(container.querySelector("[data-testid='home-navbar']")).not.toBeNull();
    expect(container.querySelector("[data-testid='supply-station']")).not.toBeNull();
    expect(container.querySelector("[data-testid='supply-panel']")?.textContent).toBe("dashboard");
    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "supply",
        activeSupplyPanel: "dashboard",
        supplyNavContext: expect.objectContaining({
          profile: { username: "li", avatarKey: "male1" },
        }),
      }),
    );
    expect(container.querySelector("[data-testid='punch-board']")).toBeNull();
    expect(container.querySelector("[data-testid='shared-board']")).toBeNull();
    expect(container.querySelector("[data-testid='drink-checkin']")).toBeNull();
    expect(container.querySelector("[data-testid='data-dashboard']")).toBeNull();
  });

  it("keeps the home navbar on regular home tabs", async () => {
    activeTab = "punch";
    const { default: Home } = await import("@/app/(board)/page");

    await act(async () => {
      root.render(<Home />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.querySelector("[data-testid='home-navbar']")).not.toBeNull();
    expect(container.querySelector("[data-testid='punch-board']")).not.toBeNull();
    expect(fetchSupplyStationStateMock).toHaveBeenCalledTimes(1);
    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "punch",
        supplyNavContext: expect.objectContaining({
          profile: { username: "li", avatarKey: "male1" },
        }),
      }),
    );
  });

  it("reuses cached supply assets on regular tab switches without refetching", async () => {
    const { cacheSupplyNavSnapshot } = await import("@/lib/supply-nav-cache");
    cacheSupplyNavSnapshot(supplySnapshot as never, currentUserId);
    activeTab = "punch";
    const { default: Home } = await import("@/app/(board)/page");

    await act(async () => {
      root.render(<Home />);
    });

    expect(fetchSupplyStationStateMock).not.toHaveBeenCalled();
    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "punch",
        supplyNavContext: expect.objectContaining({
          resources: expect.arrayContaining([
            expect.objectContaining({ id: "coins", value: 440 }),
            expect.objectContaining({ id: "ticket", value: 7 }),
            expect.objectContaining({ id: "backpack", value: 12, maxValue: 60 }),
          ]),
        }),
      }),
    );

    navbarPropsMock.mockClear();
    activeTab = "board";
    const { default: SharedBoardRoutePage } = await import("@/app/(board)/board/page");

    await act(async () => {
      root.render(<SharedBoardRoutePage />);
    });

    expect(fetchSupplyStationStateMock).not.toHaveBeenCalled();
    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "board",
        supplyNavContext: expect.objectContaining({
          profile: { username: "li", avatarKey: "male1" },
        }),
      }),
    );
  });

  it("does not reuse another user's cached supply assets after an account switch", async () => {
    const { cacheSupplyNavSnapshot } = await import("@/lib/supply-nav-cache");
    cacheSupplyNavSnapshot(supplySnapshot as never, "u1");
    currentUserId = "u2";
    fetchSupplyStationStateMock.mockResolvedValueOnce({
      resources: {
        coins: { label: "银子", value: 125 },
        ticket: { label: "抽奖券", value: 2 },
        backpack: { label: "背包", value: 4, maxValue: 60 },
      },
      profile: { username: "wang", avatarKey: "female1" },
      social: {
        pendingSentCount: 0,
        pendingReceivedCount: 0,
        teamWidePendingCount: 0,
        received: [],
        teamWide: [],
      },
    });
    const { default: Home } = await import("@/app/(board)/page");

    await act(async () => {
      root.render(<Home />);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchSupplyStationStateMock).toHaveBeenCalledTimes(1);
    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "punch",
        supplyNavContext: expect.objectContaining({
          resources: expect.arrayContaining([
            expect.objectContaining({ id: "coins", value: 125 }),
            expect.objectContaining({ id: "ticket", value: 2 }),
            expect.objectContaining({ id: "backpack", value: 4, maxValue: 60 }),
          ]),
          profile: { username: "wang", avatarKey: "female1" },
        }),
      }),
    );
  });

  it("does not dispatch SET_TAB after rendering a route-selected tab", async () => {
    activeTab = "punch";
    const { default: SharedBoardRoutePage } = await import("@/app/(board)/board/page");

    await act(async () => {
      root.render(<SharedBoardRoutePage />);
    });

    expect(container.querySelector("[data-testid='shared-board']")).not.toBeNull();
    expect(dispatchMock).not.toHaveBeenCalledWith({ type: "SET_TAB", tab: "board" });
  });

  it("does not mount the drink polling provider on tabs that do not read drink state", async () => {
    activeTab = "punch";
    const { default: Home } = await import("@/app/(board)/page");

    await act(async () => {
      root.render(<Home />);
    });

    expect(container.querySelector("[data-testid='drink-provider']")).toBeNull();
  });

  it("mounts the drink polling provider only for drink-backed tabs", async () => {
    const { default: DrinkPage } = await import("@/app/(board)/drink/page");

    await act(async () => {
      root.render(<DrinkPage />);
    });

    expect(container.querySelector("[data-testid='drink-provider']")).not.toBeNull();

    const { default: ReportPage } = await import("@/app/(board)/report/page");

    await act(async () => {
      root.render(<ReportPage />);
    });

    expect(container.querySelector("[data-testid='drink-provider']")).not.toBeNull();
    expect(container.querySelector("[data-testid='data-dashboard']")?.getAttribute("data-initial-view")).toBe("team");
  });

  it("keeps calendar and report routes as data dashboard entry points", async () => {
    const { default: CalendarPage } = await import("@/app/(board)/calendar/page");

    await act(async () => {
      root.render(<CalendarPage />);
    });

    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "data",
      }),
    );
    expect(container.querySelector("[data-testid='data-dashboard']")?.getAttribute("data-initial-view")).toBe("personal");

    const { default: ReportPage } = await import("@/app/(board)/report/page");

    await act(async () => {
      root.render(<ReportPage />);
    });

    expect(navbarPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTabOverride: "data",
      }),
    );
    expect(container.querySelector("[data-testid='data-dashboard']")?.getAttribute("data-initial-view")).toBe("team");
  });

  it("wires the supply station return action back to the punch tab", async () => {
    const { default: SupplyStatusPage } = await import("@/app/(board)/dashboard/status/page");

    await act(async () => {
      root.render(<SupplyStatusPage />);
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>("[data-testid='supply-station'] button")?.click();
    });

    expect(routerPushMock).toHaveBeenCalledWith("/");
  });

  it("wires supply station panel changes to the formal dashboard routes", async () => {
    const { default: SupplyStatusPage } = await import("@/app/(board)/dashboard/status/page");

    await act(async () => {
      root.render(<SupplyStatusPage />);
    });

    await act(async () => {
      Array.from(container.querySelectorAll<HTMLButtonElement>("[data-testid='supply-station'] button"))
        .find((button) => button.textContent === "去商店")
        ?.click();
    });

    expect(routerPushMock).toHaveBeenCalledWith("/dashboard/store");

    await act(async () => {
      Array.from(container.querySelectorAll<HTMLButtonElement>("[data-testid='supply-station'] button"))
        .find((button) => button.textContent === "去任务记录")
        ?.click();
    });

    expect(routerPushMock).toHaveBeenCalledWith("/dashboard/quest");
  });
});
