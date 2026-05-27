import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppTab } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { dispatchMock } = vi.hoisted(() => ({
  dispatchMock: vi.fn(),
}));

const routerPushMock = vi.fn();
let activeTab: AppTab = "punch";

vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: { activeTab },
    dispatch: dispatchMock,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock("@/components/navbar/Navbar", () => ({
  Navbar: () => <nav data-testid="home-navbar">首页导航</nav>,
}));

vi.mock("@/components/punch-board/PunchBoard", () => ({
  PunchBoard: () => <section data-testid="punch-board">健身打卡</section>,
}));

vi.mock("@/components/shared-board/SharedBoard", () => ({
  SharedBoard: () => <section data-testid="shared-board">共享看板</section>,
}));

vi.mock("@/components/coffee-checkin/CoffeeCheckin", () => ({
  CoffeeCheckin: () => <section data-testid="coffee-checkin">续命咖啡</section>,
}));

vi.mock("@/components/report-center/ReportCenter", () => ({
  ReportCenter: () => <section data-testid="report-center">战报中心</section>,
}));

vi.mock("@/components/calendar/CalendarBoard", () => ({
  CalendarBoard: () => <section data-testid="calendar-board">牛马日历</section>,
}));

vi.mock("@/components/gamification/SupplyStation", () => ({
  SupplyStation: ({
    initialPanel,
    onBackToPunch,
    onPanelChange,
  }: {
    initialPanel?: string;
    onBackToPunch?: () => void;
    onPanelChange?: (panel: "shop" | "taskRecord") => void;
  }) => (
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
  ),
}));

vi.mock("@/lib/coffee-store", () => ({
  CoffeeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Home supply navigation", () => {
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
    activeTab = "punch";
    dispatchMock.mockClear();
    routerPushMock.mockClear();
    vi.resetModules();
  });

  it("hides the home navbar while the dashboard status route is active", async () => {
    const { default: SupplyStatusPage } = await import("@/app/(board)/dashboard/status/page");

    await act(async () => {
      root.render(<SupplyStatusPage />);
    });

    expect(container.querySelector("[data-testid='home-navbar']")).toBeNull();
    expect(container.querySelector("[data-testid='supply-station']")).not.toBeNull();
    expect(container.querySelector("[data-testid='supply-panel']")?.textContent).toBe("dashboard");
    expect(container.querySelector("[data-testid='punch-board']")).toBeNull();
    expect(container.querySelector("[data-testid='shared-board']")).toBeNull();
    expect(container.querySelector("[data-testid='coffee-checkin']")).toBeNull();
    expect(container.querySelector("[data-testid='calendar-board']")).toBeNull();
    expect(container.querySelector("[data-testid='report-center']")).toBeNull();
  });

  it("keeps the home navbar on regular home tabs", async () => {
    activeTab = "punch";
    const { default: Home } = await import("@/app/(board)/page");

    await act(async () => {
      root.render(<Home />);
    });

    expect(container.querySelector("[data-testid='home-navbar']")).not.toBeNull();
    expect(container.querySelector("[data-testid='punch-board']")).not.toBeNull();
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
