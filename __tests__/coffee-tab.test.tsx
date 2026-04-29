import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const dispatch = vi.fn();

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
    setViewportWidth(1280);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("dispatches the coffee tab selection from the navbar", async () => {
    const { Navbar } = await import("@/components/navbar/Navbar");

    await act(async () => {
      root.render(<Navbar />);
    });

    const coffeeButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("续命咖啡"),
    );

    expect(coffeeButton).toBeDefined();
    expect(
      coffeeButton!.querySelector('img[src*="/assets/icons/coffee-pixel.svg"]'),
    ).not.toBeNull();

    await act(async () => {
      coffeeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "SET_TAB", tab: "coffee" });
  });

  it("dispatches the supply station tab selection from the navbar", async () => {
    const { Navbar } = await import("@/components/navbar/Navbar");

    await act(async () => {
      root.render(<Navbar />);
    });

    const supplyButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("牛马补给站"),
    );

    expect(supplyButton).toBeDefined();
    expect(
      supplyButton!.querySelector('img[src*="/assets/icons/supply-pixel.svg"]'),
    ).not.toBeNull();

    await act(async () => {
      supplyButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "SET_TAB", tab: "supply" });
  });

  it("uses managed pixel SVG assets for the primary navigation tabs", async () => {
    const { Navbar } = await import("@/components/navbar/Navbar");

    await act(async () => {
      root.render(<Navbar />);
    });

    const tabIconSources = Array.from(container.querySelectorAll(".tab-btn img")).map((image) =>
      image.getAttribute("src"),
    );

    expect(tabIconSources).toEqual([
      "/assets/icons/workout-pixel.svg",
      "/assets/icons/board-pixel.svg",
      "/assets/icons/coffee-pixel.svg",
      "/assets/icons/supply-pixel.svg",
      "/assets/icons/calendar-pixel.svg",
      "/assets/icons/report-pixel.svg",
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

    const coffeeButton = Array.from(container.querySelectorAll(".mobile-tab-panel button")).find(
      (button) => button.textContent?.includes("续命咖啡"),
    );
    expect(coffeeButton).toBeDefined();

    await act(async () => {
      coffeeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "SET_TAB", tab: "coffee" });
    expect(container.querySelector(".mobile-tab-panel")).toBeNull();
  });

  it("uses the managed vault trophy icon in the team header", async () => {
    const { TeamHeader } = await import("@/components/punch-board/TeamHeader");

    await act(async () => {
      root.render(<TeamHeader />);
    });

    expect(
      container.querySelector('img[src*="/assets/icons/vault-trophy-pixel.svg"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain("全队个人银子总和");
    expect(container.textContent).toContain("个人长期累计资产");
  });
});
