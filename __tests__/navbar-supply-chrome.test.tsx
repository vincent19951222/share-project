import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Navbar } from "@/components/navbar/Navbar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routerPushMock = vi.fn();
const routerPrefetchMock = vi.fn();

vi.mock("@/lib/store", () => ({
  useBoard: () => ({
    state: {
      activeTab: "punch",
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
  useRouter: () => ({ push: routerPushMock, prefetch: routerPrefetchMock }),
}));

vi.mock("@/components/board/tab-component-loaders", () => ({
  preloadBoardTabComponent: vi.fn(),
}));

vi.mock("@/components/navbar/TeamDynamicsBell", () => ({
  TeamDynamicsBell: () => <button aria-label="团队动态">铃铛</button>,
}));

vi.mock("@/components/profile/EditProfileModal", () => ({
  EditProfileModal: () => <div data-testid="edit-profile-modal" />,
}));

describe("Navbar simplified navigation", () => {
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
  });

  it("renders exactly four primary navigation items on desktop and mobile", async () => {
    await act(async () => root.render(<Navbar activeTabOverride="punch" />));

    const expected = ["健身打卡", "牛马水铺", "共享看板", "数据看板"];
    expect(Array.from(container.querySelectorAll(".home-tab-strip .tab-btn")).map((node) => node.textContent?.trim())).toEqual(expected);
    expect(container.textContent).not.toContain("牛马补给站");

    await act(async () => container.querySelector<HTMLButtonElement>(".mobile-nav-toggle")?.click());
    expect(Array.from(container.querySelectorAll(".mobile-tab-panel .tab-btn")).map((node) => node.textContent?.trim())).toEqual(expected);
  });

  it("shows the board asset balance without loading supply state", async () => {
    await act(async () => root.render(<Navbar activeTabOverride="punch" />));

    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("银子");
    expect(container.querySelector(".app-supply-assets")?.textContent).toContain("440");
    expect(container.querySelector(".app-supply-assets--loading")).toBeNull();
    expect(container.querySelector(".app-top-nav--supply")).toBeNull();
  });

  it("allows the AI page to render without highlighting a primary tab", async () => {
    await act(async () => root.render(<Navbar activeTabOverride={null} />));

    expect(container.querySelectorAll('.home-tab-strip [aria-pressed="true"]')).toHaveLength(0);
  });
});
