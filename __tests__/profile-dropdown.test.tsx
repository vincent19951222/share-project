import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileDropdown } from "@/components/navbar/ProfileDropdown";
import { BoardProvider } from "@/lib/store";
import type { BoardState } from "@/lib/types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const initialState: BoardState = {
  members: [{ id: "user-1", name: "Li", avatarKey: "male1" }],
  gridData: [[false]],
  teamVaultTotal: 0,
  currentUser: {
    assetBalance: 3450,
    currentStreak: 12,
    nextReward: 40,
    seasonIncome: 0,
    isAdmin: true,
  },
  today: 1,
  totalDays: 1,
  currentUserId: "user-1",
  logs: [],
  activeTab: "punch",
};

describe("ProfileDropdown", () => {
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

  it("shows the real board values and admin entry point", () => {
    act(() => {
      root.render(
        <BoardProvider initialState={initialState}>
          <ProfileDropdown onDismiss={() => {}} onEditProfile={() => {}} />
        </BoardProvider>,
      );
    });

    expect(container.textContent).toContain("3450");
    expect(container.textContent).toContain("我的银子");
    expect(container.textContent).toContain("12 天");
    expect(container.textContent).toContain("40 银子");
    expect(container.textContent).toContain("赛季设置");
  });
});
