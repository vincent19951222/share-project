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

  beforeEach(() => {
    dispatch.mockClear();
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
      coffeeButton!.querySelector('img[src*="/assets/calendar/coffee-pixel-16bit-v1.svg"]'),
    ).not.toBeNull();

    await act(async () => {
      coffeeButton!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(dispatch).toHaveBeenCalledWith({ type: "SET_TAB", tab: "coffee" });
  });
});
