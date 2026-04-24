import { readFileSync } from "fs";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileDropdown } from "@/components/navbar/ProfileDropdown";
import { TeamHeader } from "@/components/punch-board/TeamHeader";
import type { BoardState } from "@/lib/types";

const boardState: BoardState = {
  members: [{ id: "user-1", name: "Li", avatarKey: "male1" }],
  gridData: [[true]],
  teamVaultTotal: 2800,
  currentUser: {
    assetBalance: 3450,
    currentStreak: 12,
    nextReward: 40,
    seasonIncome: 0,
    isAdmin: true,
  },
  activeSeason: null,
  today: 1,
  totalDays: 1,
  currentUserId: "user-1",
  logs: [],
  activeTab: "punch",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: boardState,
    dispatch: vi.fn(),
  }),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe("p3 responsive CSS", () => {
  it("adds the mobile safety rules for the team header and dropdown", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toMatch(/\.team-header[\s\S]*flex-direction:\s*column/);
    expect(css).toMatch(/\.team-header-account[\s\S]*width:\s*100%/);
    expect(css).toMatch(/\.dropdown-menu[\s\S]*max-width:\s*calc\(100vw - 2rem\)/);
  });

  describe("responsive surfaces", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
    });

    afterEach(() => {
      act(() => {
        root.unmount();
      });
      container.remove();
    });

    it("renders TeamHeader with the responsive class hooks", () => {
      act(() => {
        root.render(createElement(TeamHeader));
      });

      const header = container.querySelector(".team-header");
      expect(header).not.toBeNull();
      expect(header?.tagName).toBe("HEADER");
      expect(container.querySelector(".team-header-account")).not.toBeNull();
    });

    it("renders ProfileDropdown with the responsive dropdown menu hook", async () => {
      await act(async () => {
        root.render(
          createElement(ProfileDropdown, {
            onDismiss: () => {},
            onEditProfile: () => {},
          }),
        );
        await Promise.resolve();
      });

      const menu = container.querySelector(".dropdown-menu");
      expect(menu).not.toBeNull();
      expect(menu?.className).toContain("dropdown-menu");
    });
  });
});
