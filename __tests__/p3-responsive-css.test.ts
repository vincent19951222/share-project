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

function extractBlock(css: string, marker: string) {
  const markerIndex = css.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const blockStart = css.indexOf("{", markerIndex);
  expect(blockStart).toBeGreaterThan(markerIndex);

  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < css.length) {
    const char = css[cursor];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    cursor += 1;
  }

  expect(depth).toBe(0);
  return css.slice(blockStart + 1, cursor - 1);
}

function extractRuleBody(block: string, selector: string) {
  const selectorIndex = block.indexOf(selector);
  expect(selectorIndex).toBeGreaterThanOrEqual(0);

  const blockStart = block.indexOf("{", selectorIndex);
  expect(blockStart).toBeGreaterThan(selectorIndex);

  let depth = 1;
  let cursor = blockStart + 1;

  while (depth > 0 && cursor < block.length) {
    const char = block[cursor];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    cursor += 1;
  }

  expect(depth).toBe(0);
  return block.slice(blockStart + 1, cursor - 1);
}

describe("p3 responsive CSS", () => {
  it("adds the mobile safety rules for the team header and dropdown", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const mobileBlock = extractBlock(css, "@media (max-width: 760px)");
    const teamHeaderRule = extractRuleBody(mobileBlock, ".team-header");
    const teamHeaderProgressRule = extractRuleBody(mobileBlock, ".team-header-progress");
    const teamHeaderAccountRule = extractRuleBody(mobileBlock, ".team-header-account");

    expect(css).toContain("@media (max-width: 760px)");
    expect(teamHeaderRule).toMatch(/flex-direction:\s*column/);
    expect(teamHeaderRule).toMatch(/align-items:\s*stretch/);
    expect(teamHeaderProgressRule).toMatch(/width:\s*100%/);
    expect(teamHeaderProgressRule).toMatch(/max-width:\s*none/);
    expect(teamHeaderAccountRule).toMatch(/width:\s*100%/);
    expect(teamHeaderAccountRule).toMatch(/border-top:\s*2px solid #f1f5f9/);
    expect(css).toMatch(/\.dropdown-menu[\s\S]*max-width:\s*calc\(100vw - 2rem\)/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.report-board\s*\{[\s\S]*position:\s*relative/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.report-board\s*\{[\s\S]*overflow:\s*visible/);
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
      expect(container.querySelector(".team-header-progress")).not.toBeNull();
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
